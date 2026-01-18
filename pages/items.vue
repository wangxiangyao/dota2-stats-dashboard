<script setup lang="ts">
const { loadItems } = useDataLoader()

const items = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  const data = await loadItems()
  if (data) {
    items.value = data
  }
  loading.value = false
})
</script>

<template>
  <div>
    <h2>第三部分：物品数值分析</h2>

    <div class="intro-section" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
      <h3>🎒 物品数值分析</h3>
      <p>分析所有物品的属性、价格、合成路线，揭示物品经济系统的设计逻辑。</p>
    </div>

    <section class="chart-section">
      <h3>物品数据概览</h3>
      <div v-if="loading" class="loading">数据加载中...</div>
      <div v-else>
        <p>已加载 {{ items.length }} 个物品数据</p>
        <p style="color: var(--text-secondary); margin-top: 1rem;">
          物品分析功能开发中，敬请期待...
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.intro-section h3 {
  color: #fff;
  border: none;
  padding: 0;
  margin-bottom: 0.5rem;
}
</style>
