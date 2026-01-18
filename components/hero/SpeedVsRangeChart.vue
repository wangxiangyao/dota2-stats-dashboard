<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const meleeData = props.heroes
    .filter(h => h.attackType === 'melee')
    .map(h => ({
      name: h.name,
      value: [h.attackRange || 150, h.moveSpeed || 300]
    }))

  const rangedData = props.heroes
    .filter(h => h.attackType === 'ranged')
    .map(h => ({
      name: h.name,
      value: [h.attackRange || 550, h.moveSpeed || 300]
    }))

  return {
    title: { text: '移动速度 vs 攻击距离', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `${p.data.name}<br/>攻击距离: ${p.data.value[0]}<br/>移动速度: ${p.data.value[1]}`
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
      { name: '近战', type: 'scatter', data: meleeData, symbolSize: 10, itemStyle: { color: '#e74c3c' } },
      { name: '远程', type: 'scatter', data: rangedData, symbolSize: 10, itemStyle: { color: '#3498db' } }
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
