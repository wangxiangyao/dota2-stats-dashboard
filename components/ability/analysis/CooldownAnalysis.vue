<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner" />
    <span>加载数据中...</span>
  </div>

  <ChartLayout v-else :toc-items="tocItems">
    <!-- 介绍区块 -->
    <div class="intro-section">
      <h3>冷却时间分析</h3>
      <p>分析技能冷却时间与伤害效率，按大招/普通技能、瞬发/持续分类。伤害效率 = 满级伤害 / 满级CD。</p>
    </div>

    <!-- ========== 第一大类：普通技能 ========== -->
    <ChartSection id="cd-normal" title="🎯 普通技能冷却时间" color="blue">
      <!-- 瞬发普通 -->
      <ChartSubSection id="cd-normal-burst" title="瞬发技能" color="blue">
        <ChartLevelSlider v-model="normalBurstLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="normalBurstCdStats" />
        <ChartCard :title="`冷却时间分布 (${normalBurstLevel}级)`">
          <HistogramChart :data="{ name: '瞬发普通技能CD', values: normalBurstCooldowns, color: '#3b82f6' }" title="" :bin-count="15" height="280px" />
        </ChartCard>
        <ChartCard :title="`冷却时间排行 (${normalBurstLevel}级)`">
          <ClientOnly><VChart v-if="normalBurstCdChartOption" :option="normalBurstCdChartOption" autoresize style="width: 100%; height: 380px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="normalBurstDpcStats" />
        <ChartCard :title="`伤害效率排行 (${normalBurstLevel}级) - 伤害/CD`">
          <ClientOnly><VChart v-if="normalBurstDpcChartOption" :option="normalBurstDpcChartOption" autoresize style="width: 100%; height: 380px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- 持续普通 -->
      <ChartSubSection id="cd-normal-dot" title="持续技能" color="orange">
        <ChartLevelSlider v-model="normalDotLevel" :min="1" :max="4" label="技能等级" />
        <ChartStatsGrid :stats="normalDotCdStats" />
        <ChartCard :title="`冷却时间分布 (${normalDotLevel}级)`">
          <HistogramChart :data="{ name: '持续普通技能CD', values: normalDotCooldowns, color: '#f97316' }" title="" :bin-count="12" height="280px" />
        </ChartCard>
        <ChartCard :title="`冷却时间排行 (${normalDotLevel}级)`">
          <ClientOnly><VChart v-if="normalDotCdChartOption" :option="normalDotCdChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="normalDotDpcStats" />
        <ChartCard :title="`伤害效率排行 (${normalDotLevel}级) - 伤害/CD`">
          <ClientOnly><VChart v-if="normalDotDpcChartOption" :option="normalDotDpcChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- ========== 第二大类：大招 ========== -->
    <ChartSection id="cd-ultimate" title="💥 大招冷却时间" color="red">
      <!-- 瞬发大招 -->
      <ChartSubSection id="cd-ult-burst" title="瞬发大招" color="red">
        <ChartLevelSlider v-model="ultBurstLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="ultBurstCdStats" />
        <ChartCard :title="`冷却时间分布 (${ultBurstLevel}级)`">
          <HistogramChart :data="{ name: '瞬发大招CD', values: ultBurstCooldowns, color: '#ef4444' }" title="" :bin-count="12" height="280px" />
        </ChartCard>
        <ChartCard :title="`冷却时间排行 (${ultBurstLevel}级)`">
          <ClientOnly><VChart v-if="ultBurstCdChartOption" :option="ultBurstCdChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="ultBurstDpcStats" />
        <ChartCard :title="`伤害效率排行 (${ultBurstLevel}级) - 伤害/CD`">
          <ClientOnly><VChart v-if="ultBurstDpcChartOption" :option="ultBurstDpcChartOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>

      <!-- 持续大招 -->
      <ChartSubSection id="cd-ult-dot" title="持续大招" color="orange">
        <ChartLevelSlider v-model="ultDotLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartStatsGrid :stats="ultDotCdStats" />
        <ChartCard :title="`冷却时间分布 (${ultDotLevel}级)`">
          <HistogramChart :data="{ name: '持续大招CD', values: ultDotCooldowns, color: '#dc2626' }" title="" :bin-count="10" height="280px" />
        </ChartCard>
        <ChartCard :title="`冷却时间排行 (${ultDotLevel}级)`">
          <ClientOnly><VChart v-if="ultDotCdChartOption" :option="ultDotCdChartOption" autoresize style="width: 100%; height: 300px" /></ClientOnly>
        </ChartCard>
        <ChartStatsGrid :stats="ultDotDpcStats" />
        <ChartCard :title="`伤害效率排行 (${ultDotLevel}级) - 伤害/CD`">
          <ClientOnly><VChart v-if="ultDotDpcChartOption" :option="ultDotDpcChartOption" autoresize style="width: 100%; height: 300px" /></ClientOnly>
        </ChartCard>
      </ChartSubSection>
    </ChartSection>

    <!-- 分析结论 -->
    <div class="insight-box">
      <h4>冷却时间对比分析</h4>
      <ul>
        <li>普通技能平均CD：瞬发 {{ normalBurstAvgCd }}秒，持续 {{ normalDotAvgCd }}秒</li>
        <li>大招平均CD：瞬发 {{ ultBurstAvgCd }}秒，持续 {{ ultDotAvgCd }}秒</li>
        <li>大招平均CD约是普通技能的 <strong>{{ cdRatio }}倍</strong></li>
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
  { id: 'cd-normal', title: '🎯 普通技能', level: 1 },
  { id: 'cd-normal-burst', title: '瞬发技能', level: 2 },
  { id: 'cd-normal-dot', title: '持续技能', level: 2 },
  { id: 'cd-ultimate', title: '💥 大招', level: 1 },
  { id: 'cd-ult-burst', title: '瞬发大招', level: 2 },
  { id: 'cd-ult-dot', title: '持续大招', level: 2 },
]

