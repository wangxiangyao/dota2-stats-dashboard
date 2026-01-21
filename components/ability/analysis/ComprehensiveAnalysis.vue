<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner" />
    <span>加载数据中...</span>
  </div>

  <ChartLayout v-else :toc-items="tocItems">
    <!-- 介绍区块 -->
    <div class="intro-section">
      <h3>综合效率分析</h3>
      <p>结合冷却时间效率（DPC）和蓝耗效率（DPM）进行综合分析。散点图右上角的技能是"性价比"最高的。</p>
    </div>

    <!-- ========== 普通技能 ========== -->
    <ChartSection id="comp-normal" title="🎯 普通技能综合效率" color="blue">
      <!-- 瞬发普通 -->
      <ChartSubSection id="comp-normal-burst" title="瞬发技能" color="blue">
        <ChartLevelSlider v-model="normalBurstLevel" :min="1" :max="4" label="技能等级" />
        <ChartCard title="DPC vs DPM 散点图">
          <ClientOnly><VChart v-if="normalBurstScatterOption" :option="normalBurstScatterOption" autoresize style="width: 100%; height: 450px" /></ClientOnly>
        </ChartCard>
        <div class="scatter-legend">
          <span><strong>X轴</strong>：伤害/CD（CD效率）</span>
          <span><strong>Y轴</strong>：伤害/蓝耗（蓝耗效率）</span>
          <span><strong>右上角</strong>：综合效率最高</span>
        </div>
      </ChartSubSection>

      <!-- 持续普通 -->
      <ChartSubSection id="comp-normal-dot" title="持续技能" color="orange">
        <ChartLevelSlider v-model="normalDotLevel" :min="1" :max="4" label="技能等级" />
        <ChartCard title="DPC vs DPM 散点图">
          <ClientOnly><VChart v-if="normalDotScatterOption" :option="normalDotScatterOption" autoresize style="width: 100%; height: 400px" /></ClientOnly>
        </ChartCard>
        <div class="scatter-legend">
          <span><strong>X轴</strong>：伤害/CD（CD效率）</span>
          <span><strong>Y轴</strong>：伤害/蓝耗（蓝耗效率）</span>
        </div>
      </ChartSubSection>
    </ChartSection>

    <!-- ========== 大招 ========== -->
    <ChartSection id="comp-ultimate" title="💥 大招综合效率" color="red">
      <!-- 瞬发大招 -->
      <ChartSubSection id="comp-ult-burst" title="瞬发大招" color="red">
        <ChartLevelSlider v-model="ultBurstLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartCard title="DPC vs DPM 散点图">
          <ClientOnly><VChart v-if="ultBurstScatterOption" :option="ultBurstScatterOption" autoresize style="width: 100%; height: 400px" /></ClientOnly>
        </ChartCard>
        <div class="scatter-legend">
          <span><strong>X轴</strong>：伤害/CD（CD效率）</span>
          <span><strong>Y轴</strong>：伤害/蓝耗（蓝耗效率）</span>
        </div>
      </ChartSubSection>

      <!-- 持续大招 -->
      <ChartSubSection id="comp-ult-dot" title="持续大招" color="orange">
        <ChartLevelSlider v-model="ultDotLevel" :min="1" :max="3" label="技能等级" theme="ultimate" />
        <ChartCard title="DPC vs DPM 散点图">
          <ClientOnly><VChart v-if="ultDotScatterOption" :option="ultDotScatterOption" autoresize style="width: 100%; height: 350px" /></ClientOnly>
        </ChartCard>
        <div class="scatter-legend">
          <span><strong>X轴</strong>：伤害/CD（CD效率）</span>
          <span><strong>Y轴</strong>：伤害/蓝耗（蓝耗效率）</span>
        </div>
      </ChartSubSection>
    </ChartSection>

    <!-- 分析说明 -->
    <div class="insight-box">
      <h4>如何解读散点图</h4>
      <ul>
        <li><strong>右上角</strong>：CD效率高 + 蓝耗效率高，综合性价比最佳</li>
        <li><strong>右下角</strong>：CD效率高但蓝耗效率低，适合蓝量充足时使用</li>
        <li><strong>左上角</strong>：蓝耗效率高但CD效率低，适合持久战消耗</li>
        <li><strong>左下角</strong>：两项效率都较低，可能有其他优势（如控制效果）</li>
      </ul>
    </div>
  </ChartLayout>
</template>

<script setup lang="ts">
import type { AbilityDamageInfo } from '~/composables/useAbilityDamageAnalyzer'
import type { TocItem } from '~/components/chart/Layout.vue'

const props = defineProps<{
  damageList: AbilityDamageInfo[]
  loading: boolean
}>()

// 目录配置
const tocItems: TocItem[] = [
  { id: 'comp-normal', title: '🎯 普通技能', level: 1 },
  { id: 'comp-normal-burst', title: '瞬发技能', level: 2 },
  { id: 'comp-normal-dot', title: '持续技能', level: 2 },
  { id: 'comp-ultimate', title: '💥 大招', level: 1 },
  { id: 'comp-ult-burst', title: '瞬发大招', level: 2 },
  { id: 'comp-ult-dot', title: '持续大招', level: 2 },
]

// 等级状态
const normalBurstLevel = ref(4)
const normalDotLevel = ref(4)
const ultBurstLevel = ref(3)
const ultDotLevel = ref(3)

