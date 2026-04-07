<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { PhotoIcon, FolderPlusIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import UiSheet from '@/components/ui/UiSheet.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiFilters from '@/components/ui/UiFilters.vue'
import UiMediaCard from '@/components/ui/UiMediaCard.vue'
import UiFolderCard from '@/components/ui/UiFolderCard.vue'
import { useStorage } from '@/composables/useStorage'
import { useFilters } from '@/composables/useFilters'
import { useAlerts } from '@/composables/useAlerts'
import { useConvert } from '@/composables/useConvert'
import { useToast } from '@/composables/useToast'
import { uploadMedia, getMedia, patchMedia, deleteMedia } from '@/api/media'
import { getFolders, createFolder as apiFolderCreate, deleteFolder as apiFolderDelete } from '@/api/folders'
import type { MediaItem } from '@/api/media'
import type { Folder } from '@/api/folders'

const { isOpen, isPicking, resolve } = useStorage()

// If the sheet closes while in picker mode (click-outside, ESC, route change),
// resolve the pending promise with null so callers don't hang.
watch(isOpen, (val) => {
    if (!val && isPicking.value) resolve(null)
})
const { confirm, prompt } = useAlerts()
const { open: openConvert } = useConvert()
const { toast } = useToast()

const fileInputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const ACCEPTED = '.jpg,.jpeg,.png,.pdf,.docx,.mp3,.wav,.mp4,.mov,.webp,.webm'

function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getMediaType(file: File): string {
    const m = file.type
    if (m.startsWith('image/')) return 'image'
    if (m.startsWith('video/')) return 'video'
    if (m.startsWith('audio/')) return 'audio'
    if (m === 'application/pdf') return 'pdf'
    if (m.includes('word') || file.name.endsWith('.docx')) return 'docx'
    return 'image'
}

function getImageDimensions(file: File): Promise<string> {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) { resolve('—'); return }
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => { URL.revokeObjectURL(url); resolve(`${img.naturalWidth}×${img.naturalHeight}`) }
        img.onerror = () => { URL.revokeObjectURL(url); resolve('—') }
        img.src = url
    })
}

async function uploadFile(file: File) {
    const dimensions = await getImageDimensions(file)
    const blobUrl = URL.createObjectURL(file)
    const fd = new FormData()
    fd.append('file', file, file.name)
    fd.append('weight', formatSize(file.size))
    fd.append('dimensions', dimensions)
    fd.append('mediaType', getMediaType(file))
    if (currentFolderId.value !== null) fd.append('folderId', String(currentFolderId.value))
    const item = await uploadMedia(fd)
    mediaItems.value.push({ ...item, url: blobUrl })
    if (currentFolderId.value !== null) {
        const folder = folders.value.find(f => f.id === currentFolderId.value)
        if (folder) folder.count++
    }
}

async function onFilesSelected(e: Event) {
    const raw = Array.from((e.target as HTMLInputElement).files ?? [])
    if (!raw.length) return
    ;(e.target as HTMLInputElement).value = ''

    const imageFiles = raw.filter(f => f.type.startsWith('image/'))
    let filesToUpload = raw

    if (imageFiles.length > 0) {
        const converted = await openConvert(imageFiles)
        if (converted !== null) {
            // Replace image files with converted versions
            const nonImages = raw.filter(f => !f.type.startsWith('image/'))
            filesToUpload = [...converted, ...nonImages]
        }
    }

    uploading.value = true
    for (const file of filesToUpload) {
        await uploadFile(file)
    }
    uploading.value = false
}

async function handleConvertMedia(item: MediaItem) {
    const res = await fetch(item.url)
    const blob = await res.blob()
    const file = new File([blob], item.title, { type: blob.type })
    const converted = await openConvert([file])
    if (!converted?.length || !converted[0]) return

    // Delete old item
    await deleteMedia(item.id)
    removeMedia(item.id)

    // Upload converted file into same folder
    const savedFolderId = currentFolderId.value
    currentFolderId.value = item.folder_id
    uploading.value = true
    await uploadFile(converted[0])
    uploading.value = false
    currentFolderId.value = savedFolderId
}

