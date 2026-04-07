<script setup lang="ts">
import { computed } from 'vue'
import UiBoolean from '@/components/ui/UiBoolean.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import { useCollections } from '@/composables/useCollections'
import type { UserPermissions } from '@/api/users'

const model = defineModel<UserPermissions>({ required: true })

const { grouped } = useCollections()

const collectionList = computed(() => grouped.value.collections)
const objectList = computed(() => grouped.value.objects)

function toggleGrant(field: 'collectionGrants' | 'objectGrants', id: number) {
    const arr = model.value[field]
    const i = arr.indexOf(id)
    model.value = {
        ...model.value,
        [field]: i === -1 ? [...arr, id] : arr.filter(x => x !== id),
    }
}

function toggle(field: keyof UserPermissions) {
    model.value = { ...model.value, [field]: !model.value[field] }
}
</script>

<template>
    <div class="perms">

        <div class="group">
            <p class="group-label">Content</p>

            <div class="row">
                <span>All pages</span>
                <UiBoolean :model-value="model.pages_all" @update:model-value="toggle('pages_all')" />
            </div>

            <div class="row">
                <span>All collections</span>
                <UiBoolean :model-value="model.collections_all" @update:model-value="toggle('collections_all')" />
            </div>
            <template v-if="!model.collections_all && collectionList.length > 0">
                <div
                    v-for="col in collectionList"
                    :key="col.id"
                    class="row sub"
                >
                    <span>{{ col.label }}</span>
                    <UiCheckbox
                        :model-value="model.collectionGrants.includes(col.id)"
                        @update:model-value="toggleGrant('collectionGrants', col.id)"
                    />
                </div>
            </template>

            <div class="row">
                <span>All objects</span>
                <UiBoolean :model-value="model.objects_all" @update:model-value="toggle('objects_all')" />
            </div>
            <template v-if="!model.objects_all && objectList.length > 0">
                <div
                    v-for="col in objectList"
                    :key="col.id"
                    class="row sub"
                >
                    <span>{{ col.label }}</span>
                    <UiCheckbox
                        :model-value="model.objectGrants.includes(col.id)"
                        @update:model-value="toggleGrant('objectGrants', col.id)"
                    />
                </div>
            </template>
        </div>

        <div class="group">
            <p class="group-label">Actions</p>
            <div class="row">
                <span>Create entries</span>
                <UiBoolean :model-value="model.can_create" @update:model-value="toggle('can_create')" />
            </div>
            <div class="row">
                <span>Edit entries</span>
                <UiBoolean :model-value="model.can_edit" @update:model-value="toggle('can_edit')" />
            </div>
            <div class="row">
                <span>Delete entries</span>
                <UiBoolean :model-value="model.can_delete" @update:model-value="toggle('can_delete')" />
            </div>
            <div class="row">
                <span>Publish / change status</span>
                <UiBoolean :model-value="model.can_publish" @update:model-value="toggle('can_publish')" />
            </div>
        </div>

        <div class="group">
            <p class="group-label">Storage</p>
            <div class="row">
                <span>Manage media</span>
                <UiBoolean :model-value="model.can_media" @update:model-value="toggle('can_media')" />
            </div>
        </div>

    </div>
</template>

<style scoped>
.perms {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
}

.group {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);

    .group-label {
        font-size: var(--size-xs);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing);
        font-family: 'Geist Mono Variable', monospace;
        font-weight: 500;
        opacity: 0.4;
        margin: 0;
    }
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--size-sm);
    padding: var(--space-xs) 0;

    &.sub {
        padding-left: var(--space-md);
        opacity: 0.75;
    }
}
</style>
