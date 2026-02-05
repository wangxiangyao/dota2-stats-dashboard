<script setup lang="ts">
import type { Hero } from '~/types/dota'

const { loadHeroes, loadHeroAbilities, loadItems } = useDataLoader()

// 统计数据
const stats = ref({
  heroCount: 0,
  abilityCount: 0,
  itemCount: 0
})

// 英雄数据（用于图表）
const heroes = ref<Hero[]>([])
const loading = ref(true)

// 功能模块
const modules = [
  {
    icon: '⚔️',
    title: '英雄分析',
    desc: '英雄属性、成长曲线、生存能力与输出评估',
    link: '/heroes',
    color: '#e74c3c'
  },
  {
    icon: '💫',
    title: '技能分析',
    desc: '伤害分布、冷却效率、蓝耗性价比与控制统计',
    link: '/abilities',
    color: '#9b59b6'
  },
  {
    icon: '🎒',
    title: '装备分析',
    desc: '装备属性性价比、合成路线与功能分类',
    link: '/items',
    color: '#f39c12'
  },
  {
    icon: '🗺️',
    title: '世界分析',
    desc: '地图导航、移动时间计算与视野模拟',
    link: '/world',
    color: '#27ae60'
  }
]

// 加载数据
onMounted(async () => {
  try {
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
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Banner -->
    <section class="hero-banner">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">Dota 2</span> 数据分析平台
        </h1>
        <p class="hero-subtitle">
          通过数据分析，揭示游戏设计的底层逻辑
        </p>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="stat-value">{{ stats.heroCount || '...' }}</span>
            <span class="stat-name">英雄</span>
          </div>
          <div class="stat-divider"></div>
          <div class="hero-stat">
            <span class="stat-value">{{ stats.abilityCount || '...' }}</span>
            <span class="stat-name">技能</span>
          </div>
          <div class="stat-divider"></div>
          <div class="hero-stat">
            <span class="stat-value">{{ stats.itemCount || '...' }}</span>
            <span class="stat-name">物品</span>
          </div>
        </div>
      </div>
      <div class="hero-glow"></div>
    </section>

    <!-- 功能模块 -->
    <section class="modules-section">
      <h2 class="section-title">分析模块</h2>
      <div class="modules-grid">
        <NuxtLink
          v-for="mod in modules"
          :key="mod.title"
          :to="mod.link"
          class="module-card"
          :style="{ '--accent-color': mod.color }"
        >
          <div class="module-icon">{{ mod.icon }}</div>
          <h3 class="module-title">{{ mod.title }}</h3>
          <p class="module-desc">{{ mod.desc }}</p>
          <div class="module-arrow">→</div>
        </NuxtLink>
      </div>
    </section>

    <!-- 快速预览 -->
    <section class="preview-section">
      <h2 class="section-title">英雄属性分布</h2>
      <div class="chart-wrapper">
        <div v-if="loading" class="chart-loading">
          <span class="loading-spinner"></span>
          <span>加载中...</span>
        </div>
        <HeroAttributeScatter v-else :heroes="heroes" />
      </div>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <p>基于 Dota 2 Patch 7.40b 数据 · 仅供学习研究使用</p>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%);
}

/* Hero Banner */
.hero-banner {
  position: relative;
  padding: 80px 40px 60px;
  text-align: center;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(102, 126, 234, 0.15) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #f093fb 50%, #f5576c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 40px;
}

.hero-stats {
  display: inline-flex;
  align-items: center;
  gap: 32px;
  padding: 20px 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
}

.stat-name {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
}

/* Modules Section */
.modules-section {
  padding: 60px 40px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 32px;
  text-align: center;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.module-card {
  position: relative;
  padding: 28px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  transition: all 0.3s ease;
  overflow: hidden;
}

.module-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-color);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.module-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.module-card:hover::before {
  opacity: 1;
}

.module-icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.module-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.module-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.6;
}

.module-arrow {
  position: absolute;
  right: 24px;
  bottom: 24px;
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.module-card:hover .module-arrow {
  color: var(--accent-color);
  transform: translateX(4px);
}

/* Preview Section */
.preview-section {
  padding: 40px 40px 60px;
}

.chart-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px;
  min-height: 400px;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Footer */
.home-footer {
  text-align: center;
  padding: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.home-footer p {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-banner {
    padding: 60px 24px 40px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-stats {
    flex-direction: column;
    gap: 16px;
    padding: 24px;
  }

  .stat-divider {
    width: 60px;
    height: 1px;
  }

  .modules-section,
  .preview-section {
    padding: 40px 24px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
  }
}
</style>
