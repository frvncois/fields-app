<script setup lang="ts">
import FieldsIcon from '@/assets/FieldsIcon.vue'
import UiNav from '@/components/ui/UiNav.vue'
import UiUser from '@/components/ui/UiUser.vue'
import {
    HomeIcon,
    PhotoIcon,
    DocumentTextIcon,
    FolderIcon,
    PaperClipIcon,
} from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import { useSettingsSheet } from '@/composables/useSettingsSheet'
import { useStorage } from '@/composables/useStorage'
import { useCollections } from '@/composables/useCollections'
import { useAppSettings } from '@/composables/useAppSettings'
import { useAuth } from '@/composables/useAuth'
import { getEntriesByCollection } from '@/api/entries'

const { open: openSettings } = useSettingsSheet()
const { open: openStorage, isOpen: isStorageOpen } = useStorage()
const { grouped } = useCollections()
const { userFirst, userLast, userEmail } = useAppSettings()
const { logout } = useAuth()
const router = useRouter()

function handleLogout() {
    logout()
    router.push({ name: 'login' })
}

function toList(id: number) {
    return { name: 'list', params: { id } }
}

async function openPage(collectionId: number) {
    const entries = await getEntriesByCollection(collectionId)
    if (entries.length > 0) {
        router.push({ name: 'editor', params: { id: entries[0]!.id } })
    } else {
        router.push({ name: 'editor', query: { collection: collectionId } })
    }
}
</script>

<template>
    <aside>
        <nav>
            <div class="header">
                <FieldsIcon />
                <h1>Fields</h1>
            </div>
            <div class="items">

                <UiNav title="Dashboard" :icon="HomeIcon" :to="{ name: 'dashboard' }" />
                <UiNav title="Storage" :icon="PhotoIcon" :action="openStorage" :active="isStorageOpen" />

                <UiNav
                    title="Pages"
                    :icon="DocumentTextIcon"
                    :children="grouped.pages.length
                        ? grouped.pages.map(c => ({ title: c.label, action: () => openPage(c.id) }))
                        : [{ title: 'No pages yet' }]"
                />
                <UiNav
                    title="Collections"
                    :icon="FolderIcon"
                    :children="grouped.collections.length
                        ? grouped.collections.map(c => ({ title: c.label, to: toList(c.id) }))
                        : [{ title: 'No collections yet' }]"
                />
                <UiNav
                    title="Objects"
                    :icon="PaperClipIcon"
                    :children="grouped.objects.length
                        ? grouped.objects.map(c => ({ title: c.label, to: toList(c.id) }))
                        : [{ title: 'No objects yet' }]"
                />
            </div>
            <UiUser
                :first-name="userFirst"
                :last-name="userLast"
                :email="userEmail"
                @logout="handleLogout"
                @settings="openSettings"
            />
        </nav>
    </aside>
</template>

<style scoped>
aside {
    background-color: var(--color-surface);
    border-right: 1px solid var(--color-border);
    grid-row: span 2;
    position: relative;
    z-index: 60;
    padding: 0 var(--space-base);

    nav {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-bottom: var(--space-base);
        position: sticky;
        top: 0;
        height: calc(100vh - var(--space-base));

        .header {
            display: flex;
            align-items: center;
            gap: var(--gap-sm);
            color: var(--color-foreground);
            padding: var(--space-lg) var(--space-sm);
            line-height: 1.35;

            > svg {
                height: var(--size-sm);
                aspect-ratio: 1;
            }
        }

        .items {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
            flex: 1;
        }
    }
}
</style>
