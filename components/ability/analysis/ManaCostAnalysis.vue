<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner" />
    <span>加载数据中...</span>
  </div>

  <ChartLayout v-else :toc-items="tocItems">
    <!-- 介绍区块 -->
    <div class="intro-section">
      <h3>蓝耗分析</h3>
      <p>分析技能蓝耗分布与蓝耗效率，按大招/普通技能、瞬发/持续分类。蓝耗效率 = 满级伤害 / 满级蓝耗。</p>
    </div>

    <!-- ========== 第一大类：普通技能 ========== -->
    <ChartSection id="mc-normal" title="🎯 普通技能蓝耗" color="blue">
      <!-- 瞬发普通 -->
      <ChartSubSection id="mc-normal-burst" title="瞬发技能" color="blue">
        <ChartLevelSlider v-model="normalBurstLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="normalBurstManaStats" />
        <ChartCard :title="`蓝耗分布 (${normalBurstLevel}级)`">
          <HistogramChart :data="{ name: '瞬发普通技能蓝耗', values: normalBurstManaCosts, color: '#3b82f6' }" title="" :bin-count="15" height="280px" />
        </ChartCard>
        <ChartCard :title="`蓝耗排行 (${normalBurstLevel}级)`">
          <ClientOnly><VChart v-if="normalBurstManaChartOption" :option="normalBurstManaChartOption" autoresize style="width: 100%; height: 380px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="normalBurstDpmStats" />
        <ChartCard :title="`蓝耗效率排行 (${normalBurstLevel}级) - 伤害/蓝耗`">
          <ClientOnly><VChart v-if="normalBurstDpmChartOption" :option="normalBurstDpmChartOption" autoresize style="width: 100%; height: 380px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- 持续普通 -->
      <ChartSubSection id="mc-normal-dot" title="持续技能" color="orange">
        <ChartLevelSlider v-model="normalDotLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="normalDotManaStats" />
        <ChartCard :title="`蓝耗分布 (${normalDotLevel}级)`">
          <HistogramChart :data="{ name: '持续普通技能蓝耗', values: normalDotManaCosts, color: '#f97316' }" title="" :bin-count="12" height="280px" />
        </ChartCard>
        <ChartCard :title="`蓝耗排行 (${normalDotLevel}级)`">
          <ClientOnly><VChart v-if="normalDotManaChartOption" :option="normalDotManaChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="normalDotDpmStats" />
        <ChartCard :title="`蓝耗效率排行 (${normalDotLevel}级) - 伤害/蓝耗`">
          <ClientOnly><VChart v-if="normalDotDpmChartOption" :option="normalDotDpmChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- ========== 第二大类：大招 ========== -->
    <ChartSection id="mc-ultimate" title="💥 大招蓝耗" color="red">
      <!-- 瞬发大招 -->
      <ChartSubSection id="mc-ult-burst" title="瞬发大招" color="red">
        <ChartLevelSlider v-model="ultBurstLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="ultBurstManaStats" />
        <ChartCard :title="`蓝耗分布 (${ultBurstLevel}级)`">
          <HistogramChart :data="{ name: '瞬发大招蓝耗', values: ultBurstManaCosts, color: '#ef4444' }" title="" :bin-count="12" height="280px" />
        </ChartCard>
        <ChartCard :title="`蓝耗排行 (${ultBurstLevel}级)`">
          <ClientOnly><VChart v-if="ultBurstManaChartOption" :option="ultBurstManaChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="ultBurstDpmStats" />
        <ChartCard :title="`蓝耗效率排行 (${ultBurstLevel}级) - 伤害/蓝耗`">
          <ClientOnly><VChart v-if="ultBurstDpmChartOption" :option="ultBurstDpmChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- 持续大招 -->
      <ChartSubSection id="mc-ult-dot" title="持续大招" color="orange">
        <ChartLevelSlider v-model="ultDotLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="ultDotManaStats" />
        <ChartCard :title="`蓝耗分布 (${ultDotLevel}级)`">
          <HistogramChart :data="{ name: '持续大招蓝耗', values: ultDotManaCosts, color: '#dc2626' }" title="" :bin-count="10" height="280px" />
        </ChartCard>
        <ChartCard :title="`蓝耗排行 (${ultDotLevel}级)`">
          <ClientOnly><VChart v-if="ultDotManaChartOption" :option="ultDotManaChartOption" autoresize style="width: 100%; height: 300px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="ultDotDpmStats" />
        <ChartCard :title="`蓝耗效率排行 (${ultDotLevel}级) - 伤害/蓝耗`">
          <ClientOnly><VChart v-if="ultDotDpmChartOption" :option="ultDotDpmChartOption" autoresize style="width: 100%; height: 300px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- 分析结论 -->
    <div class="insight-box">
      <h4>蓝耗对比分析</h4>
      <ul>
        <li>普通技能平均蓝耗：瞬发 {{ normalBurstAvgMana }}，持续 {{ normalDotAvgMana }}</li>
        <li>大招平均蓝耗：瞬发 {{ ultBurstAvgMana }}，持续 {{ ultDotAvgMana }}</li>
        <li>大招平均蓝耗约是普通技能的 <strong>{{ manaRatio }}倍</strong></li>
      </ul>
    </div>
  </ChartLayout>
