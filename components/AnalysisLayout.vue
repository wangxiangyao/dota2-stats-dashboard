<template>
  <div class="analysis-layout">
    <header class="analysis-header">
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </header>
    
    <el-tabs v-model="activeTab" class="analysis-tabs" @tab-change="$emit('tab-change', $event)">
      <el-tab-pane 
        v-for="tab in tabs" 
        :key="tab.name" 
        :label="tab.label" 
        :name="tab.name"
      >
        <div class="tab-content">
          <slot :name="tab.name" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  name: string
  label: string
}

const props = defineProps<{
  title: string
  subtitle?: string
  tabs: Tab[]
  defaultTab?: string
}>()

defineEmits<{
  'tab-change': [tabName: string]
}>()

const activeTab = ref(props.defaultTab || props.tabs[0]?.name || '')
</script>

<style scoped>
.analysis-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.analysis-header {
  flex-shrink: 0;
  padding: 20px 32px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
}

.analysis-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.analysis-header .subtitle {
  margin: 4px 0 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.analysis-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.analysis-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
  margin: 0;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.analysis-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.analysis-tabs :deep(.el-tabs__item) {
  font-size: 0.95rem;
  height: 48px;
  line-height: 48px;
}

.analysis-tabs :deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

.analysis-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.analysis-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}
</style>