const { defs, values } = useFilters([
    { key: 'search', type: 'search', placeholder: 'Search media...' },
    { key: 'type', type: 'select', placeholder: 'All types', options: [
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
        { label: 'Audio', value: 'audio' },
        { label: 'PDF', value: 'pdf' },
        { label: 'Docx', value: 'docx' },
    ]},
])

const folders = ref<Folder[]>([])
const mediaItems = ref<MediaItem[]>([])
const currentFolderId = ref<number | null>(null)

const currentFolder = computed(() =>
    currentFolderId.value !== null
        ? folders.value.find(f => f.id === currentFolderId.value) ?? null
        : null
)

const visibleFolders = computed(() => {
    if (currentFolderId.value !== null) return []
    if (!values.search) return folders.value
    const q = values.search.toLowerCase()
    return folders.value.filter(f => f.name.toLowerCase().includes(q))
})

const visibleMedia = computed(() => {
    let result = mediaItems.value.filter(m => m.folder_id === currentFolderId.value)
    if (values.search) {
        const q = values.search.toLowerCase()
        result = result.filter(m => m.title.toLowerCase().includes(q))
    }
    if (values.type) {
        result = result.filter(m => m.type === values.type)
    }
    return result
})

const hasActiveFilters = computed(() => !!(values.search || values.type))
const isEmpty = computed(() => visibleFolders.value.length === 0 && visibleMedia.value.length === 0)

async function loadAll() {
    const [f, m] = await Promise.all([getFolders(), getMedia({ limit: 1000 })])
    folders.value = f
    mediaItems.value = m.items
}

onMounted(loadAll)

async function createFolder() {
    const name = await prompt({
        title: 'Create folder',
        message: 'Choose a name for your new folder.',
        icon: FolderPlusIcon,
        confirmLabel: 'Create',
        input: { placeholder: 'e.g. Product shots' },
    })
    if (!name) return
    const folder = await apiFolderCreate(name)
    folders.value.push(folder)
}

async function deleteFolder(id: number) {
    const ok = await confirm({
        title: 'Delete folder?',
        message: 'The folder will be deleted. Media inside will be moved to root.',
        confirmLabel: 'Delete',
        variant: 'danger',
    })
    if (!ok) return
    const folder = folders.value.find(f => f.id === id)
    await apiFolderDelete(id)
    folders.value = folders.value.filter(f => f.id !== id)
    mediaItems.value.forEach(m => { if (m.folder_id === id) m.folder_id = null })
    if (currentFolderId.value === id) currentFolderId.value = null
    if (folder) toast(`"${folder.name}" deleted`, 'success')
}

function removeMedia(id: number) {
    const item = mediaItems.value.find(m => m.id === id)
    if (item?.folder_id !== null && item?.folder_id !== undefined) {
        const folder = folders.value.find(f => f.id === item.folder_id)
        if (folder) folder.count--
    }
    mediaItems.value = mediaItems.value.filter(m => m.id !== id)
}

async function moveMedia(mediaId: number, folderId: number | null) {
    await patchMedia(mediaId, folderId)
    const item = mediaItems.value.find(m => m.id === mediaId)
    if (!item) return
    const prevFolderId = item.folder_id
    item.folder_id = folderId
    // Update counts locally
    if (prevFolderId !== null) {
        const prev = folders.value.find(f => f.id === prevFolderId)
        if (prev) prev.count--
    }
    if (folderId !== null) {
        const next = folders.value.find(f => f.id === folderId)
        if (next) next.count++
    }
}
</script>