// 合并排除列表（冷却时间 + 蓝耗）
const excludedAbilities = [
  // 冷却时间无意义
  '尖刀戏', '暗影剧毒', '腐烂', '残焰', '灵能陷阱', '脉冲新星',
  'Blade Dance', 'Shadow Poison', 'Rot', 'Flame Guard', 'Psionic Trap', 'Pulse Nova',
  // 蓝耗无意义
  '灼热之箭', 'Searing Arrows'
]

// 过滤有效技能（需要同时有 CD 和蓝耗）
const filteredList = computed(() => 
  props.damageList.filter(a => 
    a.cooldown > 0 && 
    a.manaCost > 0 &&
    a.damage > 0 &&
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

// 获取指定等级的 CD 周期伤害
const getCdDamageAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (ability.cdDamageAllLevels && ability.cdDamageAllLevels.length > 0) {
    const idx = Math.min(level - 1, ability.cdDamageAllLevels.length - 1)
    return Math.round(ability.cdDamageAllLevels[idx] || ability.cdDamage)
  }
  return getDamageAtLevel(ability, level)
}

// 获取指定等级的蓝耗
const getManaAtLevel = (ability: AbilityDamageInfo, level: number) => {
  if (ability.manaCostAllLevels && ability.manaCostAllLevels.length > 0) {
    const idx = Math.min(level - 1, ability.manaCostAllLevels.length - 1)
    return ability.manaCostAllLevels[idx] || ability.manaCost
  }
  return ability.manaCost
}

// DPC 计算（伤害/CD）
const calcDpc = (ability: AbilityDamageInfo, level: number) => {
  if (ability.cooldown <= 0) return 0
  const cdDmg = getCdDamageAtLevel(ability, level)
  return Math.round(cdDmg / ability.cooldown * 100) / 100
}

// DPM 计算（伤害/蓝耗）
const calcDpm = (ability: AbilityDamageInfo, level: number) => {
  const mana = getManaAtLevel(ability, level)
  if (mana <= 0) return 0
  const dmg = getDamageAtLevel(ability, level)
  return Math.round(dmg / mana * 100) / 100
}

// 颜色
const attrColors: Record<string, string> = { strength: '#e74c3c', agility: '#2ecc71', intelligence: '#3498db', universal: '#9b59b6' }
const getAttrColor = (attr: string) => {
  const key = attr.toLowerCase()
  if (key.includes('str')) return attrColors.strength
  if (key.includes('agi')) return attrColors.agility
  if (key.includes('int')) return attrColors.intelligence
  return attrColors.universal
}

// 创建散点图
const createScatterChart = (abilities: AbilityDamageInfo[], level: number) => {
  const data = abilities
    .map(a => ({
      name: a.displayName,
      dpc: calcDpc(a, level),
      dpm: calcDpm(a, level),
      damage: getDamageAtLevel(a, level),
      cd: a.cooldown,
      mana: getManaAtLevel(a, level),
      color: getAttrColor(a.heroAttribute)
    }))
    .filter(d => d.dpc > 0 && d.dpm > 0)

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data
        return `<b>${d.name}</b><br/>
          DPC（伤害/CD）: ${d.dpc}<br/>
          DPM（伤害/蓝耗）: ${d.dpm}<br/>
          伤害: ${d.damage} | CD: ${d.cd}s | 蓝耗: ${d.mana}`
      }
    },
    grid: { left: '8%', right: '5%', bottom: '12%', top: '8%' },
    xAxis: {
      type: 'value',
      name: 'DPC（伤害/CD）',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: '#374151', fontWeight: 'bold' },
      axisLabel: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    yAxis: {
      type: 'value',
      name: 'DPM（伤害/蓝耗）',
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: { color: '#374151', fontWeight: 'bold' },
      axisLabel: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    series: [{
      type: 'scatter',
      symbolSize: 14,
      data: data.map(d => ({
        name: d.name,
        value: [d.dpc, d.dpm],
        dpc: d.dpc,
        dpm: d.dpm,
        damage: d.damage,
        cd: d.cd,
        mana: d.mana,
        itemStyle: { color: d.color, opacity: 0.8 }
      })),
      emphasis: {
        itemStyle: { borderColor: '#333', borderWidth: 2 }
      },
      label: {
        show: true,
        formatter: (params: any) => params.data.name.slice(0, 4),
        position: 'right',
        fontSize: 9,
        color: '#6b7280'
      }
    }]
  }
}

const normalBurstScatterOption = computed(() => createScatterChart(normalBurst.value, normalBurstLevel.value))
const normalDotScatterOption = computed(() => createScatterChart(normalDot.value, normalDotLevel.value))
const ultBurstScatterOption = computed(() => createScatterChart(ultBurst.value, ultBurstLevel.value))
const ultDotScatterOption = computed(() => createScatterChart(ultDot.value, ultDotLevel.value))
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
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.intro-section h3 { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; }
.intro-section p { margin: 0; font-size: 0.9rem; opacity: 0.9; }

.scatter-legend {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 0.85rem;
  color: #4b5563;
}

.insight-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #6366f1;
  margin-top: 24px;
}

.insight-box h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; color: #4338ca; }
.insight-box ul { margin: 0; padding-left: 20px; }
.insight-box li { margin-bottom: 8px; color: #4b5563; font-size: 0.9rem; line-height: 1.6; }
.insight-box li:last-child { margin-bottom: 0; }
</style>
