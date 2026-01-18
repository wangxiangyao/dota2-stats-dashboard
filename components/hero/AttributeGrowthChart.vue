<script setup lang="ts">
// 属性成长散点图：X轴力量成长，Y轴敏捷成长，点大小表示智力成长
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

// 图表配置
const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) {
    return {}
  }

  // 按主属性分组
  const strengthHeroes = props.heroes.filter(h => h.primaryAttribute === 'strength')
  const agilityHeroes = props.heroes.filter(h => h.primaryAttribute === 'agility')
  const intelligenceHeroes = props.heroes.filter(h => h.primaryAttribute === 'intelligence')
  const universalHeroes = props.heroes.filter(h => h.primaryAttribute === 'universal')

  // 计算智力成长的范围，用于映射点的大小
  const allIntGains = props.heroes.map(h => h.intelligenceGain)
  const minIntGain = Math.min(...allIntGains)
  const maxIntGain = Math.max(...allIntGains)
  
  // 将智力成长映射到点大小（8-24之间）
  const mapToSize = (intGain: number) => {
    const normalized = (intGain - minIntGain) / (maxIntGain - minIntGain || 1)
    return 8 + normalized * 16
  }

  const createSeriesData = (heroes: Hero[]) => {
    return heroes.map(h => ({
      value: [h.strengthGain, h.agilityGain],
      symbolSize: mapToSize(h.intelligenceGain),
      hero: h
    }))
  }

  return {
    title: {
      text: '英雄属性成长分布',
      subtext: '点大小表示智力成长',
      left: 'center',
      textStyle: { color: '#c9a227' }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const hero = params.data.hero
        if (!hero) return ''
        const totalGain = hero.strengthGain + hero.agilityGain + hero.intelligenceGain
        return `<strong>${hero.name}</strong><br/>
                力量成长: <span style="color:${ATTRIBUTE_COLORS.strength}">${hero.strengthGain.toFixed(1)}</span><br/>
                敏捷成长: <span style="color:${ATTRIBUTE_COLORS.agility}">${hero.agilityGain.toFixed(1)}</span><br/>
                智力成长: <span style="color:${ATTRIBUTE_COLORS.intelligence}">${hero.intelligenceGain.toFixed(1)}</span><br/>
                <em>总成长: ${totalGain.toFixed(1)}</em>`
      }
    },
    legend: {
      data: ['力量英雄', '敏捷英雄', '智力英雄', '全能英雄'],
      bottom: 10,
      textStyle: { color: '#2c3e50' }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%'
    },
    xAxis: {
      name: '力量成长',
      nameLocation: 'center',
      nameGap: 30,
      nameTextStyle: { color: ATTRIBUTE_COLORS.strength, fontWeight: 'bold' },
      axisLabel: { color: '#2c3e50' },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
    },
    yAxis: {
      name: '敏捷成长',
      nameLocation: 'center',
      nameGap: 40,
      nameTextStyle: { color: ATTRIBUTE_COLORS.agility, fontWeight: 'bold' },
      axisLabel: { color: '#2c3e50' },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
    },
    series: [
      {
        name: '力量英雄',
        type: 'scatter',
        data: createSeriesData(strengthHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.strength, opacity: 0.8 }
      },
      {
        name: '敏捷英雄',
        type: 'scatter',
        data: createSeriesData(agilityHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.agility, opacity: 0.8 }
      },
      {
        name: '智力英雄',
        type: 'scatter',
        data: createSeriesData(intelligenceHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.intelligence, opacity: 0.8 }
      },
      {
        name: '全能英雄',
        type: 'scatter',
        data: createSeriesData(universalHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.universal, opacity: 0.8 }
      }
    ]
  }
})

// 是否有数据
const hasData = computed(() => props.heroes && props.heroes.length > 0)
</script>

<template>
  <div class="chart-wrapper">
    <ClientOnly>
      <VChart
        v-if="hasData"
        :option="option"
        autoresize
        style="width: 100%; height: 450px;"
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
  min-height: 450px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 450px;
  color: #a0a0a0;
  font-size: 1rem;
}
</style>