// 等级状态
const normalBurstLevel = ref(4)
const normalDotLevel = ref(4)
const ultBurstLevel = ref(3)
const ultDotLevel = ref(3)

// 排除冷却时间无意义的技能
const excludedAbilities = [
  '尖刀戏', '暗影剧毒', '腐烂', '残焰', '灵能陷阱', '脉冲新星',
  'Blade Dance', 'Shadow Poison', 'Rot', 'Flame Guard', 'Psionic Trap', 'Pulse Nova'
]

const filteredList = computed(() => 
  props.damageList.filter(a => !excludedAbilities.some(ex => 
    a.displayName?.includes(ex) || a.name?.includes(ex.toLowerCase().replace(/\s+/g, '_'))
  ))
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

// 获取指定等级的 CD 周期伤害（用于效率计算）
const getCdDamageAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (ability.cdDamageAllLevels && ability.cdDamageAllLevels.length > 0) {
    const idx = Math.min(level - 1, ability.cdDamageAllLevels.length - 1)
    return Math.round(ability.cdDamageAllLevels[idx] || ability.cdDamage)
  }
  // 回退到普通伤害
  return getDamageAtLevel(ability, level)
}

// 提取冷却时间 (CD 使用满级值)
const normalBurstCooldowns = computed(() => normalBurst.value.map(a => a.cooldown).filter(v => v > 0))
const normalDotCooldowns = computed(() => normalDot.value.map(a => a.cooldown).filter(v => v > 0))
const ultBurstCooldowns = computed(() => ultBurst.value.map(a => a.cooldown).filter(v => v > 0))
const ultDotCooldowns = computed(() => ultDot.value.map(a => a.cooldown).filter(v => v > 0))

// CD统计
const normalBurstCdCalc = computed(() => calculateStats(normalBurstCooldowns.value))
const normalDotCdCalc = computed(() => calculateStats(normalDotCooldowns.value))
const ultBurstCdCalc = computed(() => calculateStats(ultBurstCooldowns.value))
const ultDotCdCalc = computed(() => calculateStats(ultDotCooldowns.value))

