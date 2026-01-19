<script setup lang="ts">
import type { Ability } from '~/types/dota'

const props = defineProps<{
  abilities: Ability[]
  title: string
  level?: number
}>()

const { calculateAbilityStats, calculatePercentile, calculateMedian } = useAbilityCalculator()

const level = computed(() => props.level || 1)

// 计算统计数据
const stats = computed(() => {
  if (props.abilities.length === 0) {
    return null
  }

  const allStats = props.abilities.map(a => calculateAbilityStats(a, level.value))

  const damages = allStats.map(s => s.damage).filter(d => d > 0)
  const cds = allStats.map(s => s.cooldown).filter(c => c > 0)
  const manas = allStats.map(s => s.manaCost).filter(m => m > 0)
  const dpsList = allStats.map(s => s.dps).filter(d => d > 0)
  const dpmList = allStats.map(s => s.damagePerMana).filter(d => d > 0)

  return {
    count: props.abilities.length,

    // 伤害
    damage: {
      mean: damages.length ? damages.reduce((a, b) => a + b, 0) / damages.length : 0,
      median: damages.length ? calculateMedian(damages) : 0,
      min: damages.length ? Math.min(...damages) : 0,
      max: damages.length ? Math.max(...damages) : 0,
      p25: damages.length ? calculatePercentile(damages, 25) : 0,
      p75: damages.length ? calculatePercentile(damages, 75) : 0
    },

    // CD
    cooldown: {
      mean: cds.length ? cds.reduce((a, b) => a + b, 0) / cds.length : 0,
      median: cds.length ? calculateMedian(cds) : 0,
      min: cds.length ? Math.min(...cds) : 0,
      max: cds.length ? Math.max(...cds) : 0
    },

    // 蓝耗
    manaCost: {
      mean: manas.length ? manas.reduce((a, b) => a + b, 0) / manas.length : 0,
      median: manas.length ? calculateMedian(manas) : 0,
      min: manas.length ? Math.min(...manas) : 0,
      max: manas.length ? Math.max(...manas) : 0
    },

    // DPS
    dps: {
      mean: dpsList.length ? dpsList.reduce((a, b) => a + b, 0) / dpsList.length : 0,
      median: dpsList.length ? calculateMedian(dpsList) : 0,
      max: dpsList.length ? Math.max(...dpsList) : 0
    },

    // 蓝效
    damagePerMana: {
      mean: dpmList.length ? dpmList.reduce((a, b) => a + b, 0) / dpmList.length : 0,
      median: dpmList.length ? calculateMedian(dpmList) : 0,
      max: dpmList.length ? Math.max(...dpmList) : 0
    }
  }
})

const formatNumber = (num: number, decimals: number = 1): string => {
  if (num === 0) return '-'
  return num.toFixed(decimals)
}
</script>

<template>
  <div v-if="stats" class="stats-cards">
    <h3 class="section-title">{{ title }}</h3>

    <div class="cards-grid">
      <!-- 伤害卡片 -->
      <div class="stat-card damage">
        <div class="card-header">
          <span class="card-icon">⚔️</span>
          <span class="card-title">伤害</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">均值</span>
          <span class="stat-value">{{ formatNumber(stats.damage.mean, 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">中位数</span>
          <span class="stat-value">{{ formatNumber(stats.damage.median, 0) }}</span>
        </div>
        <div class="stat-row small">
          <span class="stat-label">区间</span>
          <span class="stat-value">{{ formatNumber(stats.damage.min, 0) }} - {{ formatNumber(stats.damage.max, 0) }}</span>
        </div>
      </div>

      <!-- CD卡片 -->
      <div class="stat-card cooldown">
        <div class="card-header">
          <span class="card-icon">⏱️</span>
          <span class="card-title">冷却</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">均值</span>
          <span class="stat-value">{{ formatNumber(stats.cooldown.mean, 1) }}s</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">中位数</span>
          <span class="stat-value">{{ formatNumber(stats.cooldown.median, 1) }}s</span>
        </div>
        <div class="stat-row small">
          <span class="stat-label">区间</span>
          <span class="stat-value">{{ formatNumber(stats.cooldown.min, 1) }}s - {{ formatNumber(stats.cooldown.max, 1) }}s</span>
        </div>
      </div>

      <!-- 蓝耗卡片 -->
      <div class="stat-card mana">
        <div class="card-header">
          <span class="card-icon">💎</span>
          <span class="card-title">蓝耗</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">均值</span>
          <span class="stat-value">{{ formatNumber(stats.manaCost.mean, 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">中位数</span>
          <span class="stat-value">{{ formatNumber(stats.manaCost.median, 0) }}</span>
        </div>
        <div class="stat-row small">
          <span class="stat-label">区间</span>
          <span class="stat-value">{{ formatNumber(stats.manaCost.min, 0) }} - {{ formatNumber(stats.manaCost.max, 0) }}</span>
        </div>
      </div>

      <!-- DPS卡片 -->
      <div class="stat-card dps">
        <div class="card-header">
          <span class="card-icon">📈</span>
          <span class="card-title">DPS</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">均值</span>
          <span class="stat-value">{{ formatNumber(stats.dps.mean, 1) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">中位数</span>
          <span class="stat-value">{{ formatNumber(stats.dps.median, 1) }}</span>
        </div>
        <div class="stat-row small">
          <span class="stat-label">最高</span>
          <span class="stat-value">{{ formatNumber(stats.dps.max, 1) }}</span>
        </div>
      </div>

      <!-- 蓝效卡片 -->
      <div class="stat-card efficiency">
        <div class="card-header">
          <span class="card-icon">💰</span>
          <span class="card-title">蓝效</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">均值</span>
          <span class="stat-value">{{ formatNumber(stats.damagePerMana.mean, 1) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">中位数</span>
          <span class="stat-value">{{ formatNumber(stats.damagePerMana.median, 1) }}</span>
        </div>
        <div class="stat-row small">
          <span class="stat-label">最高</span>
          <span class="stat-value">{{ formatNumber(stats.damagePerMana.max, 1) }}</span>
        </div>
      </div>

      <!-- 技能数量卡片 -->
      <div class="stat-card count">
        <div class="card-header">
          <span class="card-icon">📊</span>
          <span class="card-title">数量</span>
        </div>
        <div class="stat-row main">
          <span class="stat-value big">{{ stats.count }}</span>
          <span class="stat-label">个技能</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-cards {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stat-card.damage { border-top: 3px solid #e74c3c; }
.stat-card.cooldown { border-top: 3px solid #3498db; }
.stat-card.mana { border-top: 3px solid #9b59b6; }
.stat-card.dps { border-top: 3px solid #27ae60; }
.stat-card.efficiency { border-top: 3px solid #f39c12; }
.stat-card.count { border-top: 3px solid #34495e; }

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.card-icon {
  font-size: 16px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.stat-row.small {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #f0f0f0;
}

.stat-row.main {
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.stat-value.big {
  font-size: 24px;
  color: #409eff;
}
</style>
