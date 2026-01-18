<script setup lang="ts">
// VChart 已全局注册
import type { Hero } from '~/types/dota'
import { ATTRIBUTE_COLORS } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  level: number
  getPhysicalEHP: (hero: Hero, level: number) => number
  getDPS: (hero: Hero, level: number) => number
}>()

// 根据主属性获取颜色
const getHeroColor = (hero: Hero) => {
  return ATTRIBUTE_COLORS[hero.primaryAttribute] || ATTRIBUTE_COLORS.universal
}

// 计算统计数据
const stats = computed(() => {
  if (!props.heroes || props.heroes.length === 0) return null

  const heroData = props.heroes.map(hero => ({
    hero,
    name: hero.localizedName || hero.name,
    physicalEHP: props.getPhysicalEHP(hero, props.level),
    dps: props.getDPS(hero, props.level),
    color: getHeroColor(hero)
  }))

  // 计算平均值
  const avgEHP = heroData.reduce((sum, h) => sum + h.physicalEHP, 0) / heroData.length
  const avgDPS = heroData.reduce((sum, h) => sum + h.dps, 0) / heroData.length

  // 计算每个英雄的生存时间和击杀时间
  const ttkData = heroData.map(h => ({
    ...h,
    // 生存时间：该英雄被平均DPS击杀需要多久
    survivalTime: h.physicalEHP / avgDPS,
    // 击杀时间：该英雄击杀平均EHP目标需要多久
    killTime: avgEHP / h.dps
  }))

  return {
    heroData: ttkData,
    avgEHP,
    avgDPS
  }
})

