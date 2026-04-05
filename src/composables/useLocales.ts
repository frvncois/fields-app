import { ref } from 'vue'
import { getLocales } from '@/api/locales'
import type { Locale } from '@/api/locales'

export type { Locale }

const locales = ref<Locale[]>([])
let fetched = false

export function useLocales() {
    if (!fetched) {
        fetched = true
        getLocales().then((data) => { locales.value = data })
    }

    return { locales }
}
