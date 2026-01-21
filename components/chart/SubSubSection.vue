<template>
  <section :id="id" class="chart-sub-subsection">
    <div :class="['sub-subsection-header', colorClass]">
      <h4>{{ title }}</h4>
    </div>
    <div class="sub-subsection-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: string
  title: string
  color?: 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'gray'
}>()

const colorClass = computed(() => props.color || 'gray')
</script>

<style scoped>
.chart-sub-subsection {
  margin-bottom: 20px;
}

.sub-subsection-header {
  padding: 6px 12px;
  margin-bottom: 12px;
  border-radius: 4px;
  border-left: 3px solid;
}

.sub-subsection-header h4 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
}

.sub-subsection-header.blue { background: #eff6ff; border-left-color: #3b82f6; }
.sub-subsection-header.blue h4 { color: #1d4ed8; }

.sub-subsection-header.red { background: #fef2f2; border-left-color: #ef4444; }
.sub-subsection-header.red h4 { color: #dc2626; }

.sub-subsection-header.green { background: #f0fdf4; border-left-color: #10b981; }
.sub-subsection-header.green h4 { color: #059669; }

.sub-subsection-header.orange { background: #fff7ed; border-left-color: #f97316; }
.sub-subsection-header.orange h4 { color: #ea580c; }

.sub-subsection-header.purple { background: #faf5ff; border-left-color: #8b5cf6; }
.sub-subsection-header.purple h4 { color: #7c3aed; }

.sub-subsection-header.gray { background: #f9fafb; border-left-color: #6b7280; }
.sub-subsection-header.gray h4 { color: #4b5563; }

.sub-subsection-content {
  padding-left: 4px;
}
</style>
