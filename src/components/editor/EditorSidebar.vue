<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiBoolean from '@/components/ui/UiBoolean.vue'
import UiLocale from '@/components/ui/UiLocale.vue'
import { LanguageIcon } from '@heroicons/vue/20/solid'
import { ClockIcon, GlobeAltIcon, EyeIcon } from '@heroicons/vue/24/outline'
import UiData from '@/components/ui/UiData.vue'
import { useLocales } from '@/composables/useLocales'

const published      = defineModel<boolean>('published',      { default: false })
const metaTitle      = defineModel<string>('metaTitle',      { default: '' })
const metaDescription = defineModel<string>('metaDescription', { default: '' })
const slug           = defineModel<string>('slug',           { default: '' })

defineProps<{
    createdAt?: string
    updatedAt?: string
}>()

const { locales } = useLocales()
</script>

<template>
    <aside>
        <div class="item">
            <label><EyeIcon />Visibility</label>
            <UiBoolean v-model="published" />
        </div>
        <div class="item">
            <label><LanguageIcon />Translate</label>
            <UiLocale
                v-for="locale in locales"
                :key="locale.code"
                :label="locale.name"
                :current="locale.is_current === 1"
            />
        </div>
        <div class="item">
            <label><ClockIcon />Activity</label>
            <UiData title="Created" :value="createdAt ?? '—'" />
            <UiData title="Modified" :value="updatedAt ?? '—'" />
        </div>
        <div class="item">
            <label><GlobeAltIcon />SEO</label>
            <UiInput v-model="metaTitle" label="Meta title" placeholder="Page title" size="sm" />
            <UiTextarea v-model="metaDescription" label="Meta description" placeholder="Brief description..." />
            <UiInput v-model="slug" label="Slug" placeholder="/page-slug" size="sm" />
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
}
</style>
