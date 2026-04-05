<script setup lang="ts">
import AppBreadcrumbs from '@/components/shared/AppBreadcrumbs.vue'
import AppActions from '@/components/shared/AppActions.vue'
</script>

<template>
    <header>
        <AppBreadcrumbs />
        <AppActions />
    </header>
</template>

<style scoped>
header {
    height: var(--header-height);
    padding: 0 var(--space-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    background-color: var(--color-background);
    z-index: 10;
    box-sizing: border-box;
}
</style>
