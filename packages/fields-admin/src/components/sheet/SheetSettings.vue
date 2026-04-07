<script setup lang="ts">
import { ref, watch } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import UiSheet from '@/components/ui/UiSheet.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiBoolean from '@/components/ui/UiBoolean.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import ItemUser from '@/components/ui/items/ItemUser.vue'
import PermissionsEditor from '@/components/shared/PermissionsEditor.vue'
import ModalInviteUser from '@/components/modal/ModalInviteUser.vue'
import { useSettingsSheet } from '@/composables/useSettingsSheet'
import { useAppSettings } from '@/composables/useAppSettings'
import { useAuth } from '@/composables/useAuth'
import { useAlerts } from '@/composables/useAlerts'
import { useToast } from '@/composables/useToast'
import {
    getUsers, getUser, updatePermissions, changeRole, deleteUser,
    type User, type UserPermissions,
} from '@/api/users'

const {
    isOpen,
    firstName, lastName, email,
    currentPassword, password, passwordConfirm,
    darkMode,
    saveProfile,
    savePassword,
} = useSettingsSheet()

const passwordError = ref<string | null>(null)

async function handleSavePassword() {
    passwordError.value = null
    const result = await savePassword()
    if (!result.ok && result.error) passwordError.value = result.error
}

const { userFirst, userLast, userEmail } = useAppSettings()
const { isAdmin, userId } = useAuth()
const { confirm } = useAlerts()
const { toast } = useToast()

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tab = ref<'project' | 'account'>('project')

// ─── Users (project tab) ─────────────────────────────────────────────────────

const users = ref<User[]>([])
const usersLoading = ref(false)
const showInvite = ref(false)

const adminCount = (list: User[]) => list.filter(u => u.role === 'admin').length

async function loadUsers() {
    usersLoading.value = true
    try { users.value = await getUsers() }
    catch { /* non-fatal */ }
    finally { usersLoading.value = false }
}

// ─── Permissions edit modal ───────────────────────────────────────────────────

const editingUser = ref<User | null>(null)
const editPerms = ref<UserPermissions>({
    can_create: false, can_edit: false, can_delete: false, can_publish: false,
    can_media: false, can_settings: false,
    pages_all: false, collections_all: false, objects_all: false,
    collectionGrants: [], objectGrants: [],
})

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
        const updated = await getUser(editingUser.value.id)
        const idx = users.value.findIndex(u => u.id === updated.id)
        if (idx !== -1) users.value[idx] = updated
        editingUser.value = null
        toast('Permissions saved', 'success')
    } catch (err: unknown) {
        toast((err as Error).message, 'error')
    }
}

// ─── Role change / remove ─────────────────────────────────────────────────────

