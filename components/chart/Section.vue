<template>
  <section :id="id" class="chart-section">
    <div :class="['section-header', colorClass]">
      <h2>{{ title }}</h2>
    </div>
    <div class="section-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: string
  title: string
  color?: 'yellow' | 'orange' | 'green' | 'blue' | 'red' | 'purple'
}>()

const colorClass = computed(() => props.color || 'purple')
</script>

<style scoped>
.chart-section {
  margin-bottom: 32px;
}

.section-header {
  padding: 14px 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  color: white;
}

.section-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.section-header.yellow { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.section-header.orange { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
.section-header.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.section-header.blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.section-header.red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.section-header.purple { background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%); }

.section-content {
  padding-left: 4px;
}
</style>
