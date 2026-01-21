<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner" />
    <span>加载数据中...</span>
  </div>

  <ChartLayout v-else :toc-items="tocItems">
    <!-- 介绍区块 -->
    <div class="intro-section">
      <h3>瞬发与持续分析</h3>
      <p>按伤害释放模式（瞬间伤害/持续伤害）分析技能伤害分布，分别展示普通技能和大招在不同等级下的表现。</p>
    </div>

    <!-- ========== 第一大类：瞬间伤害 ========== -->
    <ChartSection id="burst" title="⚡ 瞬间伤害 (Burst)" color="yellow">
      <!-- 瞬间伤害 - 普通技能 -->
      <ChartSubSection id="burst-normal" title="普通技能" color="blue">
        <ChartLevelSlider v-model="burstNormalLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="burstNormalStatsCards" />
        <ChartCard :title="`伤害分布直方图 (${burstNormalLevel}级)`">
          <HistogramChart :data="{ name: '瞬间普通技能', values: burstNormalDamages, color: '#f59e0b' }" title="" :bin-count="15" height="300px" />
        </ChartCard>
        <ChartCard :title="`各技能伤害 (${burstNormalLevel}级)`">
          <ClientOnly><VChart v-if="burstNormalChartOption" :option="burstNormalChartOption" autoresize style="width: 100%; height: 400px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- 瞬间伤害 - 大招 -->
      <ChartSubSection id="burst-ult" title="大招" color="red">
        <ChartLevelSlider v-model="burstUltLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="burstUltStatsCards" />
        <ChartCard :title="`伤害分布直方图 (${burstUltLevel}级)`">
          <HistogramChart :data="{ name: '瞬间大招', values: burstUltDamages, color: '#ef4444' }" title="" :bin-count="12" height="300px" />
        </ChartCard>
        <ChartCard :title="`各技能伤害 (${burstUltLevel}级)`">
          <ClientOnly><VChart v-if="burstUltChartOption" :option="burstUltChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- ========== 第二大类：持续伤害 ========== -->
    <ChartSection id="dot" title="🔥 持续伤害 (DoT)" color="orange">
      <!-- 持续伤害 - 普通技能 -->
      <ChartSubSection id="dot-normal" title="普通技能" color="blue">
        <ChartLevelSlider v-model="dotNormalLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="dotNormalStatsCards" />
        <ChartCard :title="`伤害分布直方图 (${dotNormalLevel}级)`">
          <HistogramChart :data="{ name: 'DoT普通技能', values: dotNormalDamages, color: '#f97316' }" title="" :bin-count="15" height="300px" />
        </ChartCard>
        <ChartCard :title="`各技能伤害 (${dotNormalLevel}级)`">
          <ClientOnly><VChart v-if="dotNormalChartOption" :option="dotNormalChartOption" autoresize style="width: 100%; height: 400px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- 持续伤害 - 大招 -->
      <ChartSubSection id="dot-ult" title="大招" color="red">
        <ChartLevelSlider v-model="dotUltLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="dotUltStatsCards" />
        <ChartCard :title="`伤害分布直方图 (${dotUltLevel}级)`">
          <HistogramChart :data="{ name: 'DoT大招', values: dotUltDamages, color: '#dc2626' }" title="" :bin-count="12" height="300px" />
        </ChartCard>
        <ChartCard :title="`各技能伤害 (${dotUltLevel}级)`">
          <ClientOnly><VChart v-if="dotUltChartOption" :option="dotUltChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- ========== 第三大类：持续伤害 DPS ========== -->
    <ChartSection id="dps" title="📊 持续伤害 DPS 分析" color="green">
      <!-- DPS - 普通技能 -->
      <ChartSubSection id="dps-normal" title="普通技能 DPS" color="blue">
        <ChartLevelSlider v-model="dpsNormalLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="dpsNormalStatsCards" />
        <ChartCard :title="`DPS分布直方图 (${dpsNormalLevel}级)`">
          <HistogramChart :data="{ name: 'DoT普通技能DPS', values: dpsNormalDamages, color: '#10b981' }" title="" :bin-count="12" height="300px" />
        </ChartCard>
        <ChartCard :title="`各技能DPS (${dpsNormalLevel}级)`">
          <ClientOnly><VChart v-if="dpsNormalChartOption" :option="dpsNormalChartOption" autoresize style="width: 100%; height: 400px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- DPS - 大招 -->
      <ChartSubSection id="dps-ult" title="大招 DPS" color="red">
        <ChartLevelSlider v-model="dpsUltLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="dpsUltStatsCards" />
        <ChartCard :title="`DPS分布直方图 (${dpsUltLevel}级)`">
          <HistogramChart :data="{ name: 'DoT大招DPS', values: dpsUltDamages, color: '#ef4444' }" title="" :bin-count="10" height="300px" />
        </ChartCard>
        <ChartCard :title="`各技能DPS (${dpsUltLevel}级)`">
          <ClientOnly><VChart v-if="dpsUltChartOption" :option="dpsUltChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- 分析结论 -->
    <div class="insight-box">
      <h4>瞬间伤害 vs 持续伤害 对比分析</h4>
      <ul>
        <li>瞬间普通技能（满级）：平均 {{ burstNormalStatsMax.mean }}，大招平均 {{ burstUltStatsMax.mean }}</li>
        <li>持续普通技能（满级）：平均 {{ dotNormalStatsMax.mean }}，大招平均 {{ dotUltStatsMax.mean }}</li>
        <li>持续伤害技能平均总伤害比瞬间伤害高 <strong>{{ dotVsBurstRatio }}</strong>（但需要更长时间释放）</li>
        <li>持续普通技能平均 DPS：{{ dpsNormalStatsMax.mean }}，大招平均 DPS：{{ dpsUltStatsMax.mean }}</li>
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
  { id: 'burst', title: '⚡ 瞬间伤害', level: 1 },
  { id: 'burst-normal', title: '普通技能', level: 2 },
  { id: 'burst-ult', title: '大招', level: 2 },
  { id: 'dot', title: '🔥 持续伤害', level: 1 },
  { id: 'dot-normal', title: '普通技能', level: 2 },
  { id: 'dot-ult', title: '大招', level: 2 },
  { id: 'dps', title: '📊 DPS 分析', level: 1 },
  { id: 'dps-normal', title: '普通技能 DPS', level: 2 },
  { id: 'dps-ult', title: '大招 DPS', level: 2 },
]

