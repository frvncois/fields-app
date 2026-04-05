<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiBoolean from '@/components/ui/UiBoolean.vue'
import UiCombobox from '@/components/ui/UiCombobox.vue'
import UiMedia from '@/components/ui/UiMedia.vue'
import { LanguageIcon } from '@heroicons/vue/20/solid'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import UiData from '@/components/ui/UiData.vue'
import { useLocales } from '@/composables/useLocales'

const published       = defineModel<boolean>('published',       { default: false })
const ogImage         = defineModel<string>('ogImage',          { default: '' })
const metaTitle       = defineModel<string>('metaTitle',        { default: '' })
const metaDescription = defineModel<string>('metaDescription',  { default: '' })
const slug            = defineModel<string>('slug',             { default: '' })

defineProps<{
    createdAt?: string
    updatedAt?: string
    category?: 'page' | 'collection' | 'object' | null
}>()

const emit = defineEmits<{ translate: [locale: string] }>()
const { locales, switchLocale } = useLocales()
</script>

<template>
    <aside>
        <div class="item inline">
            <label>
                <component :is="published ? EyeIcon : EyeSlashIcon" />
                {{ published ? 'Published' : 'Not published' }}
            </label>
            <UiBoolean v-model="published" />
        </div>
        <div class="item inline">
            <label><LanguageIcon />Translate</label>
            <UiCombobox
                :label="locales.find(l => l.is_current === 1)?.name ?? '—'"
                :items="locales.filter(l => !l.is_current).map(l => ({ label: l.name, action: () => { switchLocale(l.code); emit('translate', l.code) } }))"
            />
        </div>
        <div v-if="category === 'page' || category === 'collection'" class="item">
            <UiMedia v-model="ogImage" label="Feature image" />
            <UiInput v-model="metaTitle" label="Meta title" placeholder="Page title" size="sm" />
            <UiTextarea v-model="metaDescription" label="Meta description" placeholder="Brief description..." />
            <UiInput v-model="slug" label="Slug" placeholder="/page-slug" size="sm" />
        </div>
        <div class="item list">
            <UiData title="Created" :value="createdAt ?? '—'" />
            <UiData title="Modified" :value="updatedAt ?? '—'" />
        </div>
    </aside>
</template>

<style scoped>
aside {
    display: flex;
    position: sticky;
    top: var(--header-height);
    align-self: start;
    flex-direction: column;
    border-left: 1px solid var(--color-border);
    height: calc(100vh - var(--header-height));
    background-color: var(--color-surface);

    label {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        margin-bottom: var(--space-xs);
        font-size: var(--size-sm);
        svg {
            height: 1em;
            aspect-ratio: 1;
            flex-shrink: 0;
        }
    }

    .item {
        display: flex;
        flex-direction: column;
        padding: var(--space-base) var(--space-md);
        gap: var(--gap-md);
        border-bottom: 1px solid var(--color-border);
    }
    .inline {
        flex-direction: row;
        justify-content: space-between;
    }

    .list {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }
}
</style>
