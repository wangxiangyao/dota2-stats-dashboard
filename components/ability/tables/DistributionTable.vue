<script setup lang="ts">
import type { Ability } from '~/types/dota'

interface StatRow {
  name: string
  value: number
  label: string
}

const props = defineProps<{
  abilities: Ability[]
  title: string
  level?: number
  valueGetter?: (ability: Ability, level: number) => number
}>()

// 计算分位数
const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

// 计算中位数
const calculateMedian = (values: number[]): number => {
  return calculatePercentile(values, 50)
}

// 计算标准差
const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

// 提取伤害值（所有等级）
const extractDamageLevels = (ability: Ability): number[] => {
  const attr = ability.attributes?.find((a) => a.key === 'damage')
  if (!attr) return [0]
  const value = attr.value
  if (Array.isArray(value)) {
    return value.map((v) => parseFloat(String(v)) || 0)
  }
  return [parseFloat(String(value)) || 0]
}

// 计算统计指标
const stats = computed(() => {
  const level = props.level || 1

  // 确保 abilities 是一个数组
  if (!props.abilities || !Array.isArray(props.abilities)) {
    return null
  }

  let values: number[] = []

  if (props.valueGetter) {
    values = props.abilities.map((a) => props.valueGetter!(a, level)).filter((v) => v > 0)
  } else {
    values = props.abilities
      .map((a) => {
        const levels = extractDamageLevels(a)
        const idx = Math.min(level - 1, levels.length - 1)
        return levels[idx >= 0 ? idx : 0]
      })
      .filter((v) => v > 0)
  }

  if (values.length === 0) {
    return null
  }

  const median = calculateMedian(values)
  const p25 = calculatePercentile(values, 25)
  const p75 = calculatePercentile(values, 75)
  const stdDev = calculateStdDev(values)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((a, b) => a + b, 0) / values.length

  return {
    count: values.length,
    min,
    max,
    mean,
    median,
    p25,
    p75,
    stdDev,
    range: max - min
  }
})

// 表格数据
const tableData = computed<StatRow[]>(() => {
  if (!stats.value) return []

  return [
    { name: '样本数', value: stats.value.count, label: `${stats.value.count} 个技能` },
    { name: '最小值', value: stats.value.min, label: stats.value.min.toFixed(0) },
    { name: '25%分位数', value: stats.value.p25, label: stats.value.p25.toFixed(0) },
    { name: '中位数', value: stats.value.median, label: stats.value.median.toFixed(0) },
    { name: '75%分位数', value: stats.value.p75, label: stats.value.p75.toFixed(0) },
    { name: '最大值', value: stats.value.max, label: stats.value.max.toFixed(0) },
    { name: '平均值', value: stats.value.mean, label: stats.value.mean.toFixed(1) },
    { name: '标准差', value: stats.value.stdDev, label: stats.value.stdDev.toFixed(1) },
    { name: '数值区间', value: stats.value.range, label: `${stats.value.min.toFixed(0)}-${stats.value.max.toFixed(0)}` }
  ]
})

// 获取设计逻辑说明
const getDesignLogic = (row: StatRow): string => {
  switch (row.name) {
    case '中位数':
      return '伤害的"基准线"，大部分技能在这个水平'
    case '25%分位数':
      return '低伤技能的上限'
    case '75%分位数':
      return '高伤技能的下限'
    case '标准差':
      return `数值${row.value > 100 ? '较分散' : '较集中'}，离散程度${row.value > 100 ? '高' : '低'}`
    case '数值区间':
      return `Dota2设计师认为"合理的技能伤害"应该在 ${row.label} 范围内`
    default:
      return ''
  }
}
</script>

<template>
  <div class="table-container">
    <h4>{{ title }}</h4>

    <el-table
      :data="tableData"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      size="small"
    >
      <el-table-column prop="name" label="统计维度" width="120" />
      <el-table-column prop="label" label="数值" width="110" />
      <el-table-column prop="designLogic" label="设计逻辑">
        <template #default="{ row }">
          <span class="logic-text">{{ getDesignLogic(row) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!stats" class="no-data">暂无数据</div>
  </div>
</template>

<style scoped>
.table-container {
  width: 100%;
}

.table-container h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #606266;
}

.logic-text {
  color: #606266;
  font-size: 12px;
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
