<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  level: number
  title: string
  yAxisName: string
  // 计算每个英雄对其他所有英雄的数值（返回数组）
  valuesGetter: (hero: Hero, allHeroes: Hero[], level: number) => number[]
  // 排序方式：按中位数升序还是降序
  sortOrder?: 'asc' | 'desc'
  excludeHeroes?: string[]
}>()

// 过滤英雄
const filteredHeroes = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return []
  const excludeSet = new Set(props.excludeHeroes || [])
  return props.heroes.filter(h => !excludeSet.has(h.localizedName || h.name) && !excludeSet.has(h.name))
})

// 计算箱线图数据
const boxplotData = computed(() => {
  if (!filteredHeroes.value.length) return { data: [], heroes: [] }

  const heroData = filteredHeroes.value.map(hero => {
    const values = props.valuesGetter(hero, filteredHeroes.value, props.level)

    // 排序并计算分位数
    const sorted = [...values].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const median = sorted[Math.floor(sorted.length * 0.5)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]

    return {
      hero,
      name: hero.localizedName || hero.name,
      values: [min, q1, median, q3, max],
      median,
      color: ATTRIBUTE_COLORS[hero.primaryAttribute] || ATTRIBUTE_COLORS.universal
    }
  })

  // 按中位数排序
  const sortedData = heroData.sort((a, b) => {
    return props.sortOrder === 'desc'
      ? b.median - a.median
      : a.median - b.median
  })

  return {
    data: sortedData.map(d => d.values),
    heroes: sortedData
  }
})

// 图表配置
const option = computed(() => {
  const { data, heroes } = boxplotData.value
  if (!data.length) return {}

  return {
    title: {
      text: props.title,
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const idx = params.dataIndex
        const heroInfo = heroes[idx]
        const values = heroInfo.values
        return `<strong>${heroInfo.name}</strong><br/>
                最小: ${values[0].toFixed(1)}秒<br/>
                Q1: ${values[1].toFixed(1)}秒<br/>
                中位: ${values[2].toFixed(1)}秒<br/>
                Q3: ${values[3].toFixed(1)}秒<br/>
                最大: ${values[4].toFixed(1)}秒`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: heroes.map(h => h.name),
      axisLabel: {
        rotate: 45,
        color: '#7f8c8d',
        fontSize: 10,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: props.yAxisName,
      axisLabel: { color: '#7f8c8d' }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        bottom: 5
      }
    ],
    series: [{
      type: 'boxplot',
      data: heroes.map(h => ({
        value: h.values,
        itemStyle: {
          color: h.color,
          borderColor: h.color
        }
      })),
      itemStyle: {
        borderWidth: 1
      }
    }]
  }
})

const hasData = computed(() => filteredHeroes.value.length > 0)
</script>

<template>
  <div class="chart-wrapper">
    <ClientOnly>
      <VChart
        v-if="hasData"
        :option="option"
        autoresize
        style="width: 100%; height: 500px;"
      />
      <div v-else class="chart-placeholder">
        数据加载中...
      </div>
    </ClientOnly>
  </div>
</template>

<style scoped>
.chart-wrapper {
  width: 100%;
  min-height: 500px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 500px;
  color: #a0a0a0;
}
</style>
