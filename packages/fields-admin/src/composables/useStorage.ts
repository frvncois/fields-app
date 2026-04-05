import { ref } from 'vue'

const isOpen = ref(false)
const isPicking = ref(false)
let resolver: ((url: string | null) => void) | null = null

export function useStorage() {
    function open() {
        isOpen.value = true
    }

    function pick(): Promise<string | null> {
        isPicking.value = true
        isOpen.value = true
        return new Promise((resolve) => {
            resolver = resolve
        })
    }

    function resolve(url: string | null) {
        resolver?.(url)
        resolver = null
        isPicking.value = false  // clear before closing so the watcher doesn't re-trigger
        isOpen.value = false
    }

    return { isOpen, isPicking, open, pick, resolve }
}