</template>

<script setup lang="ts">
import type { AbilityDamageInfo } from '~/composables/useAbilityDamageAnalyzer'
import type { TocItem } from '~/components/chart/Layout.vue'
import type { StatItem } from '~/components/chart/StatsGrid.vue'

const props = defineProps<{
  damageList: AbilityDamageInfo[]
  loading: boolean
}>()

const { calculateStats } = useAbilityDamageAnalyzer()

// 目录配置
const tocItems: TocItem[] = [
  { id: 'mc-normal', title: '🎯 普通技能', level: 1 },
  { id: 'mc-normal-burst', title: '瞬发技能', level: 2 },
  { id: 'mc-normal-dot', title: '持续技能', level: 2 },
  { id: 'mc-ultimate', title: '💥 大招', level: 1 },
  { id: 'mc-ult-burst', title: '瞬发大招', level: 2 },
  { id: 'mc-ult-dot', title: '持续大招', level: 2 },
]

// 等级状态
const normalBurstLevel = ref(4)
const normalDotLevel = ref(4)
const ultBurstLevel = ref(3)
const ultDotLevel = ref(3)

// 排除蓝耗无意义的技能（开关类/特殊机制）
const excludedAbilities = [
  '灼热之箭', '灵能陷阱',
  'Searing Arrows', 'Psionic Trap'
]

// 过滤有蓝耗的技能
const filteredList = computed(() => 
  props.damageList.filter(a => 
    a.manaCost > 0 && 
    !excludedAbilities.some(ex => 
      a.displayName?.includes(ex) || a.name?.includes(ex.toLowerCase().replace(/\s+/g, '_'))
    )
  )
)

// 分类
const normalBurst = computed(() => filteredList.value.filter(a => !a.isUltimate && a.isBurst))
const normalDot = computed(() => filteredList.value.filter(a => !a.isUltimate && !a.isBurst))
const ultBurst = computed(() => filteredList.value.filter(a => a.isUltimate && a.isBurst))
const ultDot = computed(() => filteredList.value.filter(a => a.isUltimate && !a.isBurst))

// 获取指定等级的伤害
const getDamageAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (ability.damageAllLevels && ability.damageAllLevels.length > 0) {
    const idx = Math.min(level - 1, ability.damageAllLevels.length - 1)
    return Math.round(ability.damageAllLevels[idx] || ability.damage)
  }
  return Math.round(ability.damage)
}

// 获取指定等级的蓝耗
const getManaAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (ability.manaCostAllLevels && ability.manaCostAllLevels.length > 0) {
    const idx = Math.min(level - 1, ability.manaCostAllLevels.length - 1)
    return ability.manaCostAllLevels[idx] || ability.manaCost
  }
  return ability.manaCost
}

// 提取蓝耗（按当前等级）
const normalBurstManaCosts = computed(() => normalBurst.value.map(a => getManaAtLevel(a, normalBurstLevel.value)).filter(v => v > 0))
const normalDotManaCosts = computed(() => normalDot.value.map(a => getManaAtLevel(a, normalDotLevel.value)).filter(v => v > 0))
const ultBurstManaCosts = computed(() => ultBurst.value.map(a => getManaAtLevel(a, ultBurstLevel.value)).filter(v => v > 0))
const ultDotManaCosts = computed(() => ultDot.value.map(a => getManaAtLevel(a, ultDotLevel.value)).filter(v => v > 0))

// 蓝耗统计
const normalBurstManaCalc = computed(() => calculateStats(normalBurstManaCosts.value))
const normalDotManaCalc = computed(() => calculateStats(normalDotManaCosts.value))
const ultBurstManaCalc = computed(() => calculateStats(ultBurstManaCosts.value))
const ultDotManaCalc = computed(() => calculateStats(ultDotManaCosts.value))

