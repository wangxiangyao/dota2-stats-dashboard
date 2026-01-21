<template>
  <div class="stats-grid">
    <div 
      v-for="(stat, index) in stats" 
      :key="index" 
      :class="['stat-card', { highlight: stat.highlight, [stat.highlightColor || 'blue']: stat.highlight }]"
    >
      <div class="stat-label">{{ stat.label }}</div>
      <div class="stat-value">{{ stat.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface StatItem {
  label: string
  value: string | number
  highlight?: boolean
  highlightColor?: 'blue' | 'red' | 'green' | 'orange'
}

defineProps<{
  stats: StatItem[]
}>()
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-card.highlight.blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.stat-card.highlight.red {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.stat-card.highlight.green {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
}

.stat-card.highlight.orange {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  border-color: #fdba74;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2937;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
