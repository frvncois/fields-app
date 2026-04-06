<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiInput from '@/components/ui/UiInput.vue'
import UiButton from '@/components/ui/UiButton.vue'
import FieldsIcon from '@/assets/FieldsIcon.vue'
import { createAdmin } from '@/api/setup'
import { setAuthHint } from '@/api/client'
import { markSetupComplete } from '@/router'

const router = useRouter()

const projectName = ref('')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

async function handleSetup() {
    error.value = ''
    if (!projectName.value.trim()) {
        error.value = 'Project name is required.'
        return
    }
    if (!firstName.value.trim()) {
        error.value = 'First name is required.'
        return
    }
    if (!lastName.value.trim()) {
        error.value = 'Last name is required.'
        return
    }
    if (password.value !== confirm.value) {
        error.value = 'Passwords do not match.'
        return
    }
    if (password.value.length < 8) {
        error.value = 'Password must be at least 8 characters.'
        return
    }
    loading.value = true
    const ok = await createAdmin(projectName.value.trim(), firstName.value.trim(), lastName.value.trim(), email.value, password.value)
    loading.value = false
    if (ok) {
        setAuthHint()
        markSetupComplete()
        router.push({ name: 'dashboard' })
    } else {
        error.value = 'Setup failed. Please try again.'
    }
}
</script>

<template>
    <div class="card">
        <div class="header">
            <div class="icon">
                <FieldsIcon />
            </div>
            <div class="content">
                <p class="title">Create admin account</p>
                <p class="subtitle">Set up your Fields instance</p>
            </div>
        </div>
        <form class="form" @submit.prevent="handleSetup">
            <UiInput v-model="projectName" label="Project name" placeholder="My Project" />
            <UiInput v-model="firstName" label="First name" placeholder="Jane" />
            <UiInput v-model="lastName" label="Last name" placeholder="Smith" />
            <UiInput v-model="email" label="Email" placeholder="you@example.com" type="email" />
            <UiInput v-model="password" label="Password" placeholder="Min. 8 characters" type="password" />
            <UiInput v-model="confirm" label="Confirm password" placeholder="Repeat password" type="password" />
            <p v-if="error" class="error">{{ error }}</p>
            <UiButton text="Create account" type="submit" :disabled="loading" block />
        </form>
    </div>
</template>

<style scoped>
.card {
    width: var(--modal-width);
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--gap-lg);

    .header {
        display: flex;
        align-items: center;
        gap: var(--gap-md);

        .icon {
            height: var(--size-md);
            aspect-ratio: 1/1;
            background: var(--color-foreground);
            color: var(--color-background);
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            svg {
                height: var(--size-sm);
                aspect-ratio: 1/1;
            }
        }

        .content {
            display: flex;
            flex-direction: column;

            .title {
                font-weight: 600;
                margin: 0;
            }

            .subtitle {
                font-size: var(--size-sm);
                opacity: 0.5;
                margin: 0;
            }
        }
    }

    form {
        display: flex;
        flex-direction: column;
        gap: var(--gap-md);

        .error {
            font-size: var(--size-sm);
            color: var(--color-danger);
            margin: 0;
        }
    }
}
</style>
