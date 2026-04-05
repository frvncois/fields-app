<script setup lang="ts">
import { watchEffect } from 'vue'
import SharedHeader from '@/components/shared/SharedHeader.vue'
import SharedNav from '@/components/shared/SharedNav.vue'
import SheetSettings from '@/components/sheet/SheetSettings.vue'
import SheetStorage from '@/components/sheet/SheetStorage.vue'
import ModalAlert from '@/components/modal/ModalAlert.vue'
import ModalConvert from '@/components/modal/ModalConvert.vue'
import UiToast from '@/components/ui/UiToast.vue'
import { useAppSettings } from '@/composables/useAppSettings'

const { darkMode } = useAppSettings()

watchEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode.value ? 'dark' : 'light')
})
</script>

<template>
    <main>
        <SharedNav />
        <SharedHeader />
        <RouterView />
    </main>
    <SheetSettings />
    <SheetStorage />
    <ModalAlert />
    <ModalConvert />
    <UiToast />
</template>

<style scoped>
main {
    display: grid;
    grid-template-columns: var(--nav-width) 1fr;
    grid-template-rows: auto 1fr;
    justify-content: stretch;
    align-items: stretch;
    align-content: stretch;
    justify-items: stretch;
    min-height: 100vh;
}
</style>