async function handleChangeRole(user: User) {
    const newRole = user.role === 'admin' ? 'editor' : 'admin'
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

async function handleRemove(user: User) {
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
    showInvite.value = false
    toast('User created', 'success')
}

// ─── Profile / password ───────────────────────────────────────────────────────

watch(isOpen, async (open) => {
    if (open) {
        firstName.value = userFirst.value
        lastName.value = userLast.value
        email.value = userEmail.value
        if (isAdmin()) await loadUsers()
    }
})

const passwordMismatch = () => !!password.value && !!passwordConfirm.value && password.value !== passwordConfirm.value

async function handleSaveProfile() {
    const ok = await saveProfile()
    if (ok) {
        userFirst.value = firstName.value
        userLast.value = lastName.value
        userEmail.value = email.value
    }
}
</script>

<template>
    <UiSheet
        v-model="isOpen"
        title="Settings"
        :icon="Cog6ToothIcon"
    >
        <!-- Admin: tabbed layout -->
        <template v-if="isAdmin()">
            <div class="tabs">
                <button :class="{ active: tab === 'project' }" @click="tab = 'project'">Project</button>
                <button :class="{ active: tab === 'account' }" @click="tab = 'account'">Account</button>
            </div>

            <!-- Project tab -->
            <template v-if="tab === 'project'">
                <section>
                    <div class="section-head">
                        <label>Users</label>
                        <UiButton text="Add user" size="sm" @click="showInvite = true" />
                    </div>
                    <div v-if="usersLoading" class="loading">Loading…</div>
                    <div v-else class="user-list">
                        <ItemUser
                            v-for="user in users"
                            :key="user.id"
                            :user="user"
                            :is-current-user="user.id === userId"
                            :is-last-admin="user.role === 'admin' && adminCount(users) <= 1"
                            @permissions="openPermissions"
                            @change-role="handleChangeRole"
                            @remove="handleRemove"
                        />
                        <p v-if="users.length === 0" class="empty">No users found.</p>
                    </div>
                </section>
            </template>

            <!-- Account tab -->
            <template v-else>
                <section>
                    <label>Profile</label>
                    <UiInput v-model="firstName" label="First name" placeholder="John" />
                    <UiInput v-model="lastName" label="Last name" placeholder="Doe" />
                    <UiInput v-model="email" label="Email" placeholder="john@example.com" />
                    <div class="action">
                        <UiButton text="Save profile" size="sm" @click="handleSaveProfile" />
                    </div>
                </section>
                <section>
                    <label>Password</label>
                    <UiInput v-model="currentPassword" label="Current password" placeholder="••••••••" type="password" />
                    <UiInput v-model="password" label="New password" placeholder="••••••••" type="password" />
                    <UiInput v-model="passwordConfirm" label="Confirm password" placeholder="••••••••" type="password" />
                    <p v-if="passwordMismatch()" class="field-error">Passwords do not match.</p>
                    <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
                    <div class="action">
                        <UiButton
                            text="Save password"
                            size="sm"
                            :disabled="!currentPassword || !password || passwordMismatch()"
                            @click="handleSavePassword"
                        />
                    </div>
                </section>
                <section>
                    <label>Appearance</label>
                    <div class="row">
                        <span>Dark mode</span>
                        <UiBoolean v-model="darkMode" />
                    </div>
                </section>
            </template>
        </template>

        <!-- Editor: account only, no tabs -->
        <template v-else>
            <section>
                <label>Profile</label>
                <UiInput v-model="firstName" label="First name" placeholder="John" />
                <UiInput v-model="lastName" label="Last name" placeholder="Doe" />
                <UiInput v-model="email" label="Email" placeholder="john@example.com" />
                <div class="action">
                    <UiButton text="Save profile" size="sm" @click="handleSaveProfile" />
                </div>
            </section>
            <section>
                <label>Password</label>
                <UiInput v-model="password" label="New password" placeholder="••••••••" type="password" />
                <UiInput v-model="passwordConfirm" label="Confirm password" placeholder="••••••••" type="password" />
                <p v-if="passwordMismatch()" class="field-error">Passwords do not match.</p>
                <div class="action">
                    <UiButton
                        text="Save password"
                        size="sm"
                        :disabled="!password || passwordMismatch()"
                        @click="savePassword"
                    />
                </div>
            </section>
            <section>
                <label>Appearance</label>
                <div class="row">
                    <span>Dark mode</span>
                    <UiBoolean v-model="darkMode" />
                </div>
            </section>
        </template>
    </UiSheet>

    <!-- Invite user modal -->
    <ModalInviteUser
        :open="showInvite"
        @close="showInvite = false"
        @created="onUserCreated"
    />

    <!-- Edit permissions modal -->
    <UiModal :open="!!editingUser" @close="editingUser = null">
        <div class="perm-content" data-lenis-prevent>
            <p class="perm-title">Permissions — {{ editingUser?.email }}</p>
            <PermissionsEditor v-if="editingUser" v-model="editPerms" />
        </div>
        <div class="perm-footer">
            <UiButton variant="ghost" text="Cancel" @click="editingUser = null" />
            <UiButton text="Save" @click="savePermissions" />
        </div>
    </UiModal>
</template>

<style scoped>
.tabs {
    display: flex;
    gap: var(--gap-xs);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-var);

    button {
        padding: var(--space-xs) var(--space-md);
        border: none;
        background: none;
        font-family: inherit;
        font-size: var(--size-sm);
        cursor: pointer;
        border-radius: var(--radius-md);
        opacity: 0.4;
        transition: opacity 0.1s, background 0.1s;
        color: inherit;

        &:hover { opacity: 0.75; background: var(--color-hover); }
        &.active { opacity: 1; font-weight: 500; background: var(--color-hover); }
    }
}

section {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);

    > label {
        font-size: var(--size-xs);
        text-transform: uppercase;
        font-family: 'Geist Mono Variable', monospace;
        letter-spacing: var(--letter-spacing);
        font-weight: 500;
        opacity: 0.35;
    }

    .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;

        label {
            font-size: var(--size-xs);
            text-transform: uppercase;
            font-family: 'Geist Mono Variable', monospace;
            letter-spacing: var(--letter-spacing);
            font-weight: 500;
            opacity: 0.35;
        }
    }

    .user-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: var(--size-sm);
        font-weight: 500;
    }

    .action {
        display: flex;
        justify-content: flex-end;
    }

    .field-error {
        font-size: var(--size-xs);
        color: var(--color-danger);
        margin: 0;
    }

    .loading,
    .empty {
        font-size: var(--size-sm);
        opacity: 0.4;
    }
}

.perm-content {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    max-height: 70vh;
    overflow-y: auto;

    .perm-title {
        font-size: var(--size-sm);
        font-weight: 600;
        margin: 0;
    }
}

.perm-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--gap-sm);
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--color-border-var);
}
</style>
