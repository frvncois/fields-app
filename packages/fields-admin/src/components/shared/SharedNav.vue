<script setup lang="ts">
import { computed } from 'vue'
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
import { useAuth } from '@/composables/useAuth'
import { getEntriesByCollection } from '@/api/entries'

const { open: openSettings } = useSettingsSheet()
const { open: openStorage, isOpen: isStorageOpen } = useStorage()
const { grouped } = useCollections()
const { logout, role, permissions, isAdmin, firstName, lastName, email } = useAuth()
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

// ─── Permission-aware nav filtering ──────────────────────────────────────────

const showSettings = true

const visiblePages = computed(() => {
    if (isAdmin()) return grouped.value.pages
    if (!permissions.value?.pages_all) return []
    return grouped.value.pages
})

const visibleCollections = computed(() => {
    if (isAdmin()) return grouped.value.collections
    const perms = permissions.value
    if (!perms) return []
    if (perms.collections_all) return grouped.value.collections
    return grouped.value.collections.filter(c => perms.collectionGrants.includes(c.id))
})

const visibleObjects = computed(() => {
    if (isAdmin()) return grouped.value.objects
    const perms = permissions.value
    if (!perms) return []
    if (perms.objects_all) return grouped.value.objects
    return grouped.value.objects.filter(c => perms.objectGrants.includes(c.id))
})
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
                    v-if="isAdmin() || visiblePages.length > 0"
                    title="Pages"
                    :icon="DocumentTextIcon"
                    :children="visiblePages.length
                        ? visiblePages.map(c => ({ title: c.label, action: () => openPage(c.id) }))
                        : [{ title: 'No pages yet' }]"
                />
                <UiNav
                    v-if="isAdmin() || visibleCollections.length > 0"
                    title="Collections"
                    :icon="FolderIcon"
                    :children="visibleCollections.length
                        ? visibleCollections.map(c => ({ title: c.label, to: toList(c.id) }))
                        : [{ title: 'No collections yet' }]"
                />
                <UiNav
                    v-if="isAdmin() || visibleObjects.length > 0"
                    title="Objects"
                    :icon="PaperClipIcon"
                    :children="visibleObjects.length
                        ? visibleObjects.map(c => ({ title: c.label, to: toList(c.id) }))
                        : [{ title: 'No objects yet' }]"
                />

            </div>
            <UiUser
                :first-name="firstName ?? ''"
                :last-name="lastName ?? ''"
                :email="email ?? ''"
                :show-settings="showSettings"
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
