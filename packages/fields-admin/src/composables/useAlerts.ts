import { ref } from 'vue'
import type { Component } from 'vue'

export type AlertOptions = {
    title: string
    message?: string
    icon?: Component
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'danger'
    input?: { placeholder?: string }
}

const isOpen = ref(false)
const options = ref<AlertOptions>({ title: '' })
const inputValue = ref('')
const isPrompt = ref(false)

let confirmResolver: ((value: boolean) => void) | null = null
let promptResolver: ((value: string | null) => void) | null = null

export function useAlerts() {
    function confirm(opts: AlertOptions): Promise<boolean> {
        options.value = opts
        isPrompt.value = false
        isOpen.value = true
        return new Promise((resolve) => { confirmResolver = resolve })
    }

    function prompt(opts: AlertOptions): Promise<string | null> {
        options.value = opts
        inputValue.value = ''
        isPrompt.value = true
        isOpen.value = true
        return new Promise((resolve) => { promptResolver = resolve })
    }

    function respond(confirmed: boolean) {
        isOpen.value = false
        if (isPrompt.value) {
            promptResolver?.(confirmed ? inputValue.value : null)
            promptResolver = null
        } else {
            confirmResolver?.(confirmed)
            confirmResolver = null
        }
    }

    return { isOpen, options, inputValue, isPrompt, confirm, prompt, respond }
}
