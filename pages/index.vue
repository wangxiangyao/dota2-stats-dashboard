<script setup lang="ts">
import type { Hero, Ability, Item } from '~/types/dota'

const { loadHeroes, loadHeroAbilities, loadItems } = useDataLoader()

// 统计数据
const stats = ref({
  heroCount: 0,
  abilityCount: 0,
  itemCount: 0
})

// 英雄数据（用于图表）
const heroes = ref<Hero[]>([])

// 加载数据
onMounted(async () => {
  const [heroData, abilityData, itemData] = await Promise.all([
    loadHeroes(),
    loadHeroAbilities(),
    loadItems()
  ])

  if (heroData) {
    heroes.value = heroData
    stats.value.heroCount = heroData.length
  }

  if (abilityData) {
    stats.value.abilityCount = abilityData.length
  }

  if (itemData) {
    stats.value.itemCount = itemData.length
  }
})
</script>

<template>
  <div>
    <!-- 项目简介 -->
    <section class="intro-section">
      <h2>项目简介</h2>
      <p>通过数据分析，揭示Dota2游戏设计的底层逻辑。</p>
    </section>

    <!-- 数据概览 -->
    <section>
      <h2>数据概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-number">{{ stats.heroCount || '--' }}</span>
          <span class="stat-label">英雄</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.abilityCount || '--' }}</span>
          <span class="stat-label">技能</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.itemCount || '--' }}</span>
          <span class="stat-label">物品</span>
        </div>
      </div>
    </section>

    <!-- 快速预览图表 -->
    <section>
      <h2>快速预览</h2>
      <div class="chart-container">
        <HeroAttributeScatter :heroes="heroes" />
      </div>
    </section>
  </div>
</template>
