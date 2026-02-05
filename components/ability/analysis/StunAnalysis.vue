<template>
  <div class="stun-analysis">
    <div v-if="loading" class="loading-state">
      <p>加载中...</p>
    </div>

    <template v-else>
      <!-- 概览卡片 -->
      <div class="overview-cards">
        <div class="stat-card">
          <div class="stat-value">{{ stunAbilities.length }}</div>
          <div class="stat-label">眩晕技能总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ medianStunDuration.toFixed(2) }}s</div>
          <div class="stat-label">眩晕时间中位数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ maxStunAbility?.maxStunDuration.toFixed(1) }}s</div>
          <div class="stat-label">最长眩晕 ({{ maxStunAbility?.nameZh || maxStunAbility?.name }})</div>
        </div>
      </div>
      
      <!-- 大招/小技能统计 -->
      <div class="ult-stats">
        <div class="ult-stat-card normal">
          <div class="ult-stat-header">⚔️ 小技能</div>
          <div class="ult-stat-row">
            <span>数量: {{ normalStats.count }}</span>
            <span>平均: {{ normalStats.avg.toFixed(2) }}s</span>
            <span>中位: {{ normalStats.median.toFixed(2) }}s</span>
          </div>
        </div>
        <div class="ult-stat-card ultimate">
          <div class="ult-stat-header">💫 大招</div>
          <div class="ult-stat-row">
            <span>数量: {{ ultStats.count }}</span>
            <span>平均: {{ ultStats.avg.toFixed(2) }}s</span>
            <span>中位: {{ ultStats.median.toFixed(2) }}s</span>
          </div>
        </div>
      </div>

      <!-- 第一部分：眩晕与英雄射程 -->
      <section class="chart-section">
        <h3>1. 眩晕技能与英雄攻击距离</h3>
        <p class="description">分析近战/远程英雄的眩晕技能分布</p>
        <div class="range-stats">
          <span class="stat-badge melee">🗡️ 近战英雄: {{ meleeCount }} 个技能</span>
          <span class="stat-badge ranged">🏹 远程英雄: {{ rangedCount }} 个技能</span>
        </div>
        <div class="chart-container">
          <VChart :option="rangeChartOption" autoresize />
        </div>
        <div class="insight-box">
          <p><strong>💡 洞察：</strong>{{ rangeInsight }}</p>
        </div>
      </section>

      <!-- 第二部分：眩晕与伤害 -->
      <section class="chart-section">
        <h3>2. 眩晕时间与技能伤害</h3>
        <p class="description">分析眩晕时间与伤害的权衡关系</p>
        <div class="chart-container">
          <VChart :option="damageChartOption" autoresize />
        </div>
        <div class="insight-box">
          <p><strong>💡 洞察：</strong>{{ damageInsight }}</p>
        </div>
      </section>

      <!-- 第三部分：眩晕与主属性 -->
      <section class="chart-section">
        <h3>3. 眩晕技能与英雄主属性</h3>
        <p class="description">各主属性英雄的控制能力分布</p>
        <div class="chart-row">
          <div class="chart-container half">
            <VChart :option="attrPieOption" autoresize />
          </div>
          <div class="chart-container half">
            <VChart :option="attrBarOption" autoresize />
          </div>
        </div>
        <div class="insight-box">
          <p><strong>💡 洞察：</strong>{{ attrInsight }}</p>
        </div>
      </section>

      <!-- 第四部分：眩晕类型统计 -->
      <section class="chart-section">
        <h3>4. 眩晕类型分布</h3>
        <p class="description">眩晕、变羊、缠绕等控制类型统计</p>
        <div class="chart-container">
          <VChart :option="typeChartOption" autoresize />
        </div>
      </section>

      <!-- 详细数据表 -->
      <section class="chart-section">
        <h3>5. 眩晕技能详细列表</h3>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>技能</th>
                <th>英雄</th>
                <th>眩晕时间</th>
                <th>类型</th>
                <th>主属性</th>
                <th>攻击距离</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ability in sortedAbilities" :key="ability.internalName">
                <td>{{ ability.nameZh || ability.name }}</td>
                <td>{{ ability.heroNameZh }}</td>
                <td>{{ ability.maxStunDuration.toFixed(1) }}s</td>
                <td>{{ getStunTypeLabel(ability.stunType) }}</td>
                <td>{{ getPrimaryAttrLabel(ability.heroPrimaryAttr) }}</td>
                <td>{{ ability.heroAttackRange }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import VChart from 'vue-echarts'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'
import type { StunAbilityInfo, StunTraitDataMap } from '~/types/traits/stun'
import type { AbilityDamageInfo } from '~/composables/useAbilityDamageAnalyzer'

interface Props {
  loading: boolean
  stunAbilities: StunAbilityInfo[]
  damageList: AbilityDamageInfo[]
}

const props = defineProps<Props>()

// 从 damageList 构建伤害期望映射
const damageExpectMap = computed(() => {
  const map = new Map<string, number>()
  props.damageList.forEach(d => {
    if (d.damage && d.damage > 0) {
      map.set(d.name, d.damage)
    }
  })
  return map
})

// 计算统计数据
const avgStunDuration = computed(() => {
  if (props.stunAbilities.length === 0) return 0
  const total = props.stunAbilities.reduce((sum, a) => sum + a.maxStunDuration, 0)
  return total / props.stunAbilities.length
})

const maxStunAbility = computed(() => {
  if (props.stunAbilities.length === 0) return null
  return props.stunAbilities.reduce((max, a) => a.maxStunDuration > max.maxStunDuration ? a : max)
})

// 计算中位数的辅助函数
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// 中位数
const medianStunDuration = computed(() => {
  return calculateMedian(props.stunAbilities.map(a => a.maxStunDuration))
})

// 大招/小技能统计
const normalStats = computed(() => {
  const abilities = props.stunAbilities.filter(a => !a.isUltimate)
  const durations = abilities.map(a => a.maxStunDuration)
  return {
    count: abilities.length,
    avg: durations.length > 0 ? durations.reduce((s, v) => s + v, 0) / durations.length : 0,
    median: calculateMedian(durations)
  }
})

const ultStats = computed(() => {
  const abilities = props.stunAbilities.filter(a => a.isUltimate)
  const durations = abilities.map(a => a.maxStunDuration)
  return {
    count: abilities.length,
    avg: durations.length > 0 ? durations.reduce((s, v) => s + v, 0) / durations.length : 0,
    median: calculateMedian(durations)
  }
})


const sortedAbilities = computed(() => {
  return [...props.stunAbilities].sort((a, b) => b.maxStunDuration - a.maxStunDuration)
})

// 近战/远程统计
const meleeCount = computed(() => props.stunAbilities.filter(a => a.heroAttackRange <= 200).length)
const rangedCount = computed(() => props.stunAbilities.filter(a => a.heroAttackRange > 200).length)


// 散点图：眩晕 vs 攻击距离
const rangeChartOption = computed(() => {
  if (!props.stunAbilities || props.stunAbilities.length === 0) return {}
  
  const meleeAbilities = props.stunAbilities.filter(a => a.heroAttackRange <= 200)
  const rangedAbilities = props.stunAbilities.filter(a => a.heroAttackRange > 200)
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data
        return `${data[2]}<br/>攻击距离: ${data[0]}<br/>眩晕时间: ${data[1]}s`
      }
    },
    legend: {
      data: ['近战英雄', '远程英雄']
    },
    xAxis: {
      name: '英雄攻击距离',
      type: 'value',
      min: 0
    },
    yAxis: {
      name: '眩晕时间(秒)',
      type: 'value',
      min: 0
    },
    series: [
      {
        name: '近战英雄',
        type: 'scatter',
        symbolSize: 12,
        data: meleeAbilities.map(a => [a.heroAttackRange, a.maxStunDuration, a.nameZh || a.name]),
        itemStyle: { color: '#e74c3c' }
      },
      {
        name: '远程英雄',
        type: 'scatter',
        symbolSize: 12,
        data: rangedAbilities.map(a => [a.heroAttackRange, a.maxStunDuration, a.nameZh || a.name]),
        itemStyle: { color: '#3498db' }
      }
    ]
  }
})

