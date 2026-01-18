<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
}>()

const option = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return {}

  const counts = { strength: 0, agility: 0, intelligence: 0, universal: 0 }
  props.heroes.forEach(hero => {
    const attr = hero.primaryAttribute
    if (counts[attr] !== undefined) counts[attr]++
  })

  return {
    title: { text: '主属性类型分布', left: 'center', textStyle: { color: '#c9a227' } },
    tooltip: { trigger: 'item', formatter: '{b}: {c}个 ({d}%)' },
    legend: { bottom: 10, textStyle: { color: '#2c3e50' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: counts.strength, name: '力量英雄', itemStyle: { color: ATTRIBUTE_COLORS.strength } },
        { value: counts.agility, name: '敏捷英雄', itemStyle: { color: ATTRIBUTE_COLORS.agility } },
        { value: counts.intelligence, name: '智力英雄', itemStyle: { color: ATTRIBUTE_COLORS.intelligence } },
        { value: counts.universal, name: '全能英雄', itemStyle: { color: ATTRIBUTE_COLORS.universal } }
      ],
      label: { formatter: '{b}\n{c}个' }
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