// DPC计算函数 - 使用 cdDamage（CD周期内实际伤害）
const calcDpc = (ability: AbilityDamageInfo, level: number) => {
  if (ability.cooldown <= 0) return 0
  const cdDmg = getCdDamageAtLevel(ability, level)
  return Math.round(cdDmg / ability.cooldown * 10) / 10
}

// DPC统计
const normalBurstDpcValues = computed(() => normalBurst.value.map(a => calcDpc(a, normalBurstLevel.value)).filter(v => v > 0))
const normalDotDpcValues = computed(() => normalDot.value.map(a => calcDpc(a, normalDotLevel.value)).filter(v => v > 0))
const ultBurstDpcValues = computed(() => ultBurst.value.map(a => calcDpc(a, ultBurstLevel.value)).filter(v => v > 0))
const ultDotDpcValues = computed(() => ultDot.value.map(a => calcDpc(a, ultDotLevel.value)).filter(v => v > 0))

const normalBurstDpcCalc = computed(() => calculateStats(normalBurstDpcValues.value))
const normalDotDpcCalc = computed(() => calculateStats(normalDotDpcValues.value))
const ultBurstDpcCalc = computed(() => calculateStats(ultBurstDpcValues.value))
const ultDotDpcCalc = computed(() => calculateStats(ultDotDpcValues.value))

// CD 统计卡片
const normalBurstCdStats = computed<StatItem[]>(() => [
  { label: '技能数量', value: normalBurst.value.length },
  { label: '平均CD', value: normalBurstCdCalc.value.mean + 's', highlight: true, highlightColor: 'blue' },
  { label: '中位数', value: normalBurstCdCalc.value.median + 's' },
  { label: '最长CD', value: normalBurstCdCalc.value.max + 's' },
])
const normalDotCdStats = computed<StatItem[]>(() => [
  { label: '技能数量', value: normalDot.value.length },
  { label: '平均CD', value: normalDotCdCalc.value.mean + 's', highlight: true, highlightColor: 'orange' },
  { label: '中位数', value: normalDotCdCalc.value.median + 's' },
  { label: '最长CD', value: normalDotCdCalc.value.max + 's' },
])
const ultBurstCdStats = computed<StatItem[]>(() => [
  { label: '大招数量', value: ultBurst.value.length },
  { label: '平均CD', value: ultBurstCdCalc.value.mean + 's', highlight: true, highlightColor: 'red' },
  { label: '中位数', value: ultBurstCdCalc.value.median + 's' },
  { label: '最长CD', value: ultBurstCdCalc.value.max + 's' },
])
const ultDotCdStats = computed<StatItem[]>(() => [
  { label: '大招数量', value: ultDot.value.length },
  { label: '平均CD', value: ultDotCdCalc.value.mean + 's', highlight: true, highlightColor: 'red' },
  { label: '中位数', value: ultDotCdCalc.value.median + 's' },
  { label: '最长CD', value: ultDotCdCalc.value.max + 's' },
])

// DPC 统计卡片
const normalBurstDpcStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: normalBurstDpcCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: normalBurstDpcCalc.value.median },
  { label: '最高效率', value: normalBurstDpcCalc.value.max },
  { label: '最低效率', value: normalBurstDpcCalc.value.min },
])
const normalDotDpcStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: normalDotDpcCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: normalDotDpcCalc.value.median },
  { label: '最高效率', value: normalDotDpcCalc.value.max },
  { label: '最低效率', value: normalDotDpcCalc.value.min },
])
const ultBurstDpcStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: ultBurstDpcCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: ultBurstDpcCalc.value.median },
  { label: '最高效率', value: ultBurstDpcCalc.value.max },
  { label: '最低效率', value: ultBurstDpcCalc.value.min },
])
const ultDotDpcStats = computed<StatItem[]>(() => [
  { label: '平均效率', value: ultDotDpcCalc.value.mean, highlight: true, highlightColor: 'green' },
  { label: '中位数', value: ultDotDpcCalc.value.median },
  { label: '最高效率', value: ultDotDpcCalc.value.max },
  { label: '最低效率', value: ultDotDpcCalc.value.min },
])

