<template>
  <section :id="id" class="chart-subsection">
    <div :class="['subsection-header', colorClass]">
      <h3>{{ title }}</h3>
    </div>
    <div class="subsection-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: string
  title: string
  color?: 'blue' | 'red' | 'green' | 'orange' | 'purple'
}>()

const colorClass = computed(() => props.color || 'blue')
</script>

<style scoped>
.chart-subsection {
  margin-bottom: 24px;
}

.subsection-header {
  padding: 8px 16px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.subsection-header h3 {
  margin: 0;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
}

.subsection-header.blue { background: linear-gradient(90deg, #3b82f6 0%, transparent 100%); }
.subsection-header.red { background: linear-gradient(90deg, #ef4444 0%, transparent 100%); }
.subsection-header.green { background: linear-gradient(90deg, #10b981 0%, transparent 100%); }
.subsection-header.orange { background: linear-gradient(90deg, #f97316 0%, transparent 100%); }
.subsection-header.purple { background: linear-gradient(90deg, #8b5cf6 0%, transparent 100%); }

.subsection-content {
  padding-left: 4px;
}
</style>
