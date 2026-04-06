import { ref } from 'vue'

const isOpen = ref(false)
const isPicking = ref(false)
let resolver: ((url: string | null) => void) | null = null

export function useStorage() {
    function open() {
        isOpen.value = true
    }

    function pick(): Promise<string | null> {
        // [L1] If a pick is already in flight (two media fields clicked in quick
        // succession), cancel the pending promise rather than silently overwriting
        // the resolver and leaving the first caller's Promise hung forever.
        if (resolver) resolver(null)
        isPicking.value = true
        isOpen.value = true
        return new Promise((r) => { resolver = r })
    }

    function resolve(url: string | null) {
        resolver?.(url)
        resolver = null
        isPicking.value = false  // clear before closing so the watcher doesn't re-trigger
        isOpen.value = false
    }

    return { isOpen, isPicking, open, pick, resolve }
}
