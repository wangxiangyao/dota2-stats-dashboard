<script setup lang="ts">
defineProps<{
  title: string
  level?: 'section' | 'tab' | 'global'  // 部分级、页签级、全局级
  color?: string
}>()
</script>

<template>
  <div class="summary-box" :class="[level || 'section', color]">
    <div class="summary-header">
      <span class="summary-icon">📝</span>
      <h4>{{ title }}</h4>
    </div>
    <div class="summary-content">
      <slot>
        <p class="placeholder">（分析内容待补充）</p>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.summary-box {
  margin: 1.5rem 0;
  padding: 1.2rem;
  border-radius: 8px;
  border-left: 4px solid #95a5a6;
  background: #f8f9fa;
}

.summary-box.section {
  border-left-color: #3498db;
  background: linear-gradient(135deg, #f0f7ff 0%, #f8f9fa 100%);
}

.summary-box.tab {
  border-left-color: #9b59b6;
  background: linear-gradient(135deg, #f5f0ff 0%, #f8f9fa 100%);
  margin: 2rem 0;
  padding: 1.5rem;
}

.summary-box.global {
  border-left-color: #e74c3c;
  background: linear-gradient(135deg, #fff5f5 0%, #f8f9fa 100%);
  margin: 2rem 0;
  padding: 1.5rem;
}

/* 颜色变体 */
.summary-box.blue { border-left-color: #3498db; }
.summary-box.green { border-left-color: #27ae60; }
.summary-box.purple { border-left-color: #9b59b6; }
.summary-box.red { border-left-color: #e74c3c; }
.summary-box.orange { border-left-color: #e67e22; }
.summary-box.cyan { border-left-color: #17a2b8; }

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}

.summary-icon {
  font-size: 1.2rem;
}

.summary-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 600;
}

.summary-content {
  color: #34495e;
  font-size: 0.95rem;
  line-height: 1.6;
}

.summary-content :deep(p) {
  margin: 0.5rem 0;
}

.summary-content :deep(ul) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.summary-content :deep(li) {
  margin: 0.3rem 0;
}

.placeholder {
  color: #95a5a6;
  font-style: italic;
}
</style>
