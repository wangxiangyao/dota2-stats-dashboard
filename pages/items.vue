<template>
  <AnalysisLayout
    title="物品数值分析"
    subtitle="分析物品价格分布、属性效率与溢价，揭示物品经济系统设计逻辑"
    :tabs="tabs"
    default-tab="pricing"
  >
    <!-- Tab 1: 价格与属性 -->
    <template #pricing>
      <ItemPriceDistribution
        :items="items"
        :loading="loading"
      />
    </template>

    <!-- Tab 2: 溢价分析 -->
    <template #premium>
      <ItemPremiumAnalysis
        :items="items"
      />
    </template>
  </AnalysisLayout>
</template>

<script setup lang="ts">
// Tab配置
const tabs = [
  { name: 'pricing', label: '💰 价格与属性' },
  { name: 'premium', label: '🔥 溢价分析' }
]

// 状态
const loading = ref(true)
const items = ref<any[]>([])

// 加载数据
onMounted(async () => {
  try {
    const data = await $fetch<any[]>('/data/items/items.json')
    items.value = data || []
  } catch (e) {
    console.error('加载物品数据失败:', e)
  } finally {
    loading.value = false
  }
})
</script>
