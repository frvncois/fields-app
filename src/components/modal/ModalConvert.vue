<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowsPointingInIcon } from '@heroicons/vue/24/outline'
import { useConvert } from '@/composables/useConvert'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiCombobox from '@/components/ui/UiCombobox.vue'
import UiRange from '@/components/ui/UiRange.vue'
import type { ComboboxItem } from '@/components/ui/UiCombobox.vue'

const { isOpen, inputFiles, resolve } = useConvert()

const format = ref<'keep' | 'jpeg' | 'png' | 'webp'>('webp')
const maxWidth = ref(2400)
const prefix = ref('')
const converting = ref(false)

const FORMAT_LABELS: Record<string, string> = {
    keep: 'Keep original',
    webp: 'WebP',
    jpeg: 'JPEG',
    png: 'PNG',
}

const formatItems = computed<ComboboxItem[]>(() => [
    { label: 'Keep original', action: () => { format.value = 'keep' } },
    { label: 'WebP',          action: () => { format.value = 'webp' } },
    { label: 'JPEG',          action: () => { format.value = 'jpeg' } },
    { label: 'PNG',           action: () => { format.value = 'png' } },
])

const imageFiles = computed(() => inputFiles.value.filter(f => f.type.startsWith('image/')))

async function convertFile(file: File): Promise<File> {
    const targetFormat = format.value === 'keep' ? file.type : `image/${format.value}`
    const ext = format.value === 'keep' ? file.name.split('.').pop()! : format.value

    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            const mw = maxWidth.value || null
            let w = img.naturalWidth
            let h = img.naturalHeight
            if (mw && w > mw) {
                h = Math.round(h * (mw / w))
                w = mw
            }
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, w, h)
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error('Conversion failed')); return }
                const baseName = file.name.replace(/\.[^.]+$/, '')
                const newName = `${prefix.value}${baseName}.${ext}`
                resolve(new File([blob], newName, { type: blob.type }))
            }, targetFormat, 0.95)
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')) }
        img.src = url
    })
}

async function handleConvert() {
    converting.value = true
    const result: File[] = []
    for (const file of inputFiles.value) {
        if (file.type.startsWith('image/')) {
            result.push(await convertFile(file))
        } else {
            result.push(file)
        }
    }
    converting.value = false
    resolve(result)
}

function handleSkip() {
    resolve(null)
}
</script>

<template>
    <UiModal :open="isOpen" @close="handleSkip">
        <div class="body">
            <div class="header">
                <div class="icon-box">
                    <ArrowsPointingInIcon />
                </div>
                <div>
                    <div class="title">Convert images</div>
                    <div class="subtitle">{{ imageFiles.length }} image{{ imageFiles.length !== 1 ? 's' : '' }} selected</div>
                </div>
            </div>

            <div class="fields">
                <div class="field">
                    <span class="field-label">Format</span>
                    <div class="field-control">
                        <span class="field-value">{{ FORMAT_LABELS[format] }}</span>
                        <UiCombobox :items="formatItems" />
                    </div>
                </div>

                <UiRange v-model="maxWidth" label="Max width" :min="100" :max="4000" :step="100" unit="px" />

                <UiInput label="Filename prefix" v-model="prefix" placeholder="e.g. optimized-" size="sm" />
            </div>

            <div class="actions">
                <UiButton text="Skip" variant="outline" @click="handleSkip" />
                <UiButton :text="converting ? 'Converting…' : 'Convert'" :disabled="converting" @click="handleConvert" />
            </div>
        </div>
    </UiModal>
</template>

<style scoped>
.body {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--gap-lg);

    .header {
        display: flex;
        align-items: center;
        gap: var(--gap-sm);

        .icon-box {
            height: var(--size-md);
            aspect-ratio: 1/1;
            border-radius: var(--radius-sm);
            border: 1px solid var(--color-border);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            svg {
                height: var(--size-base);
                aspect-ratio: 1/1;
            }
        }

        .title {
            font-size: var(--size-sm);
            font-weight: 600;
        }

        .subtitle {
            font-size: var(--size-sm);
            opacity: 0.4;
            margin-top: var(--space-xs);
        }
    }

    .fields {
        display: flex;
        flex-direction: column;
        gap: var(--gap-sm);

        .field {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);

            .field-label {
                font-size: var(--size-sm);
                font-weight: 500;
            }

            .field-control {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-xs) var(--space-sm);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);

                .field-value {
                    font-size: var(--size-sm);
                    opacity: 0.6;
                }
            }
        }
    }

    .actions {
        display: flex;
        gap: var(--gap-sm);
        justify-content: flex-end;
    }
}
</style>
