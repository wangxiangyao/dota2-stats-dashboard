/**
 * ECharts 插件配置
 * 使用 .client.ts 后缀确保只在客户端加载
 */

import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  ScatterChart,
  LineChart,
  BarChart,
  PieChart,
  BoxplotChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  ScatterChart,
  LineChart,
  BarChart,
  PieChart,
  BoxplotChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent
])

export default defineNuxtPlugin((nuxtApp) => {
  // 全局注册 VChart 组件
  nuxtApp.vueApp.component('VChart', VChart)
})
