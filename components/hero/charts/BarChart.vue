<script setup lang="ts">
// VChart 已在 plugins/echarts.client.ts 中全局注册
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  level: number
  valueGetter: (hero: Hero, level: number) => number
  title: string
  unit?: string
  includeBonus?: boolean
}>()

const { calculateHP, calculateArmor, calculateMagicResistance, calculatePhysicalEHP, calculateMagicalEHP, calculateDamage, calculateDPS } = useHeroCalculator()

// 根据主属性获取颜色
const getHeroColor = (hero: Hero) => {
  return ATTRIBUTE_COLORS[hero.primaryAttribute] || ATTRIBUTE_COLORS.universal
}

// 图表配置
const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) {
    return {}
  }

  // 计算每个英雄的数值并排序
  const heroData = props.heroes
    .map(hero => ({
      hero,
      value: props.valueGetter(hero, props.level),
      color: getHeroColor(hero)
    }))
    .sort((a, b) => b.value - a.value)

  return {
    title: {
      text: props.title,
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0]
        const hero = heroData[data.dataIndex].hero
        const unit = props.unit || ''
        return `<strong>${hero.localizedName || hero.name}</strong><br/>
                ${data.value.toFixed(1)}${unit}`
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
      data: heroData.map(d => d.hero.localizedName || d.hero.name),
      axisLabel: {
        rotate: 45,
        color: '#7f8c8d',
        fontSize: 10,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
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
      type: 'bar',
      data: heroData.map(d => ({
        value: d.value,
        itemStyle: { color: d.color }
      })),
      barMaxWidth: 20
    }]
  }
})

const hasData = computed(() => props.heroes && props.heroes.length > 0)
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
