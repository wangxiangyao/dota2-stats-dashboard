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
/* ===== 根布局：使用 grid 三行布局 ===== */
.analysis-layout {
  display: grid;
  grid-template-rows: auto auto 1fr;
  height: 100%;
  background: #f5f7fa;
  overflow: hidden;
}

/* ===== 头部 ===== */
.page-header {
  display: grid;
  grid-template-columns: auto auto 1fr;
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

/* ===== Tab 导航 ===== */
.tabs-nav {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.tabs-wrapper {
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
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

/* ===== 内容区域 ===== */
.page-content {
  display: grid;
  grid-template-rows: 1fr;
  min-height: 0;
  overflow: hidden;
}

.content-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
}

.tab-panel {
  display: grid;
  grid-template-rows: 1fr;
  min-height: 0;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-header {
    padding: 10px 16px;
    grid-template-columns: 1fr;
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
