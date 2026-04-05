import type { ComputedRef, Ref } from 'vue'
import { computed } from 'vue'
import type { FieldDef } from '@/types/schema'
import config from '../../fields.config'

export function useSchema(collectionName: Ref<string | null> | ComputedRef<string | null>) {
    const fields = computed<FieldDef[]>(() => {
        if (!collectionName.value) return []
        return config.collections.find(c => c.name === collectionName.value)?.fields ?? []
    })

    return { fields }
}
