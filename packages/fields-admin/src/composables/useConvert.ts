import { ref } from 'vue'

export type ConvertOptions = {
    quality: number       // 0–100
    format: 'keep' | 'jpeg' | 'png' | 'webp'
    maxWidth: number | null
    prefix: string
}

type Resolver = (files: File[] | null) => void

const isOpen = ref(false)
const inputFiles = ref<File[]>([])
let resolver: Resolver | null = null

export function useConvert() {
    function open(files: File[]): Promise<File[] | null> {
        inputFiles.value = files
        isOpen.value = true
        return new Promise<File[] | null>((resolve) => {
            resolver = resolve
        })
    }

    function resolve(result: File[] | null) {
        isOpen.value = false
        resolver?.(result)
        resolver = null
        inputFiles.value = []
    }

    return { isOpen, inputFiles, open, resolve }
}
