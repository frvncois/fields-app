<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import ModalAddUser from '@/components/modal/ModalAddUser.vue'
import { useToast } from '@/composables/useToast'
import { useAlerts } from '@/composables/useAlerts'
import { useAuth } from '@/composables/useAuth'
import {
    getUsers, changeRole, deleteUser, updatePermissions, getUser,
    type User, type UserPermissions,
} from '@/api/users'
import { getCollections } from '@/api/collections'
import type { Collection } from '@/api/collections'

const { toast } = useToast()
const { confirm } = useAlerts()
const { role: currentUserRole } = useAuth()

const users = ref<User[]>([])
const collections = ref<Collection[]>([])
const loading = ref(true)
const showAddUser = ref(false)

// Permissions editor state
const editingUser = ref<User | null>(null)
const editPerms = ref<UserPermissions>({
    can_create: false, can_edit: false, can_delete: false, can_publish: false,
    can_media: false, can_settings: false,
    pages_all: false, collections_all: false, objects_all: false,
    collectionGrants: [], objectGrants: [],
})

onMounted(async () => {
    await Promise.all([loadUsers(), loadCollections()])
    loading.value = false
})

async function loadUsers() {
    users.value = await getUsers()
}

async function loadCollections() {
    const data = await getCollections()
    collections.value = data
}

function openPermissions(user: User) {
    editPerms.value = {
        can_create:      !!user.can_create,
        can_edit:        !!user.can_edit,
        can_delete:      !!user.can_delete,
        can_publish:     !!user.can_publish,
        can_media:       !!user.can_media,
        can_settings:    !!user.can_settings,
        pages_all:       !!user.pages_all,
        collections_all: !!user.collections_all,
        objects_all:     !!user.objects_all,
        collectionGrants: user.collectionGrants ?? [],
        objectGrants:    user.objectGrants ?? [],
    }
    editingUser.value = user
}

async function savePermissions() {
    if (!editingUser.value) return
    try {
        await updatePermissions(editingUser.value.id, editPerms.value)
        // Refetch to get updated data
        const updated = await getUser(editingUser.value.id)
        const idx = users.value.findIndex(u => u.id === updated.id)
        if (idx !== -1) users.value[idx] = updated
        editingUser.value = null
        toast('Permissions saved', 'success')
    } catch (err: unknown) {
        toast((err as Error).message, 'error')
    }
}

async function handleRoleChange(user: User, newRole: 'admin' | 'editor') {
    const label = newRole === 'admin' ? 'promote to Admin' : 'demote to Editor'
    const ok = await confirm({ title: `${label}?`, message: `This changes ${user.email}'s access level.` })
    if (!ok) return
    try {
        const updated = await changeRole(user.id, newRole)
        const idx = users.value.findIndex(u => u.id === user.id)
        if (idx !== -1) users.value[idx] = updated
        toast('Role updated', 'success')
    } catch (err: unknown) {
        toast((err as Error).message, 'error')
    }
}

async function handleDelete(user: User) {
    const ok = await confirm({
        title: 'Remove user?',
        message: `${user.email} will permanently lose access.`,
        variant: 'danger',
        confirmLabel: 'Remove',
    })
    if (!ok) return
    try {
        await deleteUser(user.id)
        users.value = users.value.filter(u => u.id !== user.id)
        toast('User removed', 'success')
    } catch (err: unknown) {
        toast((err as Error).message, 'error')
    }
}

function onUserCreated(user: User) {
    users.value.push(user)
    showAddUser.value = false
    toast('User created', 'success')
}

function toggleGrant(arr: number[], id: number) {
    const i = arr.indexOf(id)
    if (i === -1) arr.push(id)
    else arr.splice(i, 1)
}
</script>

