<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiInput from '@/components/ui/UiInput.vue'
import UiButton from '@/components/ui/UiButton.vue'
import FieldsIcon from '@/assets/FieldsIcon.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
    loading.value = true
    error.value = ''
    const ok = await login(email.value, password.value)
    loading.value = false
    if (ok) {
        router.push({ name: 'dashboard' })
    } else {
        error.value = 'Invalid email or password.'
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
                <p class="title">Sign in</p>
                <p class="subtitle">Enter your credentials to continue</p>
            </div>
        </div>
        <form class="form" @submit.prevent="handleLogin">
            <UiInput v-model="email" label="Email" placeholder="you@example.com" type="email" />
            <UiInput v-model="password" label="Password" placeholder="••••••••" type="password" />
            <p v-if="error" class="error">{{ error }}</p>
            <UiButton text="Sign in" type="submit" :disabled="loading" block />
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
