<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const batCounts: Record<number, number> = {}
  props.heroes.forEach(hero => {
    const bat = hero.attackRate || 1.7
    batCounts[bat] = (batCounts[bat] || 0) + 1
  })

  const data = Object.entries(batCounts)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([bat, count]) => ({ name: bat, value: count }))

  return {
    title: { text: '基础攻击间隔（BAT）分布', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: { trigger: 'item', formatter: '{b}秒: {c}个英雄' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name + 's'),
      axisLabel: { color: '#2c3e50' }
    },
    yAxis: {
      type: 'value',
      name: '英雄数量',
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: { color: '#3498db' }
    }]
  }
})

const hasData = computed(() => props.heroes && props.heroes.length > 0)
</script>

<template>
  <ClientOnly>
    <VChart v-if="hasData" :option="option" autoresize style="width: 100%; height: 400px;" />
    <div v-else style="height: 400px; display: flex; align-items: center; justify-content: center; color: #a0a0a0;">
      数据加载中...
    </div>
  </ClientOnly>
</template>
