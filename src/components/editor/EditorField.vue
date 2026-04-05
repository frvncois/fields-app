<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon, TrashIcon } from '@heroicons/vue/16/solid'
import type { FieldDef, FieldValues } from '@/types/schema'
import UiInput from '@/components/ui/UiInput.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiRichText from '@/components/ui/UiRichText.vue'
import UiMedia from '@/components/ui/UiMedia.vue'
import UiBoolean from '@/components/ui/UiBoolean.vue'

const props = defineProps<{
    field: FieldDef
    values: FieldValues
}>()

const emit = defineEmits<{
    'update:values': [values: FieldValues]
}>()

function updateField(key: string, value: unknown): void {
    emit('update:values', { ...props.values, [key]: value })
}

const strVal = computed<string>({
    get: () => String(props.values[props.field.key] ?? ''),
    set: (v) => updateField(props.field.key, v),
})

const boolVal = computed<boolean>({
    get: () => Boolean(props.values[props.field.key]),
    set: (v) => updateField(props.field.key, v),
})

const rows = computed<FieldValues[]>(() => {
    const val = props.values[props.field.key]
    return Array.isArray(val) ? val : []
})

function addRow(): void {
    const newRow: FieldValues = {}
    props.field.fields?.forEach(f => { newRow[f.key] = '' })
    updateField(props.field.key, [...rows.value, newRow])
}

function removeRow(i: number): void {
    updateField(props.field.key, rows.value.filter((_, idx) => idx !== i))
}

function updateRow(i: number, newRow: FieldValues): void {
    updateField(props.field.key, rows.value.map((r, idx) => idx === i ? newRow : r))
}
</script>

<template>
    <UiInput
        v-if="field.type === 'input'"
        v-model="strVal"
        :label="field.label"
        size="default"
    />

    <UiTextarea
        v-else-if="field.type === 'textarea'"
        v-model="strVal"
        :label="field.label"
    />

    <UiRichText
        v-else-if="field.type === 'richtext'"
        v-model="strVal"
        :label="field.label"
    />

    <UiMedia
        v-else-if="field.type === 'media'"
        v-model="strVal"
        :label="field.label"
    />

    <div v-else-if="field.type === 'boolean'" class="row">
        <span class="label">{{ field.label }}</span>
        <UiBoolean v-model="boolVal" />
    </div>

    <div v-else-if="field.type === 'repeater'" class="repeater">
        <span class="label">{{ field.label }}</span>

        <div v-for="(row, i) in rows" :key="i" class="row">
            <EditorField
                v-for="subField in field.fields"
                :key="subField.key"
                :field="subField"
                :values="row"
                @update:values="updateRow(i, $event)"
            />
            <button class="remove" @click="removeRow(i)">
                <TrashIcon class="btn-icon" /> Remove
            </button>
        </div>

        <button class="add" @click="addRow">
            <PlusIcon class="btn-icon" /> Add row
        </button>
    </div>
</template>

<style scoped>
.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);

    .label {
        font-size: var(--size-sm);
        font-weight: 500;
    }
}

.repeater {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);

    .label {
        font-size: var(--size-sm);
        font-weight: 500;
    }

    .row {
        display: flex;
        flex-direction: column;
        gap: var(--gap-sm);
        padding: var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);

        .remove {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            align-self: flex-end;
            background: none;
            border: none;
            font-size: var(--size-sm);
            font-family: inherit;
            cursor: pointer;
            color: var(--color-danger);
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            opacity: 0.7;

            &:hover { opacity: 1; background: var(--color-danger-bg); }

            .btn-icon {
                height: var(--size-sm);
                aspect-ratio: 1/1;
                flex-shrink: 0;
            }
        }
    }

    .add {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        background: none;
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-sm);
        font-size: var(--size-sm);
        font-family: inherit;
        cursor: pointer;
        color: inherit;
        padding: var(--space-sm) var(--space-md);
        opacity: 0.5;
        width: 100%;
        justify-content: center;

        &:hover { opacity: 1; background: var(--color-hover); }

        .btn-icon {
            height: var(--size-sm);
            aspect-ratio: 1/1;
            flex-shrink: 0;
        }
    }
}
</style>