// DPM计算函数 (Damage Per Mana)
const calcDpm = (ability: AbilityDamageInfo, level: number) => {
  const mana = getManaAtLevel(ability, level)
  if (mana <= 0) return 0
  const dmg = getDamageAtLevel(ability, level)
  return Math.round(dmg / mana * 10) / 10
}

// DPM统计
const normalBurstDpmValues = computed(() => normalBurst.value.map(a => calcDpm(a, normalBurstLevel.value)).filter(v => v > 0))
const normalDotDpmValues = computed(() => normalDot.value.map(a => calcDpm(a, normalDotLevel.value)).filter(v => v > 0))
const ultBurstDpmValues = computed(() => ultBurst.value.map(a => calcDpm(a, ultBurstLevel.value)).filter(v => v > 0))
const ultDotDpmValues = computed(() => ultDot.value.map(a => calcDpm(a, ultDotLevel.value)).filter(v => v > 0))

// 效率统计（保留2位小数）
const calcEfficiencyStats = (values: number[]) => {
  if (values.length === 0) return { mean: 0, median: 0, max: 0, min: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return {
    mean: Math.round(sum / values.length * 100) / 100,
    median: Math.round(median * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    min: Math.round(sorted[0] * 100) / 100
  }
}

const normalBurstDpmCalc = computed(() => calcEfficiencyStats(normalBurstDpmValues.value))
const normalDotDpmCalc = computed(() => calcEfficiencyStats(normalDotDpmValues.value))
const ultBurstDpmCalc = computed(() => calcEfficiencyStats(ultBurstDpmValues.value))
const ultDotDpmCalc = computed(() => calcEfficiencyStats(ultDotDpmValues.value))

// 蓝耗统计卡片
const normalBurstManaStats = computed<StatItem[]>(() => [
  { label: '技能数量', value: normalBurst.value.length },
  { label: '平均蓝耗', value: normalBurstManaCalc.value.mean, highlight: true, highlightColor: 'blue' },
  { label: '中位数', value: normalBurstManaCalc.value.median },
  { label: '最高蓝耗', value: normalBurstManaCalc.value.max },
])
const normalDotManaStats = computed<StatItem[]>(() => [
  { label: '技能数量', value: normalDot.value.length },
  { label: '平均蓝耗', value: normalDotManaCalc.value.mean, highlight: true, highlightColor: 'orange' },
  { label: '中位数', value: normalDotManaCalc.value.median },
  { label: '最高蓝耗', value: normalDotManaCalc.value.max },
])
const ultBurstManaStats = computed<StatItem[]>(() => [
  { label: '大招数量', value: ultBurst.value.length },
  { label: '平均蓝耗', value: ultBurstManaCalc.value.mean, highlight: true, highlightColor: 'red' },
  { label: '中位数', value: ultBurstManaCalc.value.median },
  { label: '最高蓝耗', value: ultBurstManaCalc.value.max },
])
const ultDotManaStats = computed<StatItem[]>(() => [
  { label: '大招数量', value: ultDot.value.length },
  { label: '平均蓝耗', value: ultDotManaCalc.value.mean, highlight: true, highlightColor: 'red' },
  { label: '中位数', value: ultDotManaCalc.value.median },
  { label: '最高蓝耗', value: ultDotManaCalc.value.max },
])

// DPM 统计卡片
const normalBurstDpmStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: normalBurstDpmCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: normalBurstDpmCalc.value.median },
  { label: '最高效率', value: normalBurstDpmCalc.value.max },
  { label: '最低效率', value: normalBurstDpmCalc.value.min },
])
const normalDotDpmStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: normalDotDpmCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: normalDotDpmCalc.value.median },
  { label: '最高效率', value: normalDotDpmCalc.value.max },
  { label: '最低效率', value: normalDotDpmCalc.value.min },
])
const ultBurstDpmStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: ultBurstDpmCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: ultBurstDpmCalc.value.median },
  { label: '最高效率', value: ultBurstDpmCalc.value.max },
  { label: '最低效率', value: ultBurstDpmCalc.value.min },
])
const ultDotDpmStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: ultDotDpmCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: ultDotDpmCalc.value.median },
  { label: '最高效率', value: ultDotDpmCalc.value.max },
  { label: '最低效率', value: ultDotDpmCalc.value.min },
])

