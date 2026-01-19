<script setup lang="ts">
import type { Ability } from '~/types/dota'

const props = defineProps<{
  normalAbilities: Ability[]
  ultimateAbilities: Ability[]
  level?: number
}>()

const { calculateAbilityStats } = useAbilityCalculator()
const level = computed(() => props.level || 1)

// 准备散点图数据
const chartData = computed(() => {
  const normalData = props.normalAbilities.map(a => {
    const stats = calculateAbilityStats(a, level.value)
    return {
      name: a.name_zh || a.name,
      hero: a.heroName,
      x: stats.cooldown,
      y: stats.damage,
      size: Math.max(6, Math.min(20, stats.manaCost / 10))
    }
  }).filter(d => d.x > 0 && d.y > 0)

  const ultimateData = props.ultimateAbilities.map(a => {
    const stats = calculateAbilityStats(a, level.value)
    return {
      name: a.name_zh || a.name,
      hero: a.heroName,
      x: stats.cooldown,
      y: stats.damage,
      size: Math.max(8, Math.min(25, stats.manaCost / 8))
    }
  }).filter(d => d.x > 0 && d.y > 0)

  return { normalData, ultimateData }
})

// ECharts 配置
const option = computed(() => {
  const normalPoints = chartData.value.normalData
  const ultimatePoints = chartData.value.ultimateData

  if (normalPoints.length === 0 && ultimatePoints.length === 0) {
    return {}
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data
        const dps = (data.y / data.x).toFixed(1)
        return `
          <div style="padding: 6px;">
            <strong style="color: #303133;">${data.name}</strong><br/>
            <span style="color: #909399; font-size: 11px;">${data.hero}</span><br/>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #ddd;"/>
            <span style="color: #606266;">CD:</span> ${data.x.toFixed(1)}s<br/>
            <span style="color: #606266;">伤害:</span> ${Math.round(data.y)}<br/>
            <span style="color: #606266;">DPS:</span> ${dps}
          </div>
        `
      }
    },
    legend: {
      data: ['普通技能', '大招'],
      bottom: 10,
      textStyle: { color: '#606266' }
    },
    grid: {
      left: '10%',
      right: '8%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      name: '冷却时间 (秒)',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: '#606266', fontSize: 12 },
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: '{value}s',
        color: '#909399'
      },
      axisLine: { lineStyle: { color: '#dfe6e9' } },
      splitLine: { lineStyle: { color: '#f1f2f6', type: 'dashed' } }
    },
    yAxis: {
      name: '伤害数值',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: '#606266', fontSize: 12 },
      type: 'value',
      scale: true,
      axisLabel: {
        color: '#909399'
      },
      axisLine: { lineStyle: { color: '#dfe6e9' } },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    series: [
      {
        name: '普通技能',
        type: 'scatter',
        data: normalPoints.map((p, index) => ({
          name: p.name,
          value: [p.x, p.y],
          hero: p.hero,
          size: p.size,
          dataIndex: index
        })),
        symbolSize: (data: any) => {
          return data?.size || 10
        },
        itemStyle: {
          color: '#409eff',
          opacity: 0.6
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            opacity: 1,
            borderColor: '#303133',
            borderWidth: 2
          }
        }
      },
      {
        name: '大招',
        type: 'scatter',
        data: ultimatePoints.map((p, index) => ({
          name: p.name,
          value: [p.x, p.y],
          hero: p.hero,
          size: p.size,
          dataIndex: index
        })),
        symbolSize: (data: any) => {
          return data?.size || 12
        },
        itemStyle: {
          color: '#f56c6c',
          opacity: 0.7
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            opacity: 1,
            borderColor: '#303133',
            borderWidth: 2
          }
        }
      }
    ]
  }
})

const hasData = computed(() => {
  return chartData.value.normalData.length > 0 || chartData.value.ultimateData.length > 0
})
</script>

<template>
  <div class="scatter-compare-chart">
    <h3 class="section-title">对比分析：伤害 vs 冷却时间</h3>
    <p class="section-desc">气泡大小代表蓝耗 | 蓝色=普通技能 | 红色=大招</p>

    <div class="chart-container">
      <ClientOnly>
        <VChart
          v-if="hasData"
          :option="option"
          autoresize
          style="height: 450px;"
        />
        <div v-else class="no-data">
          暂无数据
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.scatter-compare-chart {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.section-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 16px;
}

.chart-container {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 450px;
  color: #909399;
  font-size: 14px;
}
</style>
