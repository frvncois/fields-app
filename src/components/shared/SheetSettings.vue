<script setup lang="ts">
import { watch } from 'vue'
import { UserCircleIcon } from '@heroicons/vue/24/outline'
import UiSheet from '@/components/ui/UiSheet.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiBoolean from '@/components/ui/UiBoolean.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useSettingsSheet } from '@/composables/useSettingsSheet'
import { useAppSettings } from '@/composables/useAppSettings'

const {
    isOpen,
    firstName, lastName, email,
    password, passwordConfirm,
    darkMode,
    saveProfile,
    savePassword,
} = useSettingsSheet()

const { userFirst, userLast, userEmail } = useAppSettings()

// Sync app settings into sheet fields when opened
watch(isOpen, (open) => {
    if (open) {
        firstName.value = userFirst.value
        lastName.value = userLast.value
        email.value = userEmail.value
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
        description="Manage your account and preferences."
        :icon="UserCircleIcon"
    >
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
            <UiInput v-model="password" label="New password" placeholder="••••••••" />
            <UiInput v-model="passwordConfirm" label="Confirm password" placeholder="••••••••" />
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
    </UiSheet>
</template>

<style scoped>
section {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);

    label {
        font-size: var(--size-xs);
        text-transform: uppercase;
        font-family: 'Geist Mono Variable', monospace;
        letter-spacing: var(--letter-spacing);
        font-weight: 500;
        opacity: 0.35;
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
}
</style>