// 生存时间排行榜配置（越长越肉）
const survivalChartOption = computed(() => {
  if (!stats.value) return {}

  const sorted = [...stats.value.heroData].sort((a, b) => b.survivalTime - a.survivalTime)

  return {
    title: {
      text: '生存时间排行（被平均DPS击杀）',
      subtext: `平均DPS: ${stats.value.avgDPS.toFixed(1)}`,
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex
        const h = sorted[idx]
        return `<strong>${h.name}</strong><br/>
                生存时间: ${h.survivalTime.toFixed(1)}秒<br/>
                物理EHP: ${h.physicalEHP.toFixed(0)}<br/>
                自身DPS: ${h.dps.toFixed(1)}`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(h => h.name),
      axisLabel: { rotate: 45, color: '#7f8c8d', fontSize: 10, interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: '生存时间(秒)',
      axisLabel: { color: '#7f8c8d' }
    },
    dataZoom: [{ type: 'slider', show: true, start: 0, end: 100, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(h => ({
        value: h.survivalTime,
        itemStyle: { color: h.color }
      })),
      barMaxWidth: 20
    }]
  }
})

// 击杀时间排行榜配置（越短输出越高）
const killTimeChartOption = computed(() => {
  if (!stats.value) return {}

  const sorted = [...stats.value.heroData].sort((a, b) => a.killTime - b.killTime)

  return {
    title: {
      text: '击杀时间排行（击杀平均EHP目标）',
      subtext: `平均物理EHP: ${stats.value.avgEHP.toFixed(0)}`,
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex
        const h = sorted[idx]
        return `<strong>${h.name}</strong><br/>
                击杀时间: ${h.killTime.toFixed(1)}秒<br/>
                自身DPS: ${h.dps.toFixed(1)}<br/>
                物理EHP: ${h.physicalEHP.toFixed(0)}`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(h => h.name),
      axisLabel: { rotate: 45, color: '#7f8c8d', fontSize: 10, interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: '击杀时间(秒)',
      axisLabel: { color: '#7f8c8d' }
    },
    dataZoom: [{ type: 'slider', show: true, start: 0, end: 100, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(h => ({
        value: h.killTime,
        itemStyle: { color: h.color }
      })),
      barMaxWidth: 20
    }]
  }
})

// TTK 散点图配置（X轴生存时间，Y轴击杀时间）
const scatterChartOption = computed(() => {
  if (!stats.value) return {}

  const data = stats.value.heroData

  // 按主属性分组
  const strengthData = data.filter(h => h.hero.primaryAttribute === 'strength')
  const agilityData = data.filter(h => h.hero.primaryAttribute === 'agility')
  const intelligenceData = data.filter(h => h.hero.primaryAttribute === 'intelligence')
  const universalData = data.filter(h => h.hero.primaryAttribute === 'universal')

  const createSeriesData = (heroes: typeof data) => heroes.map(h => ({
    name: h.name,
    value: [h.survivalTime, h.killTime],
    hero: h
  }))

  return {
    title: {
      text: '生存时间 vs 击杀时间',
      subtext: '右下角=坦克(能抗能打) | 左上角=脆皮(脆但输出低)',
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const h = p.data.hero
        return `<strong>${h.name}</strong><br/>
                生存时间: ${h.survivalTime.toFixed(1)}秒<br/>
                击杀时间: ${h.killTime.toFixed(1)}秒<br/>
                物理EHP: ${h.physicalEHP.toFixed(0)}<br/>
                DPS: ${h.dps.toFixed(1)}`
      }
    },
    legend: {
      data: ['力量', '敏捷', '智力', '全能'],
      bottom: 10,
      textStyle: { color: '#2c3e50' }
    },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '18%' },
    xAxis: {
      name: '生存时间(秒)',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    yAxis: {
      name: '击杀时间(秒)',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: { color: '#2c3e50' },
      splitLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: [
      { name: '力量', type: 'scatter', data: createSeriesData(strengthData), symbolSize: 12, itemStyle: { color: ATTRIBUTE_COLORS.strength } },
      { name: '敏捷', type: 'scatter', data: createSeriesData(agilityData), symbolSize: 12, itemStyle: { color: ATTRIBUTE_COLORS.agility } },
      { name: '智力', type: 'scatter', data: createSeriesData(intelligenceData), symbolSize: 12, itemStyle: { color: ATTRIBUTE_COLORS.intelligence } },
      { name: '全能', type: 'scatter', data: createSeriesData(universalData), symbolSize: 12, itemStyle: { color: ATTRIBUTE_COLORS.universal } }
    ]
  }
})

const hasData = computed(() => props.heroes && props.heroes.length > 0)
</script>

<template>
  <div class="ttk-analysis">
    <!-- 散点图 -->
    <div class="chart-container">
      <ClientOnly>
        <VChart
          v-if="hasData"
          :option="scatterChartOption"
          autoresize
          style="width: 100%; height: 500px;"
        />
      </ClientOnly>
    </div>

    <!-- 两个排行榜并排 -->
    <div class="charts-row">
      <div class="chart-half">
        <ClientOnly>
          <VChart
            v-if="hasData"
            :option="survivalChartOption"
            autoresize
            style="width: 100%; height: 450px;"
          />
        </ClientOnly>
      </div>
      <div class="chart-half">
        <ClientOnly>
          <VChart
            v-if="hasData"
            :option="killTimeChartOption"
            autoresize
            style="width: 100%; height: 450px;"
          />
        </ClientOnly>
      </div>
    </div>

    <!-- 统计摘要 -->
    <div v-if="stats" class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">平均物理EHP</span>
        <span class="stat-value">{{ stats.avgEHP.toFixed(0) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">平均DPS</span>
        <span class="stat-value">{{ stats.avgDPS.toFixed(1) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">平均生存时间</span>
        <span class="stat-value">{{ (stats.avgEHP / stats.avgDPS).toFixed(1) }}秒</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ttk-analysis {
  width: 100%;
}

.chart-container {
  margin-bottom: 2rem;
}

.charts-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.chart-half {
  flex: 1;
  min-width: 0;
}

@media (max-width: 1200px) {
  .charts-row {
    flex-direction: column;
  }
}

.stats-summary {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 0.3rem;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}
</style>
