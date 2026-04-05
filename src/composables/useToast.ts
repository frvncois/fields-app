import { ref } from 'vue'

type ToastType = 'default' | 'success' | 'error'

type Toast = {
    id: number
    message: string
    type: ToastType
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
    function toast(message: string, type: ToastType = 'default') {
        const id = nextId++
        toasts.value.push({ id, message, type })
        setTimeout(() => dismiss(id), 4000)
    }

    function dismiss(id: number) {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return { toasts, toast, dismiss }
}
