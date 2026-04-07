---
name: Roles & permissions system
description: Admin/Editor role system with granular additive permissions — fully implemented
type: project
---

Fields CMS now has a two-role permission system: `admin` and `editor`.

**Why:** User request to allow multiple users with controlled access to specific content areas.

**How to apply:** When touching auth, user management, or content handlers, be aware of the UserContext flow.

## DB schema (migration 6)
- `users.role TEXT NOT NULL DEFAULT 'editor'` — existing users promoted to admin on upgrade
- `user_permissions` — one row per editor; all flags default 0 (no access)
- `user_collection_grants (user_id, collection_id)` — specific collection access when collections_all = 0
- `user_object_grants (user_id, collection_id)` — specific object access when objects_all = 0

## Permission model
- **Admin**: full access to everything, can manage users
- **Editor**: starts with zero access; each permission must be explicitly granted
- Action flags: can_create, can_edit, can_delete, can_publish, can_media, can_settings
- Content scope: pages_all (boolean), collections_all / objectsAll OR specific IDs by collection_id
- can_publish gates ALL status changes (draft→published AND published→draft)
- Without can_media: can still VIEW/SELECT media, just not upload/delete/edit
- Restricted areas hidden entirely (not shown as disabled/locked)

## Key backend files
- `src/types.ts` — UserRole, UserPermissions (with Set<number> for grants), UserContext
- `src/plugin.ts` — builds UserContext after JWT verify; fetches permissions from DB every request
- `src/handlers/users.ts` — admin-only CRUD: GET/POST /users, GET/DELETE /users/:id, PUT /users/:id/permissions, PATCH /users/:id/role
- `src/handlers/entries.ts` — buildScopeWhere() for filtered list queries; canAccessCollection() for single-entry checks
- First user from setup wizard = admin (setup.ts inserts with role='admin')

## Key frontend files
- `src/api/users.ts` — getMe(), getUsers(), createUser(), updatePermissions(), changeRole(), deleteUser()
- `src/composables/useAuth.ts` — module-level role+permissions refs; fetchCurrentUser() is idempotent (meFetched flag); reset on logout
- `src/router/index.ts` — awaits fetchCurrentUser() once per session; guards users route with requiresAdmin meta
- `src/views/UsersView.vue` — user list + inline permissions editor modal
- `src/components/modal/ModalAddUser.vue` — create user with email + password + role

## API endpoints (admin-only)
- GET /api/fields/me — current user's role + permissions (available to all authenticated users)
- GET /api/fields/users
- POST /api/fields/users
- GET /api/fields/users/:id
- DELETE /api/fields/users/:id (guards: can't delete self or last admin)
- PUT /api/fields/users/:id/permissions
- PATCH /api/fields/users/:id/role (guards: can't demote last admin)
