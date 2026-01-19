<script setup lang="ts">
import type { Ability, DamageType } from '~/types/dota'

const props = defineProps<{
  abilities: Ability[]
  title?: string
  groupBy: 'damageType' | 'functionType' | 'targetType'
  level?: number
}>()

const { groupByDamageType, calculateGroupStats } = useAbilityCalculator()

// 分组统计
const groupData = computed(() => {
  const level = props.level || 1

  if (props.groupBy === 'damageType') {
    const groups = groupByDamageType(props.abilities)
    const damageTypes: DamageType[] = ['Physical', 'Magical', 'Pure']

    return damageTypes.map(type => {
      const groupAbilities = groups[type] || []
      const stats = calculateGroupStats(groupAbilities, level)

      return {
        type: getDamageTypeName(type),
        ...stats
      }
    })
  }

  // 其他分组类型后续实现
  return []
})

// 获取伤害类型中文名
const getDamageTypeName = (type: DamageType): string => {
  const names: Record<DamageType, string> = {
    'Physical': '物理伤害',
    'Magical': '魔法伤害',
    'Pure': '纯粹伤害'
  }
  return names[type] || type
}

// 获取设计特点
const getDesignFeature = (type: string): string => {
  switch (type) {
    case '物理伤害':
      return '受护甲减免，物理核心主要输出方式'
    case '魔法伤害':
      return '受魔抗减免，法师主要输出方式'
    case '纯粹伤害':
      return '无视护甲魔抗，克制高护甲英雄'
    default:
      return ''
  }
}

// 格式化数值
const formatNumber = (num: number, decimals: number = 1): string => {
  if (num === 0) return '-'
  return num.toFixed(decimals)
}
</script>

<template>
  <div class="table-container">
    <h4>{{ title || '按伤害类型分组分析' }}</h4>
    <p class="table-desc">不同伤害类型的设计规律和平衡机制</p>

    <el-table
      :data="groupData"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      size="small"
    >
      <el-table-column prop="type" label="伤害类型" width="100" />
      <el-table-column prop="count" label="技能数" width="70" />
      <el-table-column prop="avgDamage" label="平均伤害" width="90">
        <template #default="{ row }">
          {{ formatNumber(row.avgDamage, 0) }}
        </template>
      </el-table-column>
      <el-table-column prop="avgCooldown" label="平均CD" width="80">
        <template #default="{ row }">
          {{ formatNumber(row.avgCooldown, 1) }}
        </template>
      </el-table-column>
      <el-table-column prop="avgManaCost" label="平均蓝耗" width="80">
        <template #default="{ row }">
          {{ formatNumber(row.avgManaCost, 0) }}
        </template>
      </el-table-column>
      <el-table-column prop="avgDPS" label="平均DPS" width="80">
        <template #default="{ row }">
          {{ formatNumber(row.avgDPS, 1) }}
        </template>
      </el-table-column>
      <el-table-column prop="avgDamagePerMana" label="平均蓝效" width="80">
        <template #default="{ row }">
          {{ formatNumber(row.avgDamagePerMana, 1) }}
        </template>
      </el-table-column>
      <el-table-column prop="designFeature" label="设计特点">
        <template #default="{ row }">
          {{ getDesignFeature(row.type) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.table-container {
  width: 100%;
}

.table-container h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #606266;
}

.table-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
}
</style>
