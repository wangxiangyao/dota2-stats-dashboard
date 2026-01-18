<script setup lang="ts">
const { loadWorld } = useDataLoader()

const worldData = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  const data = await loadWorld()
  if (data) {
    worldData.value = data
  }
  loading.value = false
})
</script>

<template>
  <div>
    <h2>第四部分：世界数值分析</h2>

    <div class="intro-section" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);">
      <h3>🌍 世界数值分析</h3>
      <p>分析游戏世界的基础常量、经验曲线、金钱系统等，揭示游戏经济和进度设计。</p>
    </div>

    <section class="chart-section">
      <h3>世界数据概览</h3>
      <div v-if="loading" class="loading">数据加载中...</div>
      <div v-else-if="worldData">
        <p>世界数据已加载</p>
        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 8px; overflow: auto; max-height: 400px;">{{ JSON.stringify(worldData, null, 2) }}</pre>
      </div>
      <div v-else>
        <p style="color: var(--text-secondary);">暂无世界数据</p>
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
