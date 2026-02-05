<script setup lang="ts">
import type { Hero } from '~/types/dota'
import type { TocItem } from '~/components/chart/Layout.vue'

const { loadHeroes } = useDataLoader()
const {
  calculateHP,
  calculateMana,
  calculateHPRegen,
  calculateManaRegen,
  calculateArmor,
  calculateMagicResistance,
  calculatePhysicalEHP,
  calculateMagicalEHP,
  calculateDamage,
  calculateDPS,
  calculateAttackSpeed,
  calculateSurvivalTime,
  calculateKillTime
} = useHeroCalculator()

// 数据
const heroes = ref<Hero[]>([])

// Tab配置
const tabs = [
  { name: 'survival', label: '🛡️ A. 生存能力' },
  { name: 'damage', label: '⚔️ B. 输出能力' },
  { name: 'sustain', label: '💧 C. 续航分析' },
  { name: 'attribute', label: '📊 D. 属性分析' },
  { name: 'misc', label: '🔧 E. 其他' },
  { name: 'synthesis', label: '📈 综合分析' }
]

// TOC配置
const survivalTocItems: TocItem[] = [
  { id: 'survival-hp', title: '生命值', level: 1 },
  { id: 'survival-hp-dist', title: '生命值分布', level: 2 },
  { id: 'survival-hp-curve', title: '生命值曲线', level: 2 },
  { id: 'survival-defense', title: '防御', level: 1 },
  { id: 'survival-armor', title: '护甲分布', level: 2 },
  { id: 'survival-armor-curve', title: '护甲曲线', level: 2 },
  { id: 'survival-mr', title: '魔抗分布', level: 2 },
  { id: 'survival-mr-curve', title: '魔抗曲线', level: 2 },
  { id: 'survival-ehp', title: '等效生命值', level: 1 },
  { id: 'survival-pehp', title: '物理EHP', level: 2 },
  { id: 'survival-pehp-curve', title: '物理EHP曲线', level: 2 },
  { id: 'survival-mehp', title: '魔法EHP', level: 2 },
  { id: 'survival-mehp-curve', title: '魔法EHP曲线', level: 2 }
]

const damageTocItems: TocItem[] = [
  { id: 'damage-attack', title: '攻击力', level: 1 },
  { id: 'damage-attack-dist', title: '攻击力分布', level: 2 },
  { id: 'damage-attack-curve', title: '攻击力曲线', level: 2 },
  { id: 'damage-speed', title: '攻速', level: 1 },
  { id: 'damage-bat', title: 'BAT 排行', level: 2 },
  { id: 'damage-as-dist', title: '攻速分布', level: 2 },
  { id: 'damage-as-curve', title: '攻速曲线', level: 2 },
  { id: 'damage-dps', title: 'DPS', level: 1 },
  { id: 'damage-dps-curve', title: 'DPS 曲线', level: 2 },
  { id: 'damage-dps-dist', title: 'DPS 排行', level: 2 }
]

const sustainTocItems: TocItem[] = [
  { id: 'sustain-mana', title: '魔法值', level: 1 },
  { id: 'sustain-mana-dist', title: '魔法值分布', level: 2 },
  { id: 'sustain-mana-curve', title: '魔法值曲线', level: 2 },
  { id: 'sustain-hp-regen', title: '生命恢复', level: 1 },
  { id: 'sustain-hp-regen-dist', title: '生命恢复分布', level: 2 },
  { id: 'sustain-hp-regen-curve', title: '生命恢复曲线', level: 2 },
  { id: 'sustain-mana-regen', title: '魔法恢复', level: 1 },
  { id: 'sustain-mana-regen-dist', title: '魔法恢复分布', level: 2 },
  { id: 'sustain-mana-regen-curve', title: '魔法恢复曲线', level: 2 }
]

const attributeTocItems: TocItem[] = [
  { id: 'attr-primary', title: '主属性分布', level: 1 },
  { id: 'attr-range', title: '近战/远程分布', level: 1 },
  { id: 'attr-growth', title: '属性成长', level: 1 }
]

const miscTocItems: TocItem[] = [
  { id: 'misc-range', title: '攻击距离', level: 1 },
  { id: 'misc-speed', title: '移动速度', level: 1 },
  { id: 'misc-speed-range', title: '移速vs距离', level: 1 },
  { id: 'misc-hp-range', title: '攻击距离vs血量', level: 1 }
]

const synthesisTocItems: TocItem[] = [
  { id: 'synth-ttk', title: '击杀时间分析', level: 1 },
  { id: 'synth-avg-dps', title: '平均DPS关系', level: 2 },
  { id: 'synth-kill-others', title: '击杀其他英雄', level: 2 },
  { id: 'synth-killed-by', title: '被其他击杀', level: 2 }
]

// 当前Tab（保留兼容旧模板）
const activeTab = ref('survival')

// 等级控制
const hpLevel = ref(25)
const armorLevel = ref(25)
const mrLevel = ref(25)
const ehpLevel = ref(25)
const mehpLevel = ref(25)
const damageLevel = ref(1)
const dpsLevel = ref(25)
// 续航分析等级控制
const manaLevel = ref(25)
const hpRegenLevel = ref(25)
const manaRegenLevel = ref(25)
// 攻速等级控制
const attackSpeedLevel = ref(25)
// 综合分析等级控制
const ttkLevel = ref(25)

// 是否计算黄点
const includeBonus = ref(true)

// 英雄选择器的选中英雄
const hpCurveSelected = ref<string[]>([])
const armorCurveSelected = ref<string[]>([])
const mrCurveSelected = ref<string[]>([])
const ehpCurveSelected = ref<string[]>([])
const mehpCurveSelected = ref<string[]>([])
const damageCurveSelected = ref<string[]>([])
const dpsCurveSelected = ref<string[]>([])
// 续航分析选中英雄
const manaCurveSelected = ref<string[]>([])
const hpRegenCurveSelected = ref<string[]>([])
const manaRegenCurveSelected = ref<string[]>([])
// 攻速选中英雄
const attackSpeedCurveSelected = ref<string[]>([])
// 综合分析选中英雄
const survivalCurveSelected = ref<string[]>([])
const killOthersSelected = ref<string>('')
const killedBySelected = ref<string>('')

