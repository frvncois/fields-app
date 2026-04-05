import { ref } from 'vue'
import { getSettings } from '@/api/settings'
import { hasAuthHint } from '@/api/client'

const projectName = ref('Fields')
const userFirst   = ref('')
const userLast    = ref('')
const userEmail   = ref('')
const darkMode    = ref(false)
let fetched = false

export function useAppSettings() {
    if (!fetched && hasAuthHint()) {
        fetched = true
        getSettings()
            .then((data) => {
                if (data.project_name) projectName.value = data.project_name
                if (data.user_first)   userFirst.value   = data.user_first
                if (data.user_last)    userLast.value    = data.user_last
                if (data.user_email)   userEmail.value   = data.user_email
                darkMode.value = data.dark_mode === '1'
            })
            .catch(e => {
                console.error('Failed to fetch settings:', e)
                fetched = false
            })
    }

    return { projectName, userFirst, userLast, userEmail, darkMode }
}
