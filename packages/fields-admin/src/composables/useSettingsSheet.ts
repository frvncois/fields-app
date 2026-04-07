import { ref, watch } from 'vue'
import { useAppSettings } from './useAppSettings'
import { patchSettings } from '@/api/settings'
import { changePassword } from '@/api/auth'

const isOpen = ref(false)

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const currentPassword = ref('')
const password = ref('')
const passwordConfirm = ref('')

const { darkMode } = useAppSettings()

watch(darkMode, (val) => {
    patchSettings({ dark_mode: val ? '1' : '0' })
        .catch(e => console.error('Failed to save dark mode:', e))
})

export function useSettingsSheet() {
    function open() { isOpen.value = true }
    function close() { isOpen.value = false }

    async function saveProfile(): Promise<boolean> {
        try {
            await patchSettings({
                user_first: firstName.value,
                user_last: lastName.value,
                user_email: email.value,
            })
            return true
        } catch (e) {
            console.error('Failed to save profile:', e)
            return false
        }
    }

    async function savePassword(): Promise<{ ok: boolean; error?: string }> {
        if (!currentPassword.value || !password.value || password.value !== passwordConfirm.value) {
            return { ok: false }
        }
        try {
            const result = await changePassword(currentPassword.value, password.value)
            if (result.ok) {
                currentPassword.value = ''
                password.value = ''
                passwordConfirm.value = ''
            }
            return result
        } catch (e) {
            console.error('Failed to save password:', e)
            return { ok: false, error: 'Unexpected error' }
        }
    }

    return {
        isOpen,
        open,
        close,
        firstName,
        lastName,
        email,
        currentPassword,
        password,
        passwordConfirm,
        darkMode,
        saveProfile,
        savePassword,
    }
}