<template>
    <UiSheet
        v-model="isOpen"
        title="Storage"
        description="Manage your files and assets."
        :icon="PhotoIcon"
        width="680px"
    >
        <template #default>
            <div v-if="isPicking" class="pick-banner">
                Click an item to insert it into the field.
            </div>
            <div class="toolbar">
                <UiFilters :defs="defs" :values="values" />
                <div class="actions">
                    <UiButton text="Create folder" variant="outline" size="sm" :icon="FolderPlusIcon" @click="createFolder" />
                    <UiButton
                        :text="uploading ? 'Uploading...' : 'Add media'"
                        size="sm"
                        :icon="ArrowUpTrayIcon"
                        :disabled="uploading"
                        @click="fileInputEl?.click()"
                    />
                    <input
                        ref="fileInputEl"
                        type="file"
                        multiple
                        :accept="ACCEPTED"
                        class="hidden-input"
                        @change="onFilesSelected"
                    />
                </div>
            </div>

            <div v-if="currentFolder" class="breadcrumb">
                <UiButton variant="ghost" text="All media" @click="currentFolderId = null" />
                <span>/</span>
                <span>{{ currentFolder.name }}</span>
            </div>

            <div v-if="isEmpty && !hasActiveFilters" class="empty">
                <PhotoIcon class="empty-icon" />
                <p class="empty-title">No media yet</p>
                <p class="empty-text">Upload images, videos, and documents to use across your content.</p>
                <div class="empty-actions">
                    <UiButton text="Create folder" variant="outline" size="sm" :icon="FolderPlusIcon" @click="createFolder" />
                    <UiButton text="Add media" size="sm" :icon="ArrowUpTrayIcon" @click="fileInputEl?.click()" />
                </div>
            </div>
            <div v-else-if="isEmpty" class="empty">
                <PhotoIcon class="empty-icon" />
                <p class="empty-title">No results</p>
                <p class="empty-text">Try adjusting your search or filters.</p>
            </div>
            <div v-else class="grid">
                <UiFolderCard
                    v-for="folder in visibleFolders"
                    :key="folder.id"
                    :id="folder.id"
                    :name="folder.name"
                    :count="folder.count"
                    @open="currentFolderId = folder.id"
                    @deleted="deleteFolder(folder.id)"
                    @media-drop="moveMedia($event, folder.id)"
                />
                <UiMediaCard
                    v-for="item in visibleMedia"
                    :key="item.id"
                    :id="item.id"
                    :title="item.title"
                    :url="item.url"
                    :weight="item.weight"
                    :dimensions="item.dimensions"
                    :type="item.type"
                    :folder-id="item.folder_id"
                    :selectable="isPicking"
                    @pick="resolve($event)"
                    @move="moveMedia(item.id, $event)"
                    @deleted="removeMedia($event)"
                    @convert="handleConvertMedia(item)"
                />
            </div>
        </template>
    </UiSheet>
</template>

<style scoped>
.pick-banner {
    font-size: var(--size-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-hover);
    border-radius: var(--radius-sm);
    opacity: 0.7;
}

.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap-md);

    .actions {
        display: flex;
        align-items: center;
        gap: var(--gap-sm);
        flex-shrink: 0;

        .hidden-input { display: none; }
    }
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
    font-size: var(--size-sm);
    opacity: 0.6;

    span { font-weight: 500; opacity: 1; color: inherit; }

    &-root {
        background: none;
        border: none;
        font-size: var(--size-sm);
        font-family: inherit;
        cursor: pointer;
        padding: 0;
        color: inherit;
        opacity: 0.6;

        &:hover { opacity: 1; text-decoration: underline; }
    }
}

.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-2xl) var(--space-lg);
    text-align: center;

    .empty-icon {
        height: 2rem;
        width: 2rem;
        opacity: 0.25;
    }

    .empty-title {
        font-size: var(--size-sm);
        font-weight: 500;
        margin: 0;
    }

    .empty-text {
        font-size: var(--size-xs);
        opacity: 0.5;
        margin: 0;
        max-width: 280px;
    }

    .empty-actions {
        display: flex;
        gap: var(--gap-sm);
        margin-top: var(--space-xs);
    }
}

.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--gap-md);
    min-width: 0;
}
</style>
