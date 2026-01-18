<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const rangeCounts: Record<number, number> = {}
  props.heroes.forEach(hero => {
    const range = hero.attackRange || 0
    rangeCounts[range] = (rangeCounts[range] || 0) + 1
  })

  const ranges = Object.keys(rangeCounts).map(Number).sort((a, b) => a - b)
  const counts = ranges.map(r => rangeCounts[r])

  return {
    title: { text: '攻击距离分布', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}个英雄' },
    xAxis: {
      type: 'category',
      name: '攻击距离',
      data: ranges,
      axisLabel: { color: '#2c3e50', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      name: '英雄数量',
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: [{
      type: 'bar',
      data: counts.map((c, i) => ({
        value: c,
        itemStyle: { color: ranges[i] <= 200 ? '#e74c3c' : '#3498db' }
      }))
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
