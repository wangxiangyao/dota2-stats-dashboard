<script setup lang="ts">
import type { Ability } from '~/types/dota'

const props = defineProps<{
  abilities: Ability[]
  title: string
  limit?: number
  level?: number
}>()

const { calculateAbilityStats } = useAbilityCalculator()

const limit = computed(() => props.limit || 10)
const level = computed(() => props.level || 1)

// 计算Top技能
const topAbilities = computed(() => {
  const withStats = props.abilities
    .map(a => ({
      ...a,
      stats: calculateAbilityStats(a, level.value)
    }))
    .filter(a => a.stats.damage > 0)
    .sort((a, b) => b.stats.damage - a.stats.damage)
    .slice(0, limit.value)

  return withStats
})

const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toFixed(decimals)
}

const getHeroChineseName = (ability: Ability): string => {
  // 这里可以添加英雄中文名映射
  return ability.heroName
}
</script>

<template>
  <div class="top-damage-list">
    <h3 class="section-title">{{ title }}</h3>

    <el-table
      :data="topAbilities"
      stripe
      border
      size="small"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
      style="width: 100%"
    >
      <el-table-column type="index" label="#" width="45" align="center">
        <template #default="{ $index }">
          <span v-if="$index < 3" class="rank-badge" :class="'rank-' + ($index + 1)">
            {{ $index + 1 }}
          </span>
          <span v-else class="rank-normal">{{ $index + 1 }}</span>
        </template>
      </el-table-column>

      <el-table-column label="技能名称" min-width="140">
        <template #default="{ row }">
          <div class="ability-name">
            <span class="name">{{ row.name_zh || row.name }}</span>
            <span v-if="row.is_ultimate" class="ult-badge">大招</span>
          </div>
          <div class="hero-name">{{ getHeroChineseName(row) }}</div>
        </template>
      </el-table-column>

      <el-table-column label="伤害类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag
            :type="row.damageType === 'Magical' ? 'warning' : row.damageType === 'Pure' ? 'danger' : 'info'"
            size="small"
          >
            {{ row.damageType }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="伤害" width="80" align="right">
        <template #default="{ row }">
          <span class="damage-value">{{ formatNumber(row.stats.damage) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="CD" width="70" align="right">
        <template #default="{ row }">
          {{ formatNumber(row.stats.cooldown, 1) }}s
        </template>
      </el-table-column>

      <el-table-column label="蓝耗" width="70" align="right">
        <template #default="{ row }">
          {{ formatNumber(row.stats.manaCost) }}
        </template>
      </el-table-column>

      <el-table-column label="DPS" width="70" align="right">
        <template #default="{ row }">
          <span class="dps-value">{{ formatNumber(row.stats.dps, 1) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="蓝效" width="70" align="right">
        <template #default="{ row }">
          <span :class="{
            'high-eff': row.stats.damagePerMana > 5,
            'low-eff': row.stats.damagePerMana < 2
          }">
            {{ formatNumber(row.stats.damagePerMana, 1) }}
          </span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.top-damage-list {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  border-radius: 50%;
  font-weight: 600;
  font-size: 12px;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
  color: #fff;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%);
  color: #fff;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #b8860b 100%);
  color: #fff;
}

.rank-normal {
  color: #909399;
  font-weight: 500;
}

.ability-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name {
  font-weight: 500;
  color: #303133;
}

.ult-badge {
  display: inline-block;
  padding: 1px 6px;
  background: #fbbf24;
  color: #78350f;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
}

.hero-name {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.damage-value {
  font-weight: 600;
  color: #e74c3c;
}

.dps-value {
  font-weight: 500;
  color: #27ae60;
}

.high-eff {
  color: #27ae60;
  font-weight: 600;
}

.low-eff {
  color: #e74c3c;
}
</style>