<template>
    <div class="content" v-if="!loading">

        <!-- Header -->
        <div class="head">
            <h2>Users</h2>
            <UiButton text="Add user" size="sm" @click="showAddUser = true" />
        </div>

        <!-- User table -->
        <div class="table">
            <div class="row header">
                <span>Email</span>
                <span>Role</span>
                <span></span>
            </div>
            <div class="row" v-for="user in users" :key="user.id">
                <span class="email">{{ user.email }}</span>
                <span class="badge" :class="user.role">{{ user.role }}</span>
                <div class="actions">
                    <UiButton
                        v-if="user.role === 'editor'"
                        text="Permissions"
                        variant="outline"
                        size="sm"
                        @click="openPermissions(user)"
                    />
                    <UiButton
                        v-if="user.role === 'editor'"
                        text="Make Admin"
                        variant="ghost"
                        size="sm"
                        @click="handleRoleChange(user, 'admin')"
                    />
                    <UiButton
                        v-if="user.role === 'admin' && users.filter(u => u.role === 'admin').length > 1"
                        text="Make Editor"
                        variant="ghost"
                        size="sm"
                        @click="handleRoleChange(user, 'editor')"
                    />
                    <UiButton
                        text="Remove"
                        variant="danger"
                        size="sm"
                        @click="handleDelete(user)"
                    />
                </div>
            </div>
            <div class="empty" v-if="users.length === 0">No users found.</div>
        </div>

        <!-- Add user modal -->
        <ModalAddUser :open="showAddUser" @close="showAddUser = false" @created="onUserCreated" />

        <!-- Permissions editor modal -->
        <UiModal :open="!!editingUser" @close="editingUser = null">
            <div class="perm-content" v-if="editingUser">
                <p class="perm-title">Permissions for {{ editingUser.email }}</p>

                <div class="perm-section">
                    <p class="perm-label">Actions</p>
                    <label><input type="checkbox" v-model="editPerms.can_create" /> Can create entries</label>
                    <label><input type="checkbox" v-model="editPerms.can_edit" /> Can edit entries</label>
                    <label><input type="checkbox" v-model="editPerms.can_delete" /> Can delete entries</label>
                    <label><input type="checkbox" v-model="editPerms.can_publish" /> Can publish / change status</label>
                    <label><input type="checkbox" v-model="editPerms.can_media" /> Can upload / edit / delete media</label>
                    <label><input type="checkbox" v-model="editPerms.can_settings" /> Can access settings</label>
                </div>

                <div class="perm-section">
                    <p class="perm-label">Pages</p>
                    <label><input type="checkbox" v-model="editPerms.pages_all" /> All pages</label>
                </div>

                <div class="perm-section">
                    <p class="perm-label">Collections</p>
                    <label><input type="checkbox" v-model="editPerms.collections_all" /> All collections</label>
                    <template v-if="!editPerms.collections_all">
                        <label
                            v-for="col in collections.filter(c => c.type === 'collection')"
                            :key="col.id"
                        >
                            <input
                                type="checkbox"
                                :checked="editPerms.collectionGrants.includes(col.id)"
                                @change="toggleGrant(editPerms.collectionGrants, col.id)"
                            />
                            {{ col.label }}
                        </label>
                    </template>
                </div>

                <div class="perm-section">
                    <p class="perm-label">Objects</p>
                    <label><input type="checkbox" v-model="editPerms.objects_all" /> All objects</label>
                    <template v-if="!editPerms.objects_all">
                        <label
                            v-for="col in collections.filter(c => c.type === 'object')"
                            :key="col.id"
                        >
                            <input
                                type="checkbox"
                                :checked="editPerms.objectGrants.includes(col.id)"
                                @change="toggleGrant(editPerms.objectGrants, col.id)"
                            />
                            {{ col.label }}
                        </label>
                    </template>
                </div>
            </div>
            <div class="perm-footer">
                <UiButton variant="ghost" text="Cancel" @click="editingUser = null" />
                <UiButton text="Save" @click="savePermissions" />
            </div>
        </UiModal>

    </div>
    <div class="loading" v-else>Loading…</div>
</template>

<style scoped>
.content {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
    padding: var(--space-xl);
    width: var(--content-width);
    margin: 0 auto;
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h2 {
        font-size: var(--size-base);
        font-weight: 600;
        margin: 0;
    }
}

.table {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: var(--gap-md);
    padding: var(--space-sm) var(--space-base);
    border-radius: var(--radius-md);

    &.header {
        font-size: var(--size-xs);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing);
        font-family: 'Geist Mono', monospace;
        opacity: 0.5;
    }

    &:not(.header) {
        border: 1px solid var(--color-border-var);
    }

    .email {
        font-size: var(--size-sm);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .badge {
        font-size: var(--size-xs);
        padding: 2px var(--space-sm);
        border-radius: var(--radius-full);
        border: 1px solid var(--color-border);
        font-family: 'Geist Mono', monospace;

        &.admin { opacity: 1; }
        &.editor { opacity: 0.5; }
    }

    .actions {
        display: flex;
        gap: var(--gap-sm);
    }
}

.empty {
    font-size: var(--size-sm);
    opacity: 0.4;
    padding: var(--space-base);
}

.perm-content {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    max-height: 70vh;
    overflow-y: auto;
}

.perm-title {
    font-size: var(--size-sm);
    font-weight: 600;
    margin: 0;
}

.perm-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    .perm-label {
        font-size: var(--size-xs);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing);
        font-family: 'Geist Mono', monospace;
        opacity: 0.5;
        margin: 0;
    }

    label {
        display: flex;
        align-items: center;
        gap: var(--gap-sm);
        font-size: var(--size-sm);
        cursor: pointer;

        input[type="checkbox"] { cursor: pointer; }
    }
}

.perm-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--gap-sm);
    padding: var(--space-lg);
    border-top: 1px solid var(--color-border-var);
}

.loading {
    padding: var(--space-xl);
    font-size: var(--size-sm);
    opacity: 0.5;
}
</style>