const rangeInsight = computed(() => {
  const meleeAbilities = props.stunAbilities.filter(a => a.heroAttackRange <= 200)
  const rangedAbilities = props.stunAbilities.filter(a => a.heroAttackRange > 200)
  const meleeAvg = meleeAbilities.length > 0 
    ? meleeAbilities.reduce((s, a) => s + a.maxStunDuration, 0) / meleeAbilities.length 
    : 0
  const rangedAvg = rangedAbilities.length > 0 
    ? rangedAbilities.reduce((s, a) => s + a.maxStunDuration, 0) / rangedAbilities.length 
    : 0
  
  if (meleeAvg > rangedAvg) {
    return `近战英雄平均眩晕时间(${meleeAvg.toFixed(2)}s)高于远程英雄(${rangedAvg.toFixed(2)}s)，可能是为了弥补接近目标的难度。`
  } else {
    return `远程英雄平均眩晕时间(${rangedAvg.toFixed(2)}s)高于或接近近战英雄(${meleeAvg.toFixed(2)}s)。`
  }
})

// 散点图：眩晕 vs 伤害（使用 damage.json 中的期望伤害）
const damageChartOption = computed(() => {
  if (!props.stunAbilities || props.stunAbilities.length === 0) return {}
  
  // 只显示在 damageList 中有数据的技能
  const withDamage = props.stunAbilities
    .map(a => ({
      ...a,
      expectedDamage: damageExpectMap.value.get(a.internalName) || 0
    }))
    .filter(a => a.expectedDamage > 0)
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data
        return `${data[2]}<br/>期望伤害: ${data[0]}<br/>眩晕时间: ${data[1]}s`
      }
    },
    xAxis: {
      name: '期望伤害',
      type: 'value',
      min: 0
    },
    yAxis: {
      name: '眩晕时间(秒)',
      type: 'value',
      min: 0
    },
    series: [{
      type: 'scatter',
      symbolSize: 12,
      data: withDamage.map(a => [a.expectedDamage, a.maxStunDuration, a.nameZh || a.name]),
      itemStyle: { color: '#9b59b6' }
    }]
  }
})