// 等级状态
const burstNormalLevel = ref(4)
const burstUltLevel = ref(3)
const dotNormalLevel = ref(4)
const dotUltLevel = ref(3)
const dpsNormalLevel = ref(4)
const dpsUltLevel = ref(3)

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

const getDpsAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (!ability.dpsAllLevels || ability.dpsAllLevels.length === 0) return 0
  const idx = Math.min(level - 1, ability.dpsAllLevels.length - 1)
  return ability.dpsAllLevels[idx] || 0
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

// 分类技能
const burstAbilities = computed(() => props.damageList.filter(a => a.isBurst === true))
const dotAbilities = computed(() => props.damageList.filter(a => a.isBurst === false))
const burstNormalAbilities = computed(() => burstAbilities.value.filter(a => !a.isUltimate))
const burstUltAbilities = computed(() => burstAbilities.value.filter(a => a.isUltimate))
const dotNormalAbilities = computed(() => dotAbilities.value.filter(a => !a.isUltimate))
const dotUltAbilities = computed(() => dotAbilities.value.filter(a => a.isUltimate))
const dotNormalWithDps = computed(() => dotNormalAbilities.value.filter(a => a.dpsAllLevels && a.dpsAllLevels.length > 0))
const dotUltWithDps = computed(() => dotUltAbilities.value.filter(a => a.dpsAllLevels && a.dpsAllLevels.length > 0))

// 伤害数组
const burstNormalDamages = computed(() => burstNormalAbilities.value.map(a => getDamageAtLevel(a, burstNormalLevel.value)))
const burstUltDamages = computed(() => burstUltAbilities.value.map(a => getDamageAtLevel(a, burstUltLevel.value)))
const dotNormalDamages = computed(() => dotNormalAbilities.value.map(a => getDamageAtLevel(a, dotNormalLevel.value)))
const dotUltDamages = computed(() => dotUltAbilities.value.map(a => getDamageAtLevel(a, dotUltLevel.value)))
const dpsNormalDamages = computed(() => dotNormalWithDps.value.map(a => getDpsAtLevel(a, dpsNormalLevel.value)))
const dpsUltDamages = computed(() => dotUltWithDps.value.map(a => getDpsAtLevel(a, dpsUltLevel.value)))

// 统计数据
const burstNormalStats = computed(() => calculateStats(burstNormalDamages.value))
const burstUltStats = computed(() => calculateStats(burstUltDamages.value))
const dotNormalStats = computed(() => calculateStats(dotNormalDamages.value))
const dotUltStats = computed(() => calculateStats(dotUltDamages.value))
const dpsNormalStats = computed(() => calculateStats(dpsNormalDamages.value))
const dpsUltStats = computed(() => calculateStats(dpsUltDamages.value))

// 满级统计
const burstNormalStatsMax = computed(() => calculateStats(burstNormalAbilities.value.map(a => getDamageAtLevel(a, 4))))
const burstUltStatsMax = computed(() => calculateStats(burstUltAbilities.value.map(a => getDamageAtLevel(a, 3))))
const dotNormalStatsMax = computed(() => calculateStats(dotNormalAbilities.value.map(a => getDamageAtLevel(a, 4))))
const dotUltStatsMax = computed(() => calculateStats(dotUltAbilities.value.map(a => getDamageAtLevel(a, 3))))
const dpsNormalStatsMax = computed(() => calculateStats(dotNormalWithDps.value.map(a => getDpsAtLevel(a, 4))))
const dpsUltStatsMax = computed(() => calculateStats(dotUltWithDps.value.map(a => getDpsAtLevel(a, 3))))

