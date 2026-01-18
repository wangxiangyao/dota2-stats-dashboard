<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const melee = props.heroes.filter(h => h.attackType === 'melee')
  const ranged = props.heroes.filter(h => h.attackType === 'ranged')

  const avg = (arr: Hero[], key: keyof Hero) => {
    const values = arr.map(h => (h[key] as number) || 0)
    return values.reduce((sum, v) => sum + v, 0) / arr.length
  }

  const metrics = [
    { name: '基础攻击力', melee: avg(melee, 'baseAttackMin'), ranged: avg(ranged, 'baseAttackMin') },
    { name: '基础护甲', melee: avg(melee, 'baseArmor'), ranged: avg(ranged, 'baseArmor') },
    { name: '基础力量', melee: avg(melee, 'baseStrength'), ranged: avg(ranged, 'baseStrength') },
    { name: '移动速度', melee: avg(melee, 'moveSpeed'), ranged: avg(ranged, 'moveSpeed') },
    { name: '力量成长', melee: avg(melee, 'strengthGain'), ranged: avg(ranged, 'strengthGain') }
  ]

  return {
    title: { text: '近战 vs 远程 平均数值对比', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['近战英雄', '远程英雄'], bottom: 10, textStyle: { color: '#2c3e50' } },
    xAxis: {
      type: 'category',
      data: metrics.map(m => m.name),
      axisLabel: { color: '#2c3e50' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: [
      { name: '近战英雄', type: 'bar', data: metrics.map(m => m.melee.toFixed(1)), itemStyle: { color: '#e74c3c' } },
      { name: '远程英雄', type: 'bar', data: metrics.map(m => m.ranged.toFixed(1)), itemStyle: { color: '#3498db' } }
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