// 排除的特殊英雄
const HP_EXCLUDE = ['美杜莎']
const ARMOR_EXCLUDE = ['小小']
const MR_EXCLUDE = ['食人魔魔法师']

// 加载数据
onMounted(async () => {
  const data = await loadHeroes()
  if (data) {
    heroes.value = data
    // 默认选中所有英雄（排除特殊英雄）
    const allNames = data.map(h => h.name)
    hpCurveSelected.value = data.filter(h => !HP_EXCLUDE.includes(h.name)).map(h => h.name)
    armorCurveSelected.value = allNames
    mrCurveSelected.value = allNames
    ehpCurveSelected.value = allNames
    mehpCurveSelected.value = allNames
    damageCurveSelected.value = allNames
    dpsCurveSelected.value = allNames
    // 续航分析默认选中
    manaCurveSelected.value = allNames
    hpRegenCurveSelected.value = allNames
    manaRegenCurveSelected.value = allNames
    // 攻速默认选中
    attackSpeedCurveSelected.value = allNames
    // 综合分析默认选中
    // 被平均DPS击杀时间曲线：选最肉3个+最脆3个
    const withEHP = data.map(h => ({
      name: h.name,
      ehp: calculatePhysicalEHP(h, 25, true)
    })).sort((a, b) => b.ehp - a.ehp)
    const top3 = withEHP.slice(0, 3).map(h => h.name)
    const bottom3 = withEHP.slice(-3).map(h => h.name)
    survivalCurveSelected.value = [...top3, ...bottom3]
    // 击杀其他英雄/被击杀：默认选第一个
    killOthersSelected.value = allNames[0] || ''
    killedBySelected.value = allNames[0] || ''
  }
})

// 切换Tab
const switchTab = (tab: string) => {
  activeTab.value = tab
}

// 计算函数（带黄点控制）
const getHP = (hero: Hero, level: number) => calculateHP(hero, level, includeBonus.value)
const getArmor = (hero: Hero, level: number) => calculateArmor(hero, level, includeBonus.value)
const getMR = (hero: Hero, level: number) => calculateMagicResistance(hero, level, includeBonus.value)
const getPhysicalEHP = (hero: Hero, level: number) => calculatePhysicalEHP(hero, level, includeBonus.value)
const getMagicalEHP = (hero: Hero, level: number) => calculateMagicalEHP(hero, level, includeBonus.value)
const getDamage = (hero: Hero, level: number) => calculateDamage(hero, level, includeBonus.value)
const getDPS = (hero: Hero, level: number) => calculateDPS(hero, level, includeBonus.value)
// 续航相关计算函数
const getMana = (hero: Hero, level: number) => calculateMana(hero, level, includeBonus.value)
const getHPRegen = (hero: Hero, level: number) => calculateHPRegen(hero, level, includeBonus.value)
const getManaRegen = (hero: Hero, level: number) => calculateManaRegen(hero, level, includeBonus.value)
// BAT（固定值，不随等级变化）
const getBAT = (hero: Hero, _level: number) => hero.attackRate || 1.7
// 攻速
const getAttackSpeed = (hero: Hero, level: number) => calculateAttackSpeed(hero, level, includeBonus.value)

// === 攻击距离 vs 血量 分析 ===
// 近战英雄统计
const meleeHeroStats = computed(() => {
  const melee = heroes.value.filter(h => h.attackType === 'melee')
  const hpValues = melee.map(h => getHP(h, 1))
  const avg = hpValues.length > 0 ? Math.round(hpValues.reduce((a, b) => a + b, 0) / hpValues.length) : 0
  return { count: melee.length, avgHp: avg }
})

// 远程英雄统计
const rangedHeroStats = computed(() => {
  const ranged = heroes.value.filter(h => h.attackType === 'ranged')
  const hpValues = ranged.map(h => getHP(h, 1))
  const avg = hpValues.length > 0 ? Math.round(hpValues.reduce((a, b) => a + b, 0) / hpValues.length) : 0
  return { count: ranged.length, avgHp: avg }
})

// 血量差距
const hpDifference = computed(() => meleeHeroStats.value.avgHp - rangedHeroStats.value.avgHp)
const hpDifferencePercent = computed(() => {
  if (rangedHeroStats.value.avgHp === 0) return 0
  return Math.round((hpDifference.value / rangedHeroStats.value.avgHp) * 100)
})

