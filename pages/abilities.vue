<script setup lang="ts">
const { loadHeroAbilities } = useDataLoader()

const abilities = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  const data = await loadHeroAbilities()
  if (data) {
    abilities.value = data
  }
  loading.value = false
})
</script>

<template>
  <div>
    <h2>第二部分：技能数值分析</h2>

    <div class="intro-section">
      <h3>🔮 技能数值分析</h3>
      <p>分析所有英雄技能的伤害、冷却、魔耗等数值，揭示技能设计的底层规律。</p>
    </div>

    <section class="chart-section">
      <h3>技能数据概览</h3>
      <div v-if="loading" class="loading">数据加载中...</div>
      <div v-else>
        <p>已加载 {{ abilities.length }} 个技能数据</p>
        <p style="color: var(--text-secondary); margin-top: 1rem;">
          技能分析功能开发中，敬请期待...
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
