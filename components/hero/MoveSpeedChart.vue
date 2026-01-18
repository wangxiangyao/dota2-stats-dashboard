<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const sorted = [...props.heroes].sort((a, b) => (a.moveSpeed || 0) - (b.moveSpeed || 0))

  return {
    title: { text: '移动速度分布', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const hero = sorted[params[0].dataIndex]
        return `${hero.name}<br/>移动速度: ${hero.moveSpeed}`
      }
    },
    xAxis: {
      type: 'category',
      data: sorted.map(h => h.name),
      axisLabel: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '移动速度',
      min: 270,
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    dataZoom: [{ type: 'slider', start: 0, end: 100 }],
    series: [{
      type: 'bar',
      data: sorted.map(h => ({
        value: h.moveSpeed || 0,
        itemStyle: { color: h.attackType === 'melee' ? '#e74c3c' : '#3498db' }
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
