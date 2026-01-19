<script setup lang="ts">
interface HistogramData {
  name: string
  values: number[]
  color?: string
}

interface PercentileMarkers {
  p25?: number
  p50?: number
  p75?: number
}

const props = defineProps<{
  data: HistogramData | HistogramData[]
  title: string
  binCount?: number
  showPercentiles?: boolean
  height?: string
}>()

// 计算分位数
const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

// 计算中位数
const calculateMedian = (values: number[]): number => {
  return calculatePercentile(values, 50)
}

// 计算直方图分箱数据
const calculateBins = (values: number[], binCount: number) => {
  if (values.length === 0) return { bins: [], intervals: [] }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const binSize = range / binCount || 1

  const bins = new Array(binCount).fill(0)
  const intervals: string[] = []

  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binSize
    const binEnd = min + (i + 1) * binSize
    intervals.push(`${binStart.toFixed(0)}-${binEnd.toFixed(0)}`)

    // 统计落入该区间的数值
    for (const value of values) {
      if (value >= binStart && (i === binCount - 1 ? value <= binEnd : value < binEnd)) {
        bins[i]++
      }
    }
  }

  return { bins, intervals }
}

// 图表配置
const option = computed(() => {
  const dataArray = Array.isArray(props.data) ? props.data : [props.data]
  if (dataArray.length === 0 || dataArray[0].values.length === 0) {
    return {}
  }

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  const binCount = props.binCount || 20
  const series: any[] = []
  const legends: string[] = []

  dataArray.forEach((dataset, index) => {
    const { bins, intervals } = calculateBins(dataset.values, binCount)

    series.push({
      name: dataset.name,
      type: 'bar',
      data: bins,
      itemStyle: {
        color: dataset.color || colors[index % colors.length],
        borderRadius: [2, 2, 0, 0]
      },
      barGap: '0%'
    })

    legends.push(dataset.name)
  })

  // 计算第一个数据集的分位数标记
  let markLine: any = undefined
  if (props.showPercentiles && !Array.isArray(props.data)) {
    const values = props.data.values
    const p25 = calculatePercentile(values, 25)
    const p50 = calculateMedian(values)
    const p75 = calculatePercentile(values, 75)

    markLine = {
      silent: true,
      symbol: 'none',
      lineStyle: { type: 'dashed', width: 1 },
      label: { show: true, position: 'end' },
      data: [
        { yAxis: p25, label: { formatter: '25%分位' }, lineStyle: { color: '#ff7875' } },
        { yAxis: p50, label: { formatter: '中位数' }, lineStyle: { color: '#ff9c6e' } },
        { yAxis: p75, label: { formatter: '75%分位' }, lineStyle: { color: '#ffc069' } }
      ]
    }
  }

  const { intervals } = calculateBins(dataArray[0].values, binCount)

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
        if (Array.isArray(params)) {
          const result = [`区间: ${params[0].name}<br/>`]
          params.forEach((p: any) => {
            result.push(`${p.seriesName}: ${p.value} 个技能<br/>`)
          })
          return result.join('')
        }
        return `${params.name}<br/>${params.seriesName}: ${params.value} 个技能`
      }
    },
    legend: {
      show: dataArray.length > 1,
      data: legends,
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: dataArray.length > 1 ? 60 : 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: intervals,
      axisLabel: {
        color: '#7f8c8d',
        fontSize: 10,
        rotate: 45,
        interval: 'auto'
      },
      axisLine: { lineStyle: { color: '#dfe6e9' } }
    },
    yAxis: {
      type: 'value',
      name: '技能数量',
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    series: markLine ? [...series.map(s => ({ ...s, markLine }))] : series
  }
})

const hasData = computed(() => {
  const dataArray = Array.isArray(props.data) ? props.data : [props.data]
  return dataArray.length > 0 && dataArray[0].values.length > 0
})
</script>

<template>
  <div class="chart-wrapper">
    <ClientOnly>
      <VChart
        v-if="hasData"
        :option="option"
        autoresize
        :style="{ width: '100%', height: height || '400px' }"
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
  min-height: 400px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #a0a0a0;
}
</style>