// 结论数据
const normalBurstAvgCd = computed(() => normalBurstCdCalc.value.mean)
const normalDotAvgCd = computed(() => normalDotCdCalc.value.mean)
const ultBurstAvgCd = computed(() => ultBurstCdCalc.value.mean)
const ultDotAvgCd = computed(() => ultDotCdCalc.value.mean)
const cdRatio = computed(() => {
  const normalAvg = (normalBurstCdCalc.value.mean + normalDotCdCalc.value.mean) / 2
  const ultAvg = (ultBurstCdCalc.value.mean + ultDotCdCalc.value.mean) / 2
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

// CD 柱状图
const createCdBarChart = (abilities: AbilityDamageInfo[]) => {
  const sorted = abilities
    .filter(a => a.cooldown > 0)
    .map(a => ({ name: a.displayName, cd: a.cooldown, barColor: getAttrColor(a.heroAttribute) }))
    .sort((a, b) => b.cd - a.cd)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => `${params[0].name}<br/>CD: <b>${params[0].value}秒</b>`
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
      name: 'CD（秒）',
      nameTextStyle: { color: '#374151', fontWeight: 'bold' },
      axisLabel: { color: '#7f8c8d', formatter: '{value}s' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(s => ({ value: s.cd, itemStyle: { color: s.barColor } })),
      barMaxWidth: 20
    }]
  }
}

// DPC 柱状图
const createDpcBarChart = (abilities: AbilityDamageInfo[], level: number) => {
  const sorted = abilities
    .filter(a => a.cooldown > 0 && a.damage > 0)
    .map(a => ({
      name: a.displayName,
      dpc: calcDpc(a, level),
      damage: getDamageAtLevel(a, level),
      cd: a.cooldown,
      barColor: getAttrColor(a.heroAttribute)
    }))
    .filter(a => a.dpc > 0)
    .sort((a, b) => b.dpc - a.dpc)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const item = sorted[p.dataIndex]
        return `${p.name}<br/>伤害效率: <b>${item.dpc}</b><br/>伤害: ${item.damage} / CD: ${item.cd}s`
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
      name: '伤害效率',
      nameTextStyle: { color: '#374151', fontWeight: 'bold' },
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{
      type: 'bar',
      data: sorted.map(s => ({ value: s.dpc, itemStyle: { color: s.barColor } })),
      barMaxWidth: 20
    }]
  }
}

const normalBurstCdChartOption = computed(() => createCdBarChart(normalBurst.value))
const normalDotCdChartOption = computed(() => createCdBarChart(normalDot.value))
const ultBurstCdChartOption = computed(() => createCdBarChart(ultBurst.value))
const ultDotCdChartOption = computed(() => createCdBarChart(ultDot.value))

const normalBurstDpcChartOption = computed(() => createDpcBarChart(normalBurst.value, normalBurstLevel.value))
const normalDotDpcChartOption = computed(() => createDpcBarChart(normalDot.value, normalDotLevel.value))
const ultBurstDpcChartOption = computed(() => createDpcBarChart(ultBurst.value, ultBurstLevel.value))
const ultDotDpcChartOption = computed(() => createDpcBarChart(ultDot.value, ultDotLevel.value))
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
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
}

.intro-section h3 { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; }
.intro-section p { margin: 0; font-size: 0.9rem; opacity: 0.9; }

.insight-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #06b6d4;
  margin-top: 24px;
}

.insight-box h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; color: #0e7490; }
.insight-box ul { margin: 0; padding-left: 20px; }
.insight-box li { margin-bottom: 8px; color: #4b5563; font-size: 0.9rem; line-height: 1.6; }
.insight-box li:last-child { margin-bottom: 0; }
</style>
