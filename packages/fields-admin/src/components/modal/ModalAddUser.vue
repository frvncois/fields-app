<script setup lang="ts">
import { ref } from 'vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { createUser, type User } from '@/api/users'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [user: User] }>()

const email = ref('')
const password = ref('')
const role = ref<'admin' | 'editor'>('editor')
const error = ref('')
const saving = ref(false)

function reset() {
    email.value = ''
    password.value = ''
    role.value = 'editor'
    error.value = ''
    saving.value = false
}

async function handleSubmit() {
    error.value = ''
    if (!email.value.includes('@')) { error.value = 'Enter a valid email'; return }
    if (password.value.length < 8) { error.value = 'Password must be at least 8 characters'; return }

    saving.value = true
    try {
        const user = await createUser({ email: email.value, password: password.value, role: role.value })
        reset()
        emit('created', user)
    } catch (err: unknown) {
        error.value = (err as Error).message
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <UiModal :open="open" @close="() => { reset(); emit('close') }">
        <div class="content">
            <p class="title">Add user</p>
            <UiInput v-model="email" placeholder="Email" type="email" />
            <UiInput v-model="password" placeholder="Password (min 8 chars)" type="password" />
            <div class="role-select">
                <label>
                    <input type="radio" v-model="role" value="editor" />
                    Editor
                </label>
                <label>
                    <input type="radio" v-model="role" value="admin" />
                    Admin
                </label>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
        </div>
        <div class="footer">
            <UiButton variant="ghost" text="Cancel" @click="() => { reset(); emit('close') }" />
            <UiButton text="Create" :disabled="saving" @click="handleSubmit" />
        </div>
    </UiModal>
</template>

<style scoped>
.content {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);

    .title {
        font-size: var(--size-sm);
        font-weight: 600;
        margin: 0;
    }

    .role-select {
        display: flex;
        gap: var(--gap-md);

        label {
            display: flex;
            align-items: center;
            gap: var(--gap-sm);
            font-size: var(--size-sm);
            cursor: pointer;

            input { cursor: pointer; }
        }
    }

    .error {
        font-size: var(--size-sm);
        color: var(--color-danger, red);
        margin: 0;
    }
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--gap-sm);
    padding: var(--space-lg);
}
</style>