// 统计卡片数据
const burstNormalStatsCards = computed<StatItem[]>(() => [
  { label: '技能数量', value: burstNormalAbilities.value.length },
  { label: '平均伤害', value: burstNormalStats.value.mean, highlight: true, highlightColor: 'blue' },
  { label: '中位数', value: burstNormalStats.value.median },
  { label: '最大伤害', value: burstNormalStats.value.max },
])
const burstUltStatsCards = computed<StatItem[]>(() => [
  { label: '大招数量', value: burstUltAbilities.value.length },
  { label: '平均伤害', value: burstUltStats.value.mean, highlight: true, highlightColor: 'red' },
  { label: '中位数', value: burstUltStats.value.median },
  { label: '最大伤害', value: burstUltStats.value.max },
])
const dotNormalStatsCards = computed<StatItem[]>(() => [
  { label: '技能数量', value: dotNormalAbilities.value.length },
  { label: '平均伤害', value: dotNormalStats.value.mean, highlight: true, highlightColor: 'blue' },
  { label: '中位数', value: dotNormalStats.value.median },
  { label: '最大伤害', value: dotNormalStats.value.max },
])
const dotUltStatsCards = computed<StatItem[]>(() => [
  { label: '大招数量', value: dotUltAbilities.value.length },
  { label: '平均伤害', value: dotUltStats.value.mean, highlight: true, highlightColor: 'red' },
  { label: '中位数', value: dotUltStats.value.median },
  { label: '最大伤害', value: dotUltStats.value.max },
])
const dpsNormalStatsCards = computed<StatItem[]>(() => [
  { label: '技能数量', value: dotNormalWithDps.value.length },
  { label: '平均DPS', value: dpsNormalStats.value.mean, highlight: true, highlightColor: 'blue' },
  { label: '中位数', value: dpsNormalStats.value.median },
  { label: '最大DPS', value: dpsNormalStats.value.max },
])
const dpsUltStatsCards = computed<StatItem[]>(() => [
  { label: '大招数量', value: dotUltWithDps.value.length },
  { label: '平均DPS', value: dpsUltStats.value.mean, highlight: true, highlightColor: 'red' },
  { label: '中位数', value: dpsUltStats.value.median },
  { label: '最大DPS', value: dpsUltStats.value.max },
])

// DoT vs Burst 比率
const dotVsBurstRatio = computed(() => {
  const burstAvg = (burstNormalStatsMax.value.mean + burstUltStatsMax.value.mean) / 2
  const dotAvg = (dotNormalStatsMax.value.mean + dotUltStatsMax.value.mean) / 2
  if (burstAvg === 0) return '0%'
  return ((dotAvg - burstAvg) / burstAvg * 100).toFixed(0) + '%'
})

// 柱状图
const createBarChart = (abilities: AbilityDamageInfo[], level: number, isDps = false) => {
  const sorted = abilities
    .map(a => ({
      name: a.displayName,
      value: isDps ? getDpsAtLevel(a, level) : getDamageAtLevel(a, level),
      barColor: getAttrColor(a.heroAttribute),
      valueColor: getDamageTypeColor(a.damageType)
    }))
    .filter(a => a.value > 0)
    .sort((a, b) => b.value - a.value)

  const label = isDps ? 'DPS' : '伤害'
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const item = sorted[p.dataIndex]
        return `${p.name}<br/>${label}: <span style="color:${item.valueColor};font-weight:bold">${p.value}</span>`
      }
    },
    grid: { left: '2%', right: '2%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(s => s.name),
      axisLabel: { color: '#7f8c8d', fontSize: 9, rotate: 45, interval: Math.floor(sorted.length / 25) },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: label,
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(s => ({ value: s.value, itemStyle: { color: s.barColor } })),
      barMaxWidth: 20
    }]
  }
}

const burstNormalChartOption = computed(() => createBarChart(burstNormalAbilities.value, burstNormalLevel.value))
const burstUltChartOption = computed(() => createBarChart(burstUltAbilities.value, burstUltLevel.value))
const dotNormalChartOption = computed(() => createBarChart(dotNormalAbilities.value, dotNormalLevel.value))
const dotUltChartOption = computed(() => createBarChart(dotUltAbilities.value, dotUltLevel.value))
const dpsNormalChartOption = computed(() => createBarChart(dotNormalWithDps.value, dpsNormalLevel.value, true))
const dpsUltChartOption = computed(() => createBarChart(dotUltWithDps.value, dpsUltLevel.value, true))
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
  background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
}

.intro-section h3 { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; }
.intro-section p { margin: 0; font-size: 0.9rem; opacity: 0.9; }

.insight-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #8e44ad;
  margin-top: 28px;
}

.insight-box h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; color: #6b21a8; }
.insight-box ul { margin: 0; padding-left: 20px; }
.insight-box li { margin-bottom: 8px; color: #4b5563; font-size: 0.9rem; line-height: 1.6; }
.insight-box li:last-child { margin-bottom: 0; }
</style>