const damageInsight = computed(() => {
  return '眩晕技能通常在眩晕时间和伤害之间存在权衡关系。高眩晕时间的技能往往伤害较低，如狮子的妖术；而高伤害技能的眩晕时间相对较短。'
})

// 属性映射：支持 DOTA_ 格式和简短格式
const attrKeyMap: Record<string, keyof typeof ATTRIBUTE_COLORS> = {
  // DOTA_ 格式
  'DOTA_ATTRIBUTE_STRENGTH': 'strength',
  'DOTA_ATTRIBUTE_AGILITY': 'agility',
  'DOTA_ATTRIBUTE_INTELLECT': 'intelligence',
  'DOTA_ATTRIBUTE_ALL': 'universal',
  // 简短格式（直接映射）
  'strength': 'strength',
  'agility': 'agility',
  'intelligence': 'intelligence',
  'universal': 'universal'
}

// 饼图：主属性分布
const attrPieOption = computed(() => {
  if (!props.stunAbilities || props.stunAbilities.length === 0) return {}
  
  const attrCounts: Record<string, number> = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    universal: 0
  }
  
  props.stunAbilities.forEach(a => {
    const attr = attrKeyMap[a.heroPrimaryAttr] || 'universal'
    attrCounts[attr] = (attrCounts[attr] || 0) + 1
  })
  
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { name: ATTRIBUTE_NAMES.strength, value: attrCounts.strength, itemStyle: { color: ATTRIBUTE_COLORS.strength } },
        { name: ATTRIBUTE_NAMES.agility, value: attrCounts.agility, itemStyle: { color: ATTRIBUTE_COLORS.agility } },
        { name: ATTRIBUTE_NAMES.intelligence, value: attrCounts.intelligence, itemStyle: { color: ATTRIBUTE_COLORS.intelligence } },
        { name: ATTRIBUTE_NAMES.universal, value: attrCounts.universal, itemStyle: { color: ATTRIBUTE_COLORS.universal } }
      ].filter(d => d.value > 0),
      itemStyle: {
        borderRadius: 5,
        borderColor: '#fff',
        borderWidth: 2
      }
    }]
  }
})

