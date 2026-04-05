import { ref } from 'vue'
import { getLocales, setLocale } from '@/api/locales'
import type { Locale } from '@/api/locales'

export type { Locale }

const locales = ref<Locale[]>([])
let fetched = false

export function useLocales() {
    if (!fetched) {
        fetched = true
        getLocales().then((data) => { locales.value = data })
    }

    async function switchLocale(code: string) {
        locales.value = await setLocale(code)
    }

    return { locales, switchLocale }
}
