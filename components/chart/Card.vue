<template>
  <div class="chart-card" :class="{ 'full-width': fullWidth }">
    <h4 v-if="title">{{ title }}</h4>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  fullWidth?: boolean
}>()
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
}

.chart-card.full-width {
  width: 100%;
}

.chart-card h4 {
  margin: 0 0 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
}
</style>