// 攻击距离 vs 血量散点图
const rangeVsHpChartOption = computed(() => {
  const meleeData = heroes.value
    .filter(h => h.attackType === 'melee')
    .map(h => [h.attackRange || 150, getHP(h, 1), h.localizedName || h.name])
  const rangedData = heroes.value
    .filter(h => h.attackType === 'ranged')
    .map(h => [h.attackRange || 500, getHP(h, 1), h.localizedName || h.name])

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.data[2]}<br/>攻击距离: ${params.data[0]}<br/>血量: ${params.data[1]}`
    },
    grid: { left: '5%', right: '15%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      name: '攻击距离',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    yAxis: {
      type: 'value',
      name: '1级血量',
      axisLabel: { color: '#7f8c8d' },
      splitLine: { lineStyle: { color: '#f1f2f6' } }
    },
    legend: { data: ['近战英雄', '远程英雄'], right: 10, orient: 'vertical' },
    series: [
      {
        name: '近战英雄',
        type: 'scatter',
        data: meleeData,
        symbolSize: 12,
        itemStyle: { color: '#e74c3c', opacity: 0.7 }
      },
      {
        name: '远程英雄',
        type: 'scatter',
        data: rangedData,
        symbolSize: 12,
        itemStyle: { color: '#3498db', opacity: 0.7 }
      }
    ]
  }
})

// === 综合分析相关计算函数 ===
// 排除的英雄
const TTK_EXCLUDE = ['美杜莎']

// 过滤后的英雄列表（用于TTK计算）
const filteredHeroesForTTK = computed(() => {
  return heroes.value.filter(h => !TTK_EXCLUDE.includes(h.localizedName || h.name) && !TTK_EXCLUDE.includes(h.name))
})

// 被平均DPS击杀时间
const getSurvivalTime = (hero: Hero, level: number) => {
  return calculateSurvivalTime(hero, level, filteredHeroesForTTK.value, includeBonus.value)
}

// 击杀其他英雄的时间（选中攻击者后）
const getKillTimeAsAttacker = computed(() => {
  const attacker = filteredHeroesForTTK.value.find(h => h.name === killOthersSelected.value)
  if (!attacker) return (_target: Hero, _level: number) => 0
  return (target: Hero, level: number) => calculateKillTime(attacker, target, level, includeBonus.value)
})

// 被其他英雄击杀的时间（选中目标后）
const getKillTimeAsTarget = computed(() => {
  const target = filteredHeroesForTTK.value.find(h => h.name === killedBySelected.value)
  if (!target) return (_attacker: Hero, _level: number) => 0
  return (attacker: Hero, level: number) => calculateKillTime(attacker, target, level, includeBonus.value)
})

// 击杀其他英雄的时间分布（箱线图）
const getKillOthersValues = (hero: Hero, allHeroes: Hero[], level: number) => {
  return allHeroes.map(target => calculateKillTime(hero, target, level, includeBonus.value))
}

// 被其他英雄击杀的时间分布（箱线图）
const getKilledByValues = (hero: Hero, allHeroes: Hero[], level: number) => {
  return allHeroes.map(attacker => calculateKillTime(attacker, hero, level, includeBonus.value))
}

// 选中的攻击者信息
const selectedAttackerInfo = computed(() => {
  const attacker = filteredHeroesForTTK.value.find(h => h.name === killOthersSelected.value)
  if (!attacker) return null
  return {
    name: attacker.localizedName || attacker.name,
    dps: calculateDPS(attacker, ttkLevel.value, includeBonus.value)
  }
})

// 选中的目标信息
const selectedTargetInfo = computed(() => {
  const target = filteredHeroesForTTK.value.find(h => h.name === killedBySelected.value)
  if (!target) return null
  return {
    name: target.localizedName || target.name,
    ehp: calculatePhysicalEHP(target, ttkLevel.value, includeBonus.value)
  }
})
</script>

<template>
  <AnalysisLayout
    title="英雄数值分析"
    subtitle="分析英雄生存、输出、续航等核心数值与成长曲线"
    :tabs="tabs"
    default-tab="survival"
  >
    <!-- ===== A. 生存能力 ===== -->
    <template #survival>
      <ChartLayout :toc-items="survivalTocItems">
        <div class="intro-section">
          <h3>🛡️ 生存能力分析</h3>
          <p>分析英雄的生命值、防御（护甲/魔抗）、以及等效生命值（EHP），揭示英雄的生存设计规律。</p>
        </div>

        <!-- 黄点设置 -->
        <div class="settings-box">
          <el-checkbox v-model="includeBonus">
            <strong>计算黄点（属性加成）</strong>
          </el-checkbox>
          <span class="settings-hint">
            黄点在15/16/17/19/20/21/22级各+2全属性，满级+14。影响：+308 HP、+2.34护甲、+1.4%魔抗
          </span>
        </div>

        <!-- === 第一部分：生命值 === -->
        <div id="survival-hp" class="section-divider blue">
          <h2>📊 第一部分：生命值</h2>
        </div>

        <!-- A1.1 生命值分布 -->
        <section id="survival-hp-dist" class="chart-section">
          <h3>A1.1 生命值分布与成长</h3>
          <p class="formula">生命值 = 基础生命 + 力量 × 22</p>
          <LevelSlider v-model="hpLevel" />
          <HeroBarChart
            :heroes="heroes"
            :level="hpLevel"
            :value-getter="getHP"
            title="英雄生命值排行"
            unit=" HP"
          />
          <AnalysisBox
            :heroes="heroes"
            :level="hpLevel"
            title="生命值"
            :value-getter="getHP"
            unit=""
            :exclude-heroes="HP_EXCLUDE"
            exclude-note="已排除美杜莎（基础力量为0，生存能力依赖魔法盾技能）"
          >
            <template #insight>
              💡 力量英雄平均生命值最高，智力英雄最低。生命值差距体现了Dota2通过血量差异化定义"生存定位"。
            </template>
          </AnalysisBox>
        </section>

        <!-- A1.2 生命值成长曲线 -->
        <section id="survival-hp-curve" class="chart-section">
          <h3>A1.2 生命值成长曲线（1-30级）</h3>
          <p class="formula">选择英雄对比其生命值随等级的变化</p>
          <HeroSelector
            v-model="hpCurveSelected"
            :heroes="heroes"
          />
          <HeroLineChart
            :heroes="heroes"
            :selected-heroes="hpCurveSelected"
            title="生命值成长曲线"
            y-axis-name="生命值"
            :value-getter="getHP"
          />
        </section>

        <!-- 第一部分：生命值 小结 -->
        <AnalysisKeyLevelTable
          :heroes="heroes"
          title="生命值"
          :value-getter="getHP"
          :exclude-heroes="HP_EXCLUDE"
        />

        <!-- === 第二部分：防御 === -->
        <div id="survival-defense" class="section-divider green">
          <h2>🛡️ 第二部分：防御</h2>
        </div>

        <!-- A2.1 护甲分布 -->
        <section id="survival-armor" class="chart-section">
          <h3>A2.1 护甲分布与成长</h3>
          <p class="formula">护甲 = 基础护甲 + 敏捷 × 0.167 | 物理减伤 = 0.06×护甲 / (1+0.06×护甲)</p>
          <LevelSlider v-model="armorLevel" />
          <HeroBarChart
            :heroes="heroes"
            :level="armorLevel"
            :value-getter="getArmor"
            title="英雄护甲排行"
            unit=" 护甲"
          />
          <AnalysisBox
            :heroes="heroes"
            :level="armorLevel"
            title="护甲"
            :value-getter="getArmor"
            unit=""
            :exclude-heroes="ARMOR_EXCLUDE"
            exclude-note="已排除小小（无敏捷成长）"
          >
            <template #insight>
              💡 每点护甲提供6%的EHP加成。10护甲≈37.5%减伤，20护甲≈54.5%减伤。敏捷英雄平均护甲最高。
            </template>
          </AnalysisBox>
        </section>

        <!-- A2.2 护甲成长曲线 -->
        <section id="survival-armor-curve" class="chart-section">
          <h3>A2.2 护甲成长曲线（1-30级）</h3>
          <p class="formula">选择英雄对比其护甲随等级的变化</p>
          <HeroSelector
            v-model="armorCurveSelected"
            :heroes="heroes"
          />
          <HeroLineChart
            :heroes="heroes"
            :selected-heroes="armorCurveSelected"
            title="护甲成长曲线"
            y-axis-name="护甲"
            :value-getter="getArmor"
          />
        </section>

        <!-- A2.3 魔抗分布 -->
        <section id="survival-mr" class="chart-section">
          <h3>A2.3 魔抗分布与成长</h3>
          <p class="formula">魔抗 = 基础魔抗(25%) + 智力 × 0.1%</p>
          <LevelSlider v-model="mrLevel" />
          <HeroBarChart
            :heroes="heroes"
            :level="mrLevel"
            :value-getter="getMR"
            title="英雄魔抗排行"
            unit="%"
          />
          <AnalysisBox
            :heroes="heroes"
            :level="mrLevel"
            title="魔抗"
            :value-getter="getMR"
            unit="%"
            :exclude-heroes="MR_EXCLUDE"
            exclude-note="已排除食人魔魔法师（无智力成长）"
          >
            <template #insight>
              💡 智力英雄平均魔抗最高，因为智力提供魔抗加成。
            </template>
          </AnalysisBox>
        </section>

        <!-- A2.4 魔抗成长曲线 -->
        <section id="survival-mr-curve" class="chart-section">
          <h3>A2.4 魔抗成长曲线（1-30级）</h3>
          <p class="formula">选择英雄对比其魔抗随等级的变化</p>
          <HeroSelector
            v-model="mrCurveSelected"
            :heroes="heroes"
          />
          <HeroLineChart
            :heroes="heroes"
            :selected-heroes="mrCurveSelected"
            title="魔抗成长曲线"
            y-axis-name="魔抗(%)"
            :value-getter="getMR"
          />
        </section>

        <!-- 第二部分：防御 小结 -->
        <AnalysisKeyLevelTable
          :heroes="heroes"
          title="护甲"
          :value-getter="getArmor"
          :precision="1"
          :exclude-heroes="[...HP_EXCLUDE, ...ARMOR_EXCLUDE]"
        />
        <AnalysisKeyLevelTable
          :heroes="heroes"
          title="魔抗"
          unit="%"
          :value-getter="getMR"
          :precision="1"
          :exclude-heroes="[...HP_EXCLUDE, ...MR_EXCLUDE]"
        />

        <!-- === 第三部分：等效生命值 === -->
        <div id="survival-ehp" class="section-divider purple">
          <h2>💜 第三部分：等效生命值（EHP）</h2>
        </div>

        <!-- A3.1 物理EHP分布 -->
        <section id="survival-pehp" class="chart-section">
          <h3>A3.1 物理EHP分布与成长</h3>
          <p class="formula">物理EHP = 生命值 × (1 + 0.06 × 护甲)</p>
          <LevelSlider v-model="ehpLevel" />
          <HeroBarChart
            :heroes="heroes"
            :level="ehpLevel"
            :value-getter="getPhysicalEHP"
            title="物理EHP排行"
            unit=" EHP"
          />
          <AnalysisBox
            :heroes="heroes"
            :level="ehpLevel"
            title="物理EHP"
            :value-getter="getPhysicalEHP"
            unit=""
          >
            <template #insight>
              💡 物理EHP综合了生命值和护甲的效果，是衡量英雄物理生存能力的核心指标。
            </template>
          </AnalysisBox>
        </section>

        <!-- A3.2 物理EHP曲线 -->
        <section id="survival-pehp-curve" class="chart-section">
          <h3>A3.2 物理EHP成长曲线（1-30级）</h3>
          <p class="formula">选择英雄对比其物理EHP随等级的变化</p>
          <HeroSelector
            v-model="ehpCurveSelected"
            :heroes="heroes"
          />
          <HeroLineChart
            :heroes="heroes"
            :selected-heroes="ehpCurveSelected"
            title="物理EHP成长曲线"
            y-axis-name="EHP"
            :value-getter="getPhysicalEHP"
          />
        </section>

        <!-- A3.3 魔法EHP分布 -->
        <section id="survival-mehp" class="chart-section">
          <h3>A3.3 魔法EHP分布与成长</h3>
          <p class="formula">魔法EHP = 生命值 / (1 - 魔抗%)</p>
          <LevelSlider v-model="mehpLevel" />
          <HeroBarChart
            :heroes="heroes"
            :level="mehpLevel"
            :value-getter="getMagicalEHP"
            title="魔法EHP排行"
            unit=" EHP"
          />
          <AnalysisBox
            :heroes="heroes"
            :level="mehpLevel"
            title="魔法EHP"
            :value-getter="getMagicalEHP"
            unit=""
          >
            <template #insight>
              💡 魔法EHP反映了英雄承受魔法伤害的能力。
            </template>
          </AnalysisBox>
        </section>

        <!-- A3.4 魔法EHP曲线 -->
        <section id="survival-mehp-curve" class="chart-section">
          <h3>A3.4 魔法EHP成长曲线（1-30级）</h3>
          <p class="formula">选择英雄对比其魔法EHP随等级的变化</p>
          <HeroSelector
            v-model="mehpCurveSelected"
            :heroes="heroes"
          />
          <HeroLineChart
            :heroes="heroes"
            :selected-heroes="mehpCurveSelected"
            title="魔法EHP成长曲线"
            y-axis-name="Magic EHP"
            :value-getter="getMagicalEHP"
          />
        </section>

        <!-- 第三部分：EHP 小结 -->
        <AnalysisKeyLevelTable
          :heroes="heroes"
          title="物理EHP"
          :value-getter="getPhysicalEHP"
          :exclude-heroes="HP_EXCLUDE"
        />
        <AnalysisKeyLevelTable
          :heroes="heroes"
          title="魔法EHP"
          :value-getter="getMagicalEHP"
          :exclude-heroes="HP_EXCLUDE"
        />
      </ChartLayout>
    </template>

    <!-- ===== B. 输出能力 ===== -->
    <template #damage>
      <ChartLayout :toc-items="damageTocItems">
        <div class="intro-section red">
          <h3>⚔️ 输出能力分析</h3>
          <p>分析英雄的攻击力、攻击速度、以及理论DPS，揭示英雄的输出设计规律。</p>
        </div>

        <!-- === 第一部分：攻击力 === -->
        <div id="damage-attack" class="section-divider red">
          <h2>💪 第一部分：攻击力</h2>
        </div>

        <!-- B1.1 攻击力分布 -->
        <section id="damage-attack-dist" class="chart-section">
          <h3>B1.1 攻击力分布与成长</h3>
          <p class="formula">攻击力 = 基础攻击力 + 主属性加成 (全能英雄按0.45×全属性计算)</p>
          <LevelSlider v-model="damageLevel" />
          <HeroBarChart
            :heroes="heroes"
            :level="damageLevel"
            :value-getter="getDamage"
            title="英雄攻击力排行"
            unit=" 点"
          />
          <AnalysisBox
            :heroes="heroes"
            :level="damageLevel"
            title="攻击力"
            :value-getter="getDamage"
            unit=""
          >
            <template #insight>
              💡 主属性直接影响攻击力，全能英雄的攻击力按0.45×全属性计算。
            </template>
          </AnalysisBox>
        </section>

        <!-- B1.2 攻击力成长曲线 -->
        <section id="damage-attack-curve" class="chart-section">
          <h3>B1.2 攻击力成长曲线（1-30级）</h3>
          <p class="formula">选择英雄对比其攻击力随等级的变化</p>
          <HeroSelector
            v-model="damageCurveSelected"
            :heroes="heroes"
          />
          <HeroLineChart
            :heroes="heroes"
            :selected-heroes="damageCurveSelected"
            title="攻击力成长曲线"
          y-axis-name="攻击力"
          :value-getter="getDamage"
        />
      </section>

      <!-- 第一部分：攻击力 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="攻击力"
        :value-getter="getDamage"
      />

      <!-- === 第二部分：攻速 === -->
      <div id="damage-speed" class="section-divider orange">
        <h2>⚡ 第二部分：攻速</h2>
      </div>

      <!-- B2 攻击速度 -->
      <section id="damage-bat" class="chart-section">
        <h3>B2.1 基础攻击间隔（BAT）排行</h3>
        <p class="formula">攻速 = (1 + 敏捷 × 0.01) / BAT | BAT越低攻速越快</p>
        <HeroBarChart
          :heroes="heroes"
          :level="1"
          :value-getter="getBAT"
          title="英雄BAT排行"
          unit=" 秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="1"
          title="BAT"
          :value-getter="getBAT"
          unit="秒"
        >
          <template #insight>
            💡 大多数英雄的BAT为1.7秒。BAT越低，相同敏捷下攻速越快，如Anti-Mage(1.4)、Alchemist变身(1.0)。
          </template>
        </AnalysisBox>
      </section>

      <!-- B2.2 攻速分布 -->
      <section id="damage-as-dist" class="chart-section">
        <h3>B2.2 攻速分布与成长</h3>
        <p class="formula">攻速 = (1 + 敏捷 × 0.01) / BAT</p>
        <LevelSlider v-model="attackSpeedLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="attackSpeedLevel"
          :value-getter="getAttackSpeed"
          title="英雄攻速排行"
          unit=" 次/秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="attackSpeedLevel"
          title="攻速"
          :value-getter="getAttackSpeed"
          unit="次/秒"
        >
          <template #insight>
            💡 敏捷英雄通常攻速最高，因为敏捷直接提升攻击速度。
          </template>
        </AnalysisBox>
      </section>

      <!-- B2.3 攻速成长曲线 -->
      <section id="damage-as-curve" class="chart-section">
        <h3>B2.3 攻速成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其攻速随等级的变化</p>
        <HeroSelector
          v-model="attackSpeedCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="attackSpeedCurveSelected"
          title="攻速成长曲线"
          y-axis-name="攻速(次/秒)"
          :value-getter="getAttackSpeed"
        />
      </section>

      <!-- 第二部分：攻速 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="攻速"
        :value-getter="getAttackSpeed"
        :precision="2"
        unit="次/秒"
      />

      <!-- === 第三部分：DPS === -->
      <div id="damage-dps" class="section-divider purple">
        <h2>🎯 第三部分：DPS</h2>
      </div>

      <!-- B3.1 DPS曲线 -->
      <section id="damage-dps-curve" class="chart-section">
        <h3>B3.1 理论DPS成长曲线（1-30级）</h3>
        <p class="formula">DPS = 攻击力 × 攻击次数/秒</p>
        <HeroSelector
          v-model="dpsCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="dpsCurveSelected"
          title="理论DPS成长曲线"
          y-axis-name="DPS"
          :value-getter="getDPS"
        />
      </section>

      <!-- B3.2 DPS排行榜 -->
      <section id="damage-dps-dist" class="chart-section">
        <h3>B3.2 DPS排行榜</h3>
        <LevelSlider v-model="dpsLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="dpsLevel"
          :value-getter="getDPS"
          title="理论DPS排行"
          unit=" DPS"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="dpsLevel"
          title="DPS"
          :value-getter="getDPS"
          unit=""
        >
          <template #insight>
            💡 DPS排行反映了英雄的白字输出能力。敏捷英雄通常DPS最高。
          </template>
        </AnalysisBox>
      </section>

      <!-- 第三部分：DPS 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="DPS"
        :value-getter="getDPS"
      />

      <!-- 输出能力页签总结 -->
      <SummaryBox title="输出能力分析总结" level="tab" color="red">
        <p>（分析内容待补充：攻击力、攻速、DPS三者关系，敏捷英雄输出优势等）</p>
      </SummaryBox>
      </ChartLayout>
    </template>

    <!-- ===== C. 续航分析 ===== -->
    <template #sustain>
      <ChartLayout :toc-items="sustainTocItems">
        <div class="intro-section cyan">
          <h3>💧 续航分析</h3>
        <p>分析英雄的魔法值、生命恢复、魔法恢复，揭示英雄的续航设计规律。</p>
      </div>

      <!-- 黄点设置 -->
      <div class="settings-box">
        <el-checkbox v-model="includeBonus">
          <strong>计算黄点（属性加成）</strong>
        </el-checkbox>
        <span class="settings-hint">
          黄点在15/16/17/19/20/21/22级各+2全属性，满级+14。影响：+168魔法、+1.4回血、+0.7回蓝
        </span>
      </div>

      <!-- === 魔法值 === -->
      <div class="section-divider cyan">
        <h2>💙 第一部分：魔法值</h2>
      </div>

      <section class="chart-section">
        <h3>C1.1 魔法值分布与成长</h3>
        <p class="formula">魔法值 = 基础魔法 + 智力 × 12</p>
        <LevelSlider v-model="manaLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="manaLevel"
          :value-getter="getMana"
          title="英雄魔法值排行"
          unit=" MP"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="manaLevel"
          title="魔法值"
          :value-getter="getMana"
          unit=""
        >
          <template #insight>
            💡 智力英雄平均魔法值最高，这与其定位为法术型英雄相符。
          </template>
        </AnalysisBox>
      </section>

      <section class="chart-section">
        <h3>C1.2 魔法值成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其魔法值随等级的变化</p>
        <HeroSelector
          v-model="manaCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="manaCurveSelected"
          title="魔法值成长曲线"
          y-axis-name="魔法值"
          :value-getter="getMana"
        />
      </section>

      <!-- 第一部分：魔法值 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="魔法值"
        :value-getter="getMana"
      />

      <!-- === 生命恢复 === -->
      <div class="section-divider green">
        <h2>❤️ 第二部分：生命恢复</h2>
      </div>

      <section class="chart-section">
        <h3>C2.1 生命恢复分布与成长</h3>
        <p class="formula">生命恢复 = 基础生命恢复 + 力量 × 0.1</p>
        <LevelSlider v-model="hpRegenLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="hpRegenLevel"
          :value-getter="getHPRegen"
          title="英雄生命恢复排行"
          unit=" /秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="hpRegenLevel"
          title="生命恢复"
          :value-getter="getHPRegen"
          unit="/秒"
        >
          <template #insight>
            💡 力量英雄平均生命恢复最高，因为力量直接影响生命恢复速度。
          </template>
        </AnalysisBox>
      </section>

      <section class="chart-section">
        <h3>C2.2 生命恢复成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其生命恢复随等级的变化</p>
        <HeroSelector
          v-model="hpRegenCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="hpRegenCurveSelected"
          title="生命恢复成长曲线"
          y-axis-name="生命恢复/秒"
          :value-getter="getHPRegen"
        />
      </section>

      <!-- 第二部分：生命恢复 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="生命恢复"
        :value-getter="getHPRegen"
        :precision="1"
        unit="/秒"
      />

      <!-- === 魔法恢复 === -->
      <div class="section-divider blue">
        <h2>💎 第三部分：魔法恢复</h2>
      </div>

      <section class="chart-section">
        <h3>C3.1 魔法恢复分布与成长</h3>
        <p class="formula">魔法恢复 = 基础魔法恢复 + 智力 × 0.05</p>
        <LevelSlider v-model="manaRegenLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="manaRegenLevel"
          :value-getter="getManaRegen"
          title="英雄魔法恢复排行"
          unit=" /秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="manaRegenLevel"
          title="魔法恢复"
          :value-getter="getManaRegen"
          unit="/秒"
        >
          <template #insight>
            💡 智力英雄平均魔法恢复最高，因为智力直接影响魔法恢复速度。
          </template>
        </AnalysisBox>
      </section>

      <section class="chart-section">
        <h3>C3.2 魔法恢复成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其魔法恢复随等级的变化</p>
        <HeroSelector
          v-model="manaRegenCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="manaRegenCurveSelected"
          title="魔法恢复成长曲线"
          y-axis-name="魔法恢复/秒"
          :value-getter="getManaRegen"
        />
      </section>

      <!-- 第三部分：魔法恢复 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="魔法恢复"
        :value-getter="getManaRegen"
        :precision="1"
        unit="/秒"
      />
      </ChartLayout>
    </template>

    <!-- ===== D. 属性分析 ===== -->
    <template #attribute>
      <ChartLayout :toc-items="attributeTocItems">
        <div class="intro-section purple">
          <h3>📊 属性分析</h3>
          <p>分析英雄的主属性分布、近战/远程差异等基础属性维度。</p>
        </div>

        <!-- 主属性分布 -->
        <section id="attr-primary" class="chart-section">
        <h3>D1. 主属性类型分布</h3>
        <p class="formula">力量/敏捷/智力/全能英雄数量统计</p>
        <HeroPrimaryAttrPieChart :heroes="heroes" />
      </section>

      <!-- 近战vs远程 -->
      <section class="chart-section">
        <h3>D2. 近战 vs 远程 数值对比</h3>
        <p class="formula">对比两种攻击类型英雄的平均属性差异</p>
        <HeroMeleeRangedCompareChart :heroes="heroes" />
      </section>

      <!-- 属性成长分布 -->
      <section id="attr-growth" class="chart-section">
        <h3>D3. 属性成长分布</h3>
        <p class="formula">X轴：力量成长 | Y轴：敏捷成长 | 点大小：智力成长</p>
        <HeroAttributeGrowthChart :heroes="heroes" />
      </section>
      </ChartLayout>
    </template>

    <!-- ===== E. 其他 ===== -->
    <template #misc>
      <ChartLayout :toc-items="miscTocItems">
        <div class="intro-section orange">
          <h3>🔧 其他分析</h3>
          <p>攻击距离、移动速度等其他维度分析。</p>
        </div>

        <!-- 攻击距离 -->
        <section id="misc-range" class="chart-section">
          <h3>E1. 攻击距离分布</h3>
          <p class="formula">近战英雄通常攻击距离为150，远程英雄差异较大</p>
          <HeroAttackRangeChart :heroes="heroes" />
        </section>

        <!-- 移动速度 -->
        <section id="misc-speed" class="chart-section">
          <h3>E2. 移动速度分布</h3>
          <p class="formula">基础移动速度范围：270-335</p>
          <HeroMoveSpeedChart :heroes="heroes" />
        </section>

        <!-- 移速vs攻击距离 -->
        <section id="misc-speed-range" class="chart-section">
          <h3>E3. 移动速度 vs 攻击距离</h3>
          <p class="formula">验证假设：远程英雄是否移动速度更慢？</p>
          <HeroSpeedVsRangeChart :heroes="heroes" />
        </section>

        <!-- E4. 攻击距离 vs 血量 -->
        <section id="misc-hp-range" class="chart-section">
          <h3>E4. 攻击距离与血量对比</h3>
          <p class="formula">对比近战英雄与远程英雄的血量差异（1级）</p>
          
          <!-- 近战/远程血量统计 -->
          <div class="range-hp-stats">
            <div class="stat-card melee">
              <span class="stat-icon">⚔️</span>
              <div class="stat-info">
                <span class="stat-label">近战英雄</span>
                <span class="stat-value">{{ meleeHeroStats.count }}个</span>
              </div>
              <div class="stat-detail">
                <span>平均血量: <strong>{{ meleeHeroStats.avgHp }}</strong></span>
              </div>
            </div>
            <div class="stat-card ranged">
              <span class="stat-icon">🏹</span>
              <div class="stat-info">
                <span class="stat-label">远程英雄</span>
                <span class="stat-value">{{ rangedHeroStats.count }}个</span>
              </div>
              <div class="stat-detail">
                <span>平均血量: <strong>{{ rangedHeroStats.avgHp }}</strong></span>
              </div>
            </div>
            <div class="stat-card diff">
              <span class="stat-icon">📊</span>
              <div class="stat-info">
                <span class="stat-label">血量差距</span>
                <span class="stat-value">{{ hpDifference }}</span>
              </div>
              <div class="stat-detail">
                <span>近战比远程高 <strong>{{ hpDifferencePercent }}%</strong></span>
              </div>
            </div>
          </div>
          
          <!-- 散点图 -->
          <div class="chart-card">
            <ClientOnly>
              <VChart v-if="rangeVsHpChartOption" :option="rangeVsHpChartOption" autoresize style="width: 100%; height: 400px" />
            </ClientOnly>
          </div>
        </section>
      </ChartLayout>
    </template>

    <!-- ===== F. 综合分析 ===== -->
    <template #synthesis>
      <ChartLayout :toc-items="synthesisTocItems">
        <div class="intro-section synthesis">
          <h3>📊 综合分析</h3>
          <p>综合所有维度，分析英雄基础数值的设计规律与平衡逻辑。</p>
        </div>

        <!-- === 击杀时间分析 === -->
        <div id="synth-ttk" class="section-divider red">
          <h2>⚔️ 第一部分：击杀时间分析（TTK）</h2>
        </div>

      <!-- 黄点设置 -->
      <div class="settings-box">
        <el-checkbox v-model="includeBonus">
          <strong>计算黄点（属性加成）</strong>
        </el-checkbox>
      </div>

      <!-- ===== 1.1 英雄与平均DPS ===== -->
      <div class="section-divider blue">
        <h2>💙 1.1 英雄与平均DPS的关系</h2>
      </div>

      <section class="chart-section">
        <h3>1.1.1 被平均DPS击杀时间排行</h3>
        <p class="formula">生存时间 = 物理EHP ÷ 平均DPS（已排除美杜莎）</p>
        <LevelSlider v-model="ttkLevel" />
        <HeroBarChart
          :heroes="filteredHeroesForTTK"
          :level="ttkLevel"
          :value-getter="getSurvivalTime"
          title="被平均DPS击杀时间排行"
          unit=" 秒"
        />
      </section>

      <section class="chart-section">
        <h3>1.1.2 被平均DPS击杀时间成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其被平均DPS击杀时间随等级的变化</p>
        <HeroSelector
          v-model="survivalCurveSelected"
          :heroes="filteredHeroesForTTK"
        />
        <HeroLineChart
          :heroes="filteredHeroesForTTK"
          :selected-heroes="survivalCurveSelected"
          title="被平均DPS击杀时间成长曲线"
          y-axis-name="被击杀时间(秒)"
          :value-getter="getSurvivalTime"
        />
        <HeroCurveAnalysisBox
          :heroes="filteredHeroesForTTK"
          :selected-heroes="survivalCurveSelected"
          title="被击杀时间"
          :value-getter="getSurvivalTime"
          unit="秒"
        />
      </section>

      <!-- ===== 1.2 英雄与英雄之间的对抗关系 ===== -->
      <div class="section-divider orange">
        <h2>⚔️ 1.2 英雄与英雄之间的对抗关系</h2>
      </div>

      <!-- 击杀其他英雄 -->
      <section class="chart-section">
        <h3>1.2.1 击杀其他英雄</h3>
        <p class="formula">击杀时间 = 目标物理EHP ÷ 自身DPS（已排除美杜莎）</p>
        <div class="chart-controls">
          <div class="control-row">
            <span class="control-label">选择攻击者：</span>
            <HeroSingleSelect
              v-model="killOthersSelected"
              :heroes="filteredHeroesForTTK"
              :exclude-heroes="TTK_EXCLUDE"
            />
          </div>
          <div v-if="selectedAttackerInfo" class="control-row control-info-row">
            <span class="control-info">DPS: {{ selectedAttackerInfo.dps.toFixed(1) }}</span>
          </div>
          <div class="control-row">
            <LevelSlider v-model="ttkLevel" class="control-slider" />
          </div>
        </div>
        <HeroBarChart
          v-if="killOthersSelected"
          :heroes="filteredHeroesForTTK"
          :level="ttkLevel"
          :value-getter="getKillTimeAsAttacker"
          title="击杀其他英雄的时间排行"
          unit=" 秒"
        />
        <div v-else class="chart-placeholder">请选择攻击者英雄</div>
      </section>

      <section class="chart-section">
        <h3>1.2.2 击杀其他英雄的时间分布（箱线图）</h3>
        <p class="formula">每个英雄击杀所有英雄所需时间的分布（已排除美杜莎）</p>
        <LevelSlider v-model="ttkLevel" />
        <HeroBoxplotChart
          :heroes="filteredHeroesForTTK"
          :level="ttkLevel"
          title="击杀其他英雄的时间分布"
          y-axis-name="击杀时间(秒)"
          :values-getter="getKillOthersValues"
          sort-order="asc"
          :exclude-heroes="TTK_EXCLUDE"
        />
      </section>

      <!-- 被其他英雄击杀 -->
      <section class="chart-section">
        <h3>1.2.3 被其他英雄击杀</h3>
        <p class="formula">被击杀时间 = 自身物理EHP ÷ 攻击者DPS（已排除美杜莎）</p>
        <div class="chart-controls">
          <div class="control-row">
            <span class="control-label">选择目标：</span>
            <HeroSingleSelect
              v-model="killedBySelected"
              :heroes="filteredHeroesForTTK"
              :exclude-heroes="TTK_EXCLUDE"
            />
          </div>
          <div v-if="selectedTargetInfo" class="control-row control-info-row">
            <span class="control-info">物理EHP: {{ selectedTargetInfo.ehp.toFixed(0) }}</span>
          </div>
          <div class="control-row">
            <LevelSlider v-model="ttkLevel" class="control-slider" />
          </div>
        </div>
        <HeroBarChart
          v-if="killedBySelected"
          :heroes="filteredHeroesForTTK"
          :level="ttkLevel"
          :value-getter="getKillTimeAsTarget"
          title="被其他英雄击杀的时间排行"
          unit=" 秒"
        />
        <div v-else class="chart-placeholder">请选择目标英雄</div>
      </section>

      <section class="chart-section">
        <h3>1.2.4 被其他英雄击杀的时间分布（箱线图）</h3>
        <p class="formula">该英雄被所有英雄击杀所需时间的分布（已排除美杜莎）</p>
        <LevelSlider v-model="ttkLevel" />
        <HeroBoxplotChart
          :heroes="filteredHeroesForTTK"
          :level="ttkLevel"
          title="被其他英雄击杀的时间分布"
          y-axis-name="被击杀时间(秒)"
          :values-getter="getKilledByValues"
          sort-order="desc"
          :exclude-heroes="TTK_EXCLUDE"
        />
      </section>

      <!-- 综合总结 -->
      <SummaryBox title="英雄基础数值综合分析" level="global">
        <p>（综合分析内容待补充：跨维度对比、设计规律总结、对游戏理解的指导意义等）</p>
      </SummaryBox>
      </ChartLayout>
    </template>
  </AnalysisLayout>
</template>

<style scoped>
.formula {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.settings-box {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.settings-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.section-divider {
  padding: 0.8rem 1.2rem;
  margin: 1.5rem 0 1rem;
  border-radius: 4px;
}

.section-divider h2 {
  margin: 0;
  color: #fff;
  font-size: 1.2rem;
  border: none;
  padding: 0;
}

.section-divider.blue {
  background: linear-gradient(90deg, #3498db 0%, transparent 100%);
}

.section-divider.green {
  background: linear-gradient(90deg, #27ae60 0%, transparent 100%);
}

.section-divider.purple {
  background: linear-gradient(90deg, #9b59b6 0%, transparent 100%);
}

.section-divider.red {
  background: linear-gradient(90deg, #e74c3c 0%, transparent 100%);
}

.section-divider.cyan {
  background: linear-gradient(90deg, #17a2b8 0%, transparent 100%);
}

.section-divider.orange {
  background: linear-gradient(90deg, #e67e22 0%, transparent 100%);
}

.intro-section {
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

.intro-section h3 {
  color: #fff;
  border: none;
  padding: 0;
  margin-bottom: 0.5rem;
}

.intro-section p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.intro-section.red {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.intro-section.purple {
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
}

.intro-section.cyan {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
}

.intro-section.orange {
  background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
}

.intro-section.synthesis {
  background: linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%);
}

.tab-btn.synthesis {
  background: linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%);
  color: #fff;
}

.tab-btn.synthesis:hover {
  background: linear-gradient(135deg, #5f27cd 0%, #4a1fad 100%);
}

.hero-select {
  padding: 0.5rem 1rem;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: white;
  color: #2c3e50;
  font-size: 0.9rem;
  min-width: 200px;
}

.chart-section-inline {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.chart-controls {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.control-row:last-child {
  margin-bottom: 0;
}

.control-label {
  color: #7f8c8d;
  font-size: 0.9rem;
  white-space: nowrap;
}

.control-slider {
  flex: 1;
  max-width: 400px;
}

.control-info-row {
  padding-left: 5.5em;
}

.control-info {
  color: #3498db;
  font-size: 0.85rem;
  background: #e8f4fc;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

.selected-info {
  background: #f0f8ff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  color: #2c3e50;
  font-size: 0.9rem;
  border-left: 3px solid #3498db;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #7f8c8d;
  font-size: 0.9rem;
}

/* 攻击距离 vs 血量 统计卡片 */
.range-hp-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.range-hp-stats .stat-card {
  flex: 1;
  min-width: 180px;
  background: #fff;
  border-radius: 12px;
  padding: 1rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}

.range-hp-stats .stat-card.melee {
  border-left: 4px solid #e74c3c;
}

.range-hp-stats .stat-card.ranged {
  border-left: 4px solid #3498db;
}

.range-hp-stats .stat-card.diff {
  border-left: 4px solid #27ae60;
}

.range-hp-stats .stat-icon {
  font-size: 1.8rem;
}

.range-hp-stats .stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.range-hp-stats .stat-label {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.range-hp-stats .stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.range-hp-stats .stat-detail {
  margin-left: auto;
  font-size: 0.9rem;
  color: #555;
}

.range-hp-stats .stat-detail strong {
  color: #2c3e50;
}

.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}
</style>
