<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiTable from '@/components/ui/UiTable.vue'
import { useEntries } from '@/composables/useEntries'
import { useCollections } from '@/composables/useCollections'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const { entries, loading, fetchAll, fetchByCollection, remove } = useEntries()
const { all } = useCollections()
const { toast } = useToast()

const canAdd = computed(() => {
    const id = Number(route.params.id)
    if (!id) return false
    return all.value.find(c => c.id === id)?.type === 'collection'
})

watch(
    () => route.params.id,
    (id) => {
        const numId = Number(id)
        if (id && Number.isInteger(numId) && numId > 0) {
            fetchByCollection(numId)
        } else if (!id) {
            fetchAll()
        } else {
            router.replace({ name: 'dashboard' })
            toast('Invalid collection ID', 'error')
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="content">
        <div v-if="loading" class="loading">Loading…</div>
        <UiTable
            v-else
            :items="entries"
            :can-add="canAdd"
            :initial-type="route.query.type ? String(route.query.type) : undefined"
            @add="router.push({ name: 'editor', query: { collection: route.params.id } })"
            @deleted="remove($event)"
        />
    </div>
</template>

<style scoped>
.content {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
    padding: var(--space-xl);
    width: var(--content-width);
    margin: 0 auto;
}
.loading {
    padding: var(--space-xl);
    font-size: var(--size-sm);
    opacity: 0.5;
}
</style>
