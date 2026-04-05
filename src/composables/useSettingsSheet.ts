import { ref, watch } from 'vue'
import { useAppSettings } from './useAppSettings'
import { patchSettings } from '@/api/settings'
import { changePassword } from '@/api/auth'

const isOpen = ref(false)

const firstName = ref('')
const lastName = ref('')
const email = ref('')
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

    async function savePassword(): Promise<boolean> {
        if (!password.value || password.value !== passwordConfirm.value) return false
        try {
            const ok = await changePassword(password.value)
            if (ok) {
                password.value = ''
                passwordConfirm.value = ''
            }
            return ok
        } catch (e) {
            console.error('Failed to save password:', e)
            return false
        }
    }

    return {
        isOpen,
        open,
        close,
        firstName,
        lastName,
        email,
        password,
        passwordConfirm,
        darkMode,
        saveProfile,
        savePassword,
    }
}
