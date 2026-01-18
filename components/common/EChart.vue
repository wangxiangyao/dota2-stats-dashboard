<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const props = defineProps<{
  option: Record<string, any>
  height?: string
}>()

// 动态导入 vue-echarts，只在客户端加载
const VChart = defineAsyncComponent(() => import('vue-echarts'))
</script>

<template>
  <ClientOnly>
    <VChart
      v-if="option && Object.keys(option).length > 0"
      :option="option"
      autoresize
      :style="{ width: '100%', height: height || '400px' }"
    />
    <template #fallback>
      <div :style="{ height: height || '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0a0a0' }">
        图表加载中...
      </div>
    </template>
  </ClientOnly>
</template>