// 结论数据
const normalBurstAvgMana = computed(() => normalBurstManaCalc.value.mean)
const normalDotAvgMana = computed(() => normalDotManaCalc.value.mean)
const ultBurstAvgMana = computed(() => ultBurstManaCalc.value.mean)
const ultDotAvgMana = computed(() => ultDotManaCalc.value.mean)
const manaRatio = computed(() => {
  const normalAvg = (normalBurstManaCalc.value.mean + normalDotManaCalc.value.mean) / 2
  const ultAvg = (ultBurstManaCalc.value.mean + ultDotManaCalc.value.mean) / 2
  if (normalAvg === 0) return '0'
  return (ultAvg / normalAvg).toFixed(1)
})

// 颜色
const attrColors: Record<string, string> = { strength: '#e74c3c', agility: '#2ecc71', intelligence: '#3498db', universal: '#9b59b6' }
const getAttrColor = (attr: string) => {
  const key = attr.toLowerCase()
  if (key.includes('str')) return attrColors.strength
  if (key.includes('agi')) return attrColors.agility
  if (key.includes('int')) return attrColors.intelligence
  return attrColors.universal
}

// 蓝耗柱状图
const createManaBarChart = (abilities: AbilityDamageInfo[], level: number) => {
  const sorted = abilities
    .filter(a => getManaAtLevel(a, level) > 0)
    .map(a => ({ name: a.displayName, mana: getManaAtLevel(a, level), barColor: getAttrColor(a.heroAttribute) }))
    .sort((a, b) => b.mana - a.mana)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => `${params[0].name}<br/>蓝耗: <b>${params[0].value}</b>`
    },
    grid: { left: '3%', right: '3%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(s => s.name),
      axisLabel: { color: '#7f8c8d', fontSize: 9, rotate: 45, interval: Math.floor(sorted.length / 25) },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: '蓝耗',
      nameTextStyle: { color: '#374151', fontWeight: 'bold' },
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(s => ({ value: s.mana, itemStyle: { color: s.barColor } })),
      barMaxWidth: 20
    }]
  }
}

// DPM 柱状图
const createDpmBarChart = (abilities: AbilityDamageInfo[], level: number) => {
  const sorted = abilities
    .filter(a => getManaAtLevel(a, level) > 0 && a.damage > 0)
    .map(a => ({
      name: a.displayName,
      dpm: calcDpm(a, level),
      damage: getDamageAtLevel(a, level),
      mana: getManaAtLevel(a, level),
      barColor: getAttrColor(a.heroAttribute)
    }))
    .filter(a => a.dpm > 0)
    .sort((a, b) => b.dpm - a.dpm)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const item = sorted[p.dataIndex]
        return `${p.name}<br/>蓝耗效率: <b>${item.dpm}</b><br/>伤害: ${item.damage} / 蓝耗: ${item.mana}`
      }
    },
    grid: { left: '3%', right: '3%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(s => s.name),
      axisLabel: { color: '#7f8c8d', fontSize: 9, rotate: 45, interval: Math.floor(sorted.length / 25) },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: '蓝耗效率',
      nameTextStyle: { color: '#374151', fontWeight: 'bold' },
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(s => ({ value: s.dpm, itemStyle: { color: s.barColor } })),
      barMaxWidth: 20
    }]
  }
}

const normalBurstManaChartOption = computed(() => createManaBarChart(normalBurst.value, normalBurstLevel.value))
const normalDotManaChartOption = computed(() => createManaBarChart(normalDot.value, normalDotLevel.value))
const ultBurstManaChartOption = computed(() => createManaBarChart(ultBurst.value, ultBurstLevel.value))
const ultDotManaChartOption = computed(() => createManaBarChart(ultDot.value, ultDotLevel.value))

const normalBurstDpmChartOption = computed(() => createDpmBarChart(normalBurst.value, normalBurstLevel.value))
const normalDotDpmChartOption = computed(() => createDpmBarChart(normalDot.value, normalDotLevel.value))
const ultBurstDpmChartOption = computed(() => createDpmBarChart(ultBurst.value, ultBurstLevel.value))
const ultDotDpmChartOption = computed(() => createDpmBarChart(ultDot.value, ultDotLevel.value))
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.intro-section {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  color: white;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.intro-section h3 { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; }
.intro-section p { margin: 0; font-size: 0.9rem; opacity: 0.9; }

.insight-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #8b5cf6;
  margin-top: 24px;
}

.insight-box h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; color: #6d28d9; }
.insight-box ul { margin: 0; padding-left: 20px; }
.insight-box li { margin-bottom: 8px; color: #4b5563; font-size: 0.9rem; line-height: 1.6; }
.insight-box li:last-child { margin-bottom: 0; }
</style>
