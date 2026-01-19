<script setup lang="ts">
interface ScatterPoint {
  name: string
  x: number
  y: number
  color?: string
  size?: number
}

interface ScatterSeries {
  name: string
  points: ScatterPoint[]
  color?: string
}

const props = defineProps<{
  data: ScatterSeries | ScatterSeries[]
  xAxisName: string
  yAxisName: string
  title: string
  showTrendLine?: boolean
  height?: string
}>()

// 计算趋势线 (简单线性回归)
const calculateTrendLine = (points: ScatterPoint[]) => {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, start: 0, end: 0 }

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumXX += p.x * p.x
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))

  return {
    slope,
    intercept,
    start: slope * minX + intercept,
    end: slope * maxX + intercept
  }
}

// 图表配置
const option = computed(() => {
  const dataArray = Array.isArray(props.data) ? props.data : [props.data]
  if (dataArray.length === 0 || dataArray[0].points.length === 0) {
    return {}
  }

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  const series: any[] = []
  const legends: string[] = []

  dataArray.forEach((dataset, index) => {
    const color = dataset.color || colors[index % colors.length]

    // 散点数据
    series.push({
      name: dataset.name,
      type: 'scatter',
      data: dataset.points.map(p => ({
        name: p.name,
        value: [p.x, p.y],
        itemStyle: { color: p.color || color },
        symbolSize: p.size || 8
      })),
      itemStyle: {
        opacity: 0.7
      },
      emphasis: {
        itemStyle: {
          borderColor: '#333',
          borderWidth: 1,
          opacity: 1
        }
      }
    })

    // 趋势线
    if (props.showTrendLine && dataset.points.length >= 2) {
      const trendLine = calculateTrendLine(dataset.points)
      series.push({
        name: `${dataset.name}趋势`,
        type: 'line',
        data: [
          [dataset.points.find(p => p.x === Math.min(...dataset.points.map(p => p.x)))?.x || 0, trendLine.start],
          [dataset.points.find(p => p.x === Math.max(...dataset.points.map(p => p.x)))?.x || 0, trendLine.end]
        ],
        lineStyle: {
          type: 'solid',
          width: 2,
          color
        },
        showSymbol: false,
        z: 10
      })
    }

    legends.push(dataset.name)
    if (props.showTrendLine) {
      legends.push(`${dataset.name}趋势`)
    }
  })

  // 计算所有点的范围
  const allPoints = dataArray.flatMap(d => d.points)
  const xMin = Math.min(...allPoints.map(p => p.x))
  const xMax = Math.max(...allPoints.map(p => p.x))
  const yMin = Math.min(...allPoints.map(p => p.y))
  const yMax = Math.max(...allPoints.map(p => p.y))

  return {
    title: {
      text: props.title,
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.componentSubType === 'scatter') {
          const point = allPoints[params.dataIndex]
          return `<strong>${params.data.name}</strong><br/>
                  ${props.xAxisName}: ${params.data.value[0].toFixed(1)}<br/>
                  ${props.yAxisName}: ${params.data.value[1].toFixed(1)}`
        }
        return `${params.seriesName}<br/>${props.yAxisName}: ${params.data.value[1].toFixed(1)}`
      }
    },
    legend: {
      show: dataArray.length > 1,
      data: legends,
      top: 30
    },
    grid: {
      left: '10%',
      right: '5%',
      bottom: '15%',
      top: dataArray.length > 1 ? 60 : 50,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: props.xAxisName,
      nameLocation: 'middle',
      nameGap: 25,
      nameTextStyle: { color: '#7f8c8d' },
      axisLabel: { color: '#7f8c8d' },
      axisLine: { lineStyle: { color: '#dfe6e9' } },
      splitLine: { lineStyle: { color: '#f1f2f6', type: 'dashed' } },
      scale: true
    },
    yAxis: {
      type: 'value',
      name: props.yAxisName,
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: '#7f8c8d' },
      axisLabel: { color: '#7f8c8d' },
      axisLine: { lineStyle: { color: '#dfe6e9' } },
      splitLine: { lineStyle: { color: '#f1f2f6' } },
      scale: true
    },
    series
  }
})

const hasData = computed(() => {
  const dataArray = Array.isArray(props.data) ? props.data : [props.data]
  return dataArray.length > 0 && dataArray[0].points.length > 0
})
</script>

<template>
  <div class="chart-wrapper">
    <ClientOnly>
      <VChart
        v-if="hasData"
        :option="option"
        autoresize
        :style="{ width: '100%', height: height || '450px' }"
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
  min-height: 450px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 450px;
  color: #a0a0a0;
}
</style>
