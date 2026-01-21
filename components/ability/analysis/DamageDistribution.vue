<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner" />
    <span>加载数据中...</span>
  </div>

  <ChartLayout v-else :toc-items="tocItems">
    <!-- 介绍区块 -->
    <div class="intro-section">
      <h3>伤害分布分析</h3>
      <p>统计所有伤害技能的数值分布规律，分别分析普通技能和大招在不同等级下的伤害分布。</p>
    </div>

    <!-- ========== 普通技能 ========== -->
    <ChartSection id="normal" title="🎯 普通技能伤害分析" color="blue">
      <ChartLevelSlider v-model="normalLevel" :min="1" :max="4" label="技能等级" />
      <ChartStatsGrid :stats="normalStatsCards" />
      
      <ChartCard :title="`伤害分布直方图 (${normalLevel}级)`">
        <HistogramChart
          :data="{ name: '普通技能', values: normalDamagesAtLevel, color: '#3b82f6' }"
          title=""
          :bin-count="20"
          height="350px"
        />
        <div class="chart-footer">
          <span>P25: {{ normalStatsAtLevel.p25 }}</span>
          <span>中位数: {{ normalStatsAtLevel.median }}</span>
          <span>P75: {{ normalStatsAtLevel.p75 }}</span>
          <span>P90: {{ normalStatsAtLevel.p90 }}</span>
        </div>
      </ChartCard>

      <ChartCard :title="`各技能伤害 (${normalLevel}级) - 按伤害降序排列`">
        <ClientOnly>
          <VChart v-if="normalBarChartOption" :option="normalBarChartOption" autoresize style="width: 100%; height: 450px" />
        </ClientOnly>
      </ChartCard>
    </ChartSection>

    <!-- ========== 大招 ========== -->
    <ChartSection id="ultimate" title="💥 大招伤害分析" color="red">
      <ChartLevelSlider v-model="ultimateLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
      <ChartStatsGrid :stats="ultimateStatsCards" />
      
      <ChartCard :title="`伤害分布直方图 (${ultimateLevel}级)`">
        <HistogramChart
          :data="{ name: '大招', values: ultimateDamagesAtLevel, color: '#ef4444' }"
          title=""
          :bin-count="15"
          height="350px"
        />
        <div class="chart-footer">
          <span>P25: {{ ultimateStatsAtLevel.p25 }}</span>
          <span>中位数: {{ ultimateStatsAtLevel.median }}</span>
          <span>P75: {{ ultimateStatsAtLevel.p75 }}</span>
          <span>P90: {{ ultimateStatsAtLevel.p90 }}</span>
        </div>
      </ChartCard>

      <ChartCard :title="`各技能伤害 (${ultimateLevel}级) - 按伤害降序排列`">
        <ClientOnly>
          <VChart v-if="ultimateBarChartOption" :option="ultimateBarChartOption" autoresize style="width: 100%; height: 400px" />
        </ClientOnly>
      </ChartCard>
    </ChartSection>

    <!-- 分析结论 -->
    <div class="insight-box">
      <h4>分布特征对比</h4>
      <ul>
        <li>普通技能（{{ normalLevel }}级）：平均 {{ normalStatsAtLevel.mean }}，集中在 {{ normalStatsAtLevel.p25 }} - {{ normalStatsAtLevel.p75 }} 区间</li>
        <li>大招（{{ ultimateLevel }}级）：平均 {{ ultimateStatsAtLevel.mean }}，集中在 {{ ultimateStatsAtLevel.p25 }} - {{ ultimateStatsAtLevel.p75 }} 区间</li>
        <li>大招平均伤害约是普通技能的 <strong>{{ damageRatio }}倍</strong></li>
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
  { id: 'normal', title: '🎯 普通技能', level: 1 },
  { id: 'ultimate', title: '💥 大招', level: 1 },
]

// 等级状态
const normalLevel = ref(4)
const ultimateLevel = ref(3)

// 分离普通技能和大招
const normalAbilities = computed(() => props.damageList.filter(a => !a.isUltimate))
const ultimateAbilities = computed(() => props.damageList.filter(a => a.isUltimate))

// 颜色映射
const damageTypeColors: Record<string, string> = { magical: '#3498db', physical: '#e74c3c', pure: '#f1c40f' }
const attrColors: Record<string, string> = { strength: '#e74c3c', agility: '#2ecc71', intelligence: '#3498db', universal: '#9b59b6' }

const getDamageAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (ability.damageAllLevels && ability.damageAllLevels.length > 0) {
    const idx = Math.min(level - 1, ability.damageAllLevels.length - 1)
    return Math.round(ability.damageAllLevels[idx] || ability.damage)
  }
  return Math.round(ability.damage)
}

const getDamageTypeColor = (damageType: string | null) => {
  if (!damageType) return damageTypeColors.magical
  const type = damageType.toUpperCase()
  if (type.includes('PHYSICAL')) return damageTypeColors.physical
  if (type.includes('PURE')) return damageTypeColors.pure
  return damageTypeColors.magical
}

const getAttrColor = (attr: string) => {
  const key = attr.toLowerCase()
  if (key.includes('str')) return attrColors.strength
  if (key.includes('agi')) return attrColors.agility
  if (key.includes('int')) return attrColors.intelligence
  return attrColors.universal
}

// 伤害数组
const normalDamagesAtLevel = computed(() => normalAbilities.value.map(a => getDamageAtLevel(a, normalLevel.value)))
const ultimateDamagesAtLevel = computed(() => ultimateAbilities.value.map(a => getDamageAtLevel(a, ultimateLevel.value)))

// 统计数据
const normalStatsAtLevel = computed(() => calculateStats(normalDamagesAtLevel.value))
const ultimateStatsAtLevel = computed(() => calculateStats(ultimateDamagesAtLevel.value))

// 伤害倍率
const damageRatio = computed(() => {
  if (normalStatsAtLevel.value.mean === 0) return '0'
  return (ultimateStatsAtLevel.value.mean / normalStatsAtLevel.value.mean).toFixed(1)
})

// 统计卡片
const normalStatsCards = computed<StatItem[]>(() => [
  { label: '技能数量', value: normalAbilities.value.length },
  { label: '平均伤害', value: normalStatsAtLevel.value.mean, highlight: true, highlightColor: 'blue' },
  { label: '中位数', value: normalStatsAtLevel.value.median },
  { label: '最大伤害', value: normalStatsAtLevel.value.max },
])

const ultimateStatsCards = computed<StatItem[]>(() => [
  { label: '大招数量', value: ultimateAbilities.value.length },
  { label: '平均伤害', value: ultimateStatsAtLevel.value.mean, highlight: true, highlightColor: 'red' },
  { label: '中位数', value: ultimateStatsAtLevel.value.median },
  { label: '最大伤害', value: ultimateStatsAtLevel.value.max },
])

// 柱状图
const createBarChart = (abilities: AbilityDamageInfo[], level: number) => {
  const sorted = abilities
    .map(a => ({
      name: a.displayName,
      damage: getDamageAtLevel(a, level),
      barColor: getAttrColor(a.heroAttribute),
      damageColor: getDamageTypeColor(a.damageType)
    }))
    .sort((a, b) => b.damage - a.damage)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const item = sorted[p.dataIndex]
        return `${p.name}<br/>伤害: <span style="color:${item.damageColor};font-weight:bold">${p.value}</span>`
      }
    },
    grid: { left: '2%', right: '2%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(s => s.name),
      axisLabel: { color: '#7f8c8d', fontSize: 9, rotate: 45, interval: Math.floor(sorted.length / 30) },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: '伤害',
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(s => ({ value: s.damage, itemStyle: { color: s.barColor } })),
      barMaxWidth: 20
    }]
  }
}

const normalBarChartOption = computed(() => createBarChart(normalAbilities.value, normalLevel.value))
const ultimateBarChartOption = computed(() => createBarChart(ultimateAbilities.value, ultimateLevel.value))
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
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

.intro-section h3 { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; }
.intro-section p { margin: 0; font-size: 0.9rem; opacity: 0.9; }

.chart-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #6b7280;
}

.insight-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #3b82f6;
  margin-top: 24px;
}

.insight-box h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; color: #1e40af; }
.insight-box ul { margin: 0; padding-left: 20px; }
.insight-box li { margin-bottom: 8px; color: #4b5563; font-size: 0.9rem; line-height: 1.6; }
.insight-box li:last-child { margin-bottom: 0; }
</style>
