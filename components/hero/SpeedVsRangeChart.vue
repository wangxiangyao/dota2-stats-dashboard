<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

// 聚合相同坐标的英雄
const aggregateByCoord = (heroes: Hero[]) => {
  const coordMap = new Map<string, Hero[]>()

  heroes.forEach(h => {
    const range = h.attackRange || 150
    const speed = h.moveSpeed || 300
    const key = `${range},${speed}`

    if (!coordMap.has(key)) {
      coordMap.set(key, [])
    }
    coordMap.get(key)!.push(h)
  })

  return Array.from(coordMap.entries()).map(([key, heroList]) => {
    const [range, speed] = key.split(',').map(Number)
    return {
      heroes: heroList,
      names: heroList.map(h => h.localizedName || h.name),
      count: heroList.length,
      value: [range, speed]
    }
  })
}

// 根据数量获取点大小
const getSymbolSize = (count: number) => {
  if (count === 1) return 12
  if (count <= 3) return 18
  if (count <= 6) return 24
  return 30
}

// 根据数量获取颜色深度
const getMeleeColor = (count: number) => {
  if (count === 1) return '#e74c3c'
  if (count <= 3) return '#c0392b'
  return '#922b21'
}

const getRangedColor = (count: number) => {
  if (count === 1) return '#3498db'
  if (count <= 3) return '#2980b9'
  return '#1a5276'
}

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const meleeHeroes = props.heroes.filter(h => h.attackType === 'melee')
  const rangedHeroes = props.heroes.filter(h => h.attackType === 'ranged')

  const meleeAggregated = aggregateByCoord(meleeHeroes)
  const rangedAggregated = aggregateByCoord(rangedHeroes)

  const meleeData = meleeAggregated.map(d => ({
    ...d,
    symbolSize: getSymbolSize(d.count),
    itemStyle: { color: getMeleeColor(d.count) }
  }))

  const rangedData = rangedAggregated.map(d => ({
    ...d,
    symbolSize: getSymbolSize(d.count),
    itemStyle: { color: getRangedColor(d.count) }
  }))

  return {
    title: { text: '移动速度 vs 攻击距离', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const d = p.data
        const heroListHtml = d.heroes.map((hero: Hero) => {
          const color = ATTRIBUTE_COLORS[hero.primaryAttribute] || ATTRIBUTE_COLORS.universal
          const name = hero.localizedName || hero.name
          return `<span style="color:${color}">●</span> ${name}`
        }).join('<br/>')

        if (d.count === 1) {
          const hero = d.heroes[0]
          const color = ATTRIBUTE_COLORS[hero.primaryAttribute] || ATTRIBUTE_COLORS.universal
          return `<span style="color:${color}">●</span> <strong>${d.names[0]}</strong><br/>攻击距离: ${d.value[0]}<br/>移动速度: ${d.value[1]}`
        }
        return `<strong>共 ${d.count} 个英雄</strong><br/>攻击距离: ${d.value[0]} | 移动速度: ${d.value[1]}<br/><br/>${heroListHtml}`
      }
    },
    legend: { data: ['近战', '远程'], bottom: 10, textStyle: { color: '#2c3e50' } },
    xAxis: {
      name: '攻击距离',
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    yAxis: {
      name: '移动速度',
      min: 270,
      max: 340,
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: [
      {
        name: '近战',
        type: 'scatter',
        data: meleeData,
        symbolSize: (data: any) => data.symbolSize,
        itemStyle: { color: '#e74c3c' },
        label: {
          show: true,
          formatter: (p: any) => p.data.count > 1 ? p.data.count : '',
          position: 'inside',
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold'
        }
      },
      {
        name: '远程',
        type: 'scatter',
        data: rangedData,
        symbolSize: (data: any) => data.symbolSize,
        itemStyle: { color: '#3498db' },
        label: {
          show: true,
          formatter: (p: any) => p.data.count > 1 ? p.data.count : '',
          position: 'inside',
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold'
        }
      }
    ]
  }
})

const hasData = computed(() => props.heroes && props.heroes.length > 0)
</script>

<template>
  <ClientOnly>
    <VChart v-if="hasData" :option="option" autoresize style="width: 100%; height: 500px;" />
    <div v-else style="height: 500px; display: flex; align-items: center; justify-content: center; color: #a0a0a0;">
      数据加载中...
    </div>
  </ClientOnly>
</template>
