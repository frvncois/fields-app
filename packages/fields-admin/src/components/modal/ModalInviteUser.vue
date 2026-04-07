<script setup lang="ts">
import { ref, watch } from 'vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import PermissionsEditor from '@/components/shared/PermissionsEditor.vue'
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { createUser, updatePermissions, type User, type UserPermissions, type UserRole } from '@/api/users'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [user: User] }>()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const role = ref<UserRole>('editor')
const tempPassword = ref('')
const copied = ref(false)
const error = ref('')
const saving = ref(false)

const permissions = ref<UserPermissions>({
    can_create: false, can_edit: false, can_delete: false, can_publish: false,
    can_media: false, can_settings: false,
    pages_all: false, collections_all: false, objects_all: false,
    collectionGrants: [], objectGrants: [],
})

function generatePassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    return Array.from(arr).map(b => chars[b % chars.length]).join('').slice(0, 12)
}

function reset() {
    firstName.value = ''
    lastName.value = ''
    email.value = ''
    role.value = 'editor'
    tempPassword.value = generatePassword()
    copied.value = false
    error.value = ''
    saving.value = false
    permissions.value = {
        can_create: false, can_edit: false, can_delete: false, can_publish: false,
        can_media: false, can_settings: false,
        pages_all: false, collections_all: false, objects_all: false,
        collectionGrants: [], objectGrants: [],
    }
}

watch(() => [undefined], () => { tempPassword.value = generatePassword() }, { immediate: true })

async function copyPassword() {
    await navigator.clipboard.writeText(tempPassword.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
}

async function handleSubmit() {
    error.value = ''
    if (!email.value.includes('@')) { error.value = 'Enter a valid email'; return }

    saving.value = true
    try {
        const user = await createUser({
            email: email.value,
            password: tempPassword.value,
            role: role.value,
            firstName: firstName.value || undefined,
            lastName: lastName.value || undefined,
        })

        if (role.value === 'editor') {
            await updatePermissions(user.id, permissions.value)
        }

        const updated = { ...user, ...role.value === 'editor' ? permissions.value : {} }
        reset()
        emit('created', updated as User)
    } catch (err: unknown) {
        error.value = (err as Error).message
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <UiModal :open="open" @close="() => { reset(); emit('close') }">
        <div class="content" data-lenis-prevent>
            <p class="title">Add user</p>

            <div class="row-2">
                <UiInput v-model="firstName" label="First name" placeholder="John" />
                <UiInput v-model="lastName" label="Last name" placeholder="Doe" />
            </div>
            <UiInput v-model="email" label="Email" placeholder="john@example.com" type="email" />

            <div class="field">
                <p class="field-label">Role</p>
                <div class="role-cards">
                    <button
                        class="card"
                        :class="{ active: role === 'admin' }"
                        @click="role = 'admin'"
                    >
                        <span class="card-title">Admin</span>
                        <span class="card-desc">Full access to everything</span>
                    </button>
                    <button
                        class="card"
                        :class="{ active: role === 'editor' }"
                        @click="role = 'editor'"
                    >
                        <span class="card-title">Editor</span>
                        <span class="card-desc">Custom access with permissions</span>
                    </button>
                </div>
            </div>

            <template v-if="role === 'editor'">
                <div class="field">
                    <p class="field-label">Permissions</p>
                    <PermissionsEditor v-model="permissions" />
                </div>
            </template>

            <div class="field">
                <p class="field-label">Temporary password</p>
                <div class="password-row">
                    <code class="password-display">{{ tempPassword }}</code>
                    <button class="icon-btn" title="Regenerate" @click="tempPassword = generatePassword()">
                        <ArrowPathIcon />
                    </button>
                    <button class="icon-btn" :title="copied ? 'Copied!' : 'Copy'" @click="copyPassword">
                        <CheckIcon v-if="copied" />
                        <ClipboardDocumentIcon v-else />
                    </button>
                </div>
                <p class="hint">Share this password with the user — they can change it after logging in.</p>
            </div>

            <p v-if="error" class="error">{{ error }}</p>
        </div>

        <div class="footer">
            <UiButton variant="ghost" text="Cancel" @click="() => { reset(); emit('close') }" />
            <UiButton text="Create user" :disabled="saving" @click="handleSubmit" />
        </div>
    </UiModal>
</template>

<style scoped>
.content {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
    max-height: 75vh;
    overflow-y: auto;

    .title {
        font-size: var(--size-sm);
        font-weight: 600;
        margin: 0;
    }

    .row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--gap-sm);
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: var(--gap-sm);

        .field-label {
            font-size: var(--size-xs);
            text-transform: uppercase;
            letter-spacing: var(--letter-spacing);
            font-family: 'Geist Mono Variable', monospace;
            font-weight: 500;
            opacity: 0.4;
            margin: 0;
        }
    }

    .role-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--gap-sm);

        .card {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
            padding: var(--space-md);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            background: transparent;
            text-align: left;
            cursor: pointer;
            transition: border-color 0.15s, background 0.15s;
            font-family: inherit;

            &:hover { background: var(--color-hover); }

            &.active {
                border-color: var(--color-foreground);
                background: var(--color-hover);
            }

            .card-title {
                font-size: var(--size-sm);
                font-weight: 600;
                color: var(--color-foreground);
            }

            .card-desc {
                font-size: var(--size-xs);
                opacity: 0.5;
                line-height: 1.4;
            }
        }
    }

    .password-row {
        display: flex;
        align-items: center;
        gap: var(--gap-sm);
        padding: var(--space-sm) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);

        .password-display {
            flex: 1;
            font-size: var(--size-sm);
            font-family: 'Geist Mono Variable', monospace;
            letter-spacing: 0.05em;
        }

        .icon-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-xs);
            border: none;
            background: none;
            cursor: pointer;
            border-radius: var(--radius-sm);
            opacity: 0.5;
            transition: opacity 0.1s, background 0.1s;

            &:hover { opacity: 1; background: var(--color-hover); }

            svg {
                height: var(--size-base);
                aspect-ratio: 1/1;
            }
        }
    }

    .hint {
        font-size: var(--size-xs);
        opacity: 0.4;
        margin: 0;
        line-height: 1.4;
    }

    .error {
        font-size: var(--size-sm);
        color: var(--color-danger);
        margin: 0;
    }
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--gap-sm);
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--color-border-var);
}
</style>