// 柱状图：主属性平均眩晕时间
const attrBarOption = computed(() => {
  if (!props.stunAbilities || props.stunAbilities.length === 0) return {}
  
  const attrStats: Record<string, { total: number; count: number }> = {
    strength: { total: 0, count: 0 },
    agility: { total: 0, count: 0 },
    intelligence: { total: 0, count: 0 },
    universal: { total: 0, count: 0 }
  }
  
  props.stunAbilities.forEach(a => {
    const attr = attrKeyMap[a.heroPrimaryAttr] || 'universal'
    attrStats[attr].total += a.maxStunDuration
    attrStats[attr].count += 1
  })
  
  // 固定顺序：力量、敏捷、智力、全能
  const attrOrder: (keyof typeof ATTRIBUTE_COLORS)[] = ['strength', 'agility', 'intelligence', 'universal']
  const chartData = attrOrder.map(attr => ({
    name: ATTRIBUTE_NAMES[attr],
    value: attrStats[attr].count > 0 ? Number((attrStats[attr].total / attrStats[attr].count).toFixed(2)) : 0,
    color: ATTRIBUTE_COLORS[attr]
  })).filter(d => d.value > 0)
  
  return {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.name)
    },
    yAxis: {
      type: 'value',
      name: '平均眩晕时间(秒)'
    },
    series: [{
      type: 'bar',
      data: chartData.map(d => ({
        value: d.value,
        itemStyle: { color: d.color }
      }))
    }]
  }
})

const attrInsight = computed(() => {
  return '力量和智力英雄通常拥有更多的控制技能，这与它们的定位（前排控制、法师辅助）相符。敏捷英雄的眩晕技能相对较少，符合其输出定位。'
})

// 眩晕类型分布
const typeChartOption = computed(() => {
  if (!props.stunAbilities || props.stunAbilities.length === 0) return {}
  
  const typeCounts: Record<string, number> = {}
  props.stunAbilities.forEach(a => {
    typeCounts[a.stunType] = (typeCounts[a.stunType] || 0) + 1
  })
  
  const typeLabels: Record<string, string> = {
    'stun': '眩晕',
    'hex': '变羊',
    'root': '缠绕',
    'sleep': '睡眠',
    'taunt': '嘲讽',
    'channel_stun': '持续施法控制',
    'mini_stun': '小眩晕',
    'time_stop': '时间停止',
    'none': '无'
  }
  
  return {
    tooltip: { trigger: 'item' },
    xAxis: {
      type: 'category',
      data: Object.entries(typeCounts).map(([type]) => typeLabels[type] || type)
    },
    yAxis: { type: 'value', name: '技能数量' },
    series: [{
      type: 'bar',
      data: Object.values(typeCounts),
      itemStyle: { color: '#27ae60' }
    }]
  }
})

// 辅助函数
function getStunTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'stun': '眩晕',
    'hex': '变羊',
    'root': '缠绕',
    'sleep': '睡眠',
    'taunt': '嘲讽',
    'channel_stun': '持续施法',
    'mini_stun': '小眩晕',
    'time_stop': '时停',
    'none': '无'
  }
  return labels[type] || type
}

function getPrimaryAttrLabel(attr: string): string {
  const labels: Record<string, string> = {
    'DOTA_ATTRIBUTE_STRENGTH': '力量',
    'DOTA_ATTRIBUTE_AGILITY': '敏捷',
    'DOTA_ATTRIBUTE_INTELLECT': '智力',
    'DOTA_ATTRIBUTE_ALL': '全能'
  }
  return labels[attr] || '未知'
}
</script>

<style scoped>
.stun-analysis {
  padding: 1rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-top: 0.5rem;
}

.ult-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.ult-stat-card {
  flex: 1;
  padding: 1rem;
  border-radius: 10px;
  background: #f8f9fa;
}

.ult-stat-card.normal {
  border-left: 4px solid #3498db;
}

.ult-stat-card.ultimate {
  border-left: 4px solid #9b59b6;
}

.ult-stat-header {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.ult-stat-row {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: #555;
}

.chart-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-section h3 {
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.range-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-badge.melee {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.stat-badge.ranged {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
}

.chart-container {
  height: 400px;
}

.chart-container.half {
  height: 350px;
}

.chart-row {
  display: flex;
  gap: 1rem;
}

.chart-row .chart-container {
  flex: 1;
}

.insight-box {
  background: #f8f9fa;
  border-left: 4px solid #3498db;
  padding: 1rem;
  margin-top: 1rem;
  border-radius: 0 8px 8px 0;
}

.insight-box p {
  margin: 0;
  font-size: 0.9rem;
}

.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th,
.data-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.data-table tr:hover {
  background: #f5f5f5;
}

@media (max-width: 768px) {
  .chart-row {
    flex-direction: column;
  }
}
</style>
