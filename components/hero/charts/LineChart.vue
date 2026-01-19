<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  selectedHeroes: string[]
  title: string
  yAxisName: string
  valueGetter: (hero: Hero, level: number) => number
  tooltipFormatter?: (value: number, hero: Hero, level: number) => string
}>()

const levels = Array.from({ length: 30 }, (_, i) => i + 1)

// 图表配置
const option = computed(() => {
  const selected = props.heroes.filter(h => props.selectedHeroes.includes(h.name))
  if (selected.length === 0) return {}

  // 预计算统计数据
  const levelStats = levels.map(lvl => {
    const values = selected.map(hero => props.valueGetter(hero, lvl))
    return {
      level: lvl,
      max: Math.max(...values),
      min: Math.min(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    }
  })

  const series = selected.map(hero => {
    const data = levels.map(lvl => ({
      value: props.valueGetter(hero, lvl),
      heroName: hero.name,
      level: lvl
    }))
    return {
      name: hero.name,
      type: 'line',
      smooth: true,
      data: data,
      itemStyle: { color: ATTRIBUTE_COLORS[hero.primaryAttribute] },
      showSymbol: selected.length <= 10,
      emphasis: {
        focus: 'series',
        lineStyle: { width: 4 }
      }
    }
  })

  const showLegend = selected.length <= 10

  return {
    title: {
      text: `${props.title}（${selected.length}个英雄）`,
      left: 'center',
      textStyle: { color: '#c9a227', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return ''
        const lvl = params[0].data.level
        const stats = levelStats[lvl - 1]

        if (showLegend && params.length <= 5) {
          let html = `<strong>${lvl}级</strong><br/>`
          params.forEach((p: any) => {
            const val = typeof p.value === 'object' ? p.value.value : p.value
            html += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${val.toFixed(1)}</strong><br/>`
          })
          return html
        } else {
          return `<strong>${lvl}级 统计数据</strong><br/>
            最高: <span style="color:#27ae60;font-weight:600">${stats.max.toFixed(1)}</span><br/>
            最低: <span style="color:#e74c3c;font-weight:600">${stats.min.toFixed(1)}</span><br/>
            平均: <span style="color:#3498db;font-weight:600">${stats.avg.toFixed(1)}</span>`
        }
      }
    },
    legend: showLegend
      ? { data: selected.map(h => h.name), bottom: 10, textStyle: { color: '#2c3e50' } }
      : { show: false },
    grid: { bottom: showLegend ? 80 : 40, left: '3%', right: '4%', containLabel: true },
    xAxis: {
      type: 'category',
      name: '等级',
      data: levels,
      axisLabel: { color: '#2c3e50' }
    },
    yAxis: {
      type: 'value',
      name: props.yAxisName,
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: series
  }
})

const hasData = computed(() => props.selectedHeroes.length > 0)
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
        请选择英雄进行对比
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
