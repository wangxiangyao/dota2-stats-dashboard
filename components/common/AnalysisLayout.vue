<template>
  <div class="analysis-layout">
    <!-- 紧凑头部 -->
    <header class="page-header">
      <h1>{{ title }}</h1>
      <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
    </header>

    <!-- Tab导航 -->
    <nav class="tabs-nav">
      <div class="tabs-wrapper">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="tab-btn"
          :class="{ active: activeTab === tab.name }"
          @click="switchTab(tab.name)"
        >
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <!-- 可滚动的内容区域 -->
    <main class="page-content">
      <div class="content-wrapper">
        <template v-for="tab in tabs" :key="tab.name">
          <div v-show="activeTab === tab.name" class="tab-panel">
            <slot :name="tab.name" />
          </div>
        </template>
      </div>
    </main>
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

const emit = defineEmits<{
  'tab-change': [tabName: string]
}>()

const activeTab = ref(props.defaultTab || props.tabs[0]?.name || '')

const switchTab = (tabName: string) => {
  activeTab.value = tabName
  emit('tab-change', tabName)
}
</script>

<style scoped>
.analysis-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
  overflow: hidden;
}

/* 紧凑头部 */
.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.page-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.page-header .subtitle {
  font-size: 0.85rem;
  color: #9ca3af;
}

/* Tab导航 */
.tabs-nav {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.tabs-wrapper {
  display: flex;
  gap: 0;
  padding: 0 24px;
}

.tab-btn {
  padding: 12px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: #3b82f6;
  background: #f8fafc;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}

/* 内容区域 - 独立滚动 */
.page-content {
  flex: 1;
  overflow: hidden;
}

.content-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.tab-panel {
  max-width: 1400px;
  margin: 0 auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    padding: 10px 16px;
    flex-direction: column;
    gap: 4px;
  }

  .page-header h1 {
    font-size: 1.1rem;
  }

  .tabs-wrapper {
    padding: 0 16px;
  }

  .tab-btn {
    padding: 10px 14px;
    font-size: 0.85rem;
  }

  .content-wrapper {
    padding: 16px;
  }
}
</style>
