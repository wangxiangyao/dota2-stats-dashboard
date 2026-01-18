<script setup lang="ts">
// VChart 已全局注册
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

  const createSeriesData = (heroes: Hero[]) => {
    return heroes.map(h => ({
      value: [h.baseStrength, h.baseAgility],
      hero: h
    }))
  }

  return {
    title: {
      text: '英雄三维属性分布',
      left: 'center',
      textStyle: { color: '#c9a227' }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const hero = params.data.hero
        if (!hero) return ''
        return `<strong>${hero.localizedName || hero.name}</strong><br/>
                力量: ${hero.baseStrength}<br/>
                敏捷: ${hero.baseAgility}<br/>
                智力: ${hero.baseIntelligence}`
      }
    },
    legend: {
      data: ['力量英雄', '敏捷英雄', '智力英雄', '全能英雄'],
      bottom: 10,
      textStyle: { color: '#2c3e50' }
    },
    xAxis: {
      name: '力量',
      nameTextStyle: { color: ATTRIBUTE_COLORS.strength },
      axisLabel: { color: '#2c3e50' }
    },
    yAxis: {
      name: '敏捷',
      nameTextStyle: { color: ATTRIBUTE_COLORS.agility },
      axisLabel: { color: '#2c3e50' }
    },
    series: [
      {
        name: '力量英雄',
        type: 'scatter',
        data: createSeriesData(strengthHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.strength },
        symbolSize: 12
      },
      {
        name: '敏捷英雄',
        type: 'scatter',
        data: createSeriesData(agilityHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.agility },
        symbolSize: 12
      },
      {
        name: '智力英雄',
        type: 'scatter',
        data: createSeriesData(intelligenceHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.intelligence },
        symbolSize: 12
      },
      {
        name: '全能英雄',
        type: 'scatter',
        data: createSeriesData(universalHeroes),
        itemStyle: { color: ATTRIBUTE_COLORS.universal },
        symbolSize: 12
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
        style="width: 100%; height: 400px;"
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
  min-height: 400px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #a0a0a0;
  font-size: 1rem;
}
</style>
