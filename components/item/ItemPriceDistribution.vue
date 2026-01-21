<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner" />
    <span>加载数据中...</span>
  </div>

  <ChartLayout v-else :toc-items="tocItems">
    <!-- 介绍区块 -->
    <div class="intro-section">
      <h3>价格与属性分析</h3>
      <p>分析物品价格分布规律，建立属性基准价格体系，为溢价分析提供基础。</p>
    </div>

    <!-- ========== 价格概览 ========== -->
    <ChartSection id="price-overview" title="📊 价格概览" color="orange">
      <ChartStatsGrid :stats="priceStatsCards" />
      
      <ChartCard title="价格分布散点图（连续价格轴）">
        <ClientOnly>
          <VChart :option="scatterOption" autoresize style="width: 100%; height: 350px;" />
        </ClientOnly>
        <div class="chart-note">每个点代表一个物品，悬停查看详情</div>
      </ChartCard>
    </ChartSection>

    <!-- ========== 价格规律 ========== -->
    <ChartSection id="price-patterns" title="🔍 价格规律发现" color="blue">
      <div class="pattern-grid">
        <ChartCard title="📍 价格聚集区">
          <div v-if="priceAnalysis.clusters.length > 0" class="cluster-list">
            <div v-for="c in priceAnalysis.clusters" :key="c.price" class="pattern-item">
              <span class="price-tag">{{ c.price }}g</span>
              <span class="count-tag">{{ c.count }} 个</span>
            </div>
          </div>
          <div v-else class="no-data">无明显聚集区</div>
        </ChartCard>
        
        <ChartCard title="⚠️ 价格空白区">
          <div v-if="priceAnalysis.gaps.length > 0" class="gap-list">
            <div v-for="g in priceAnalysis.gaps" :key="g.from" class="pattern-item">
              <span class="range-tag">{{ g.from }}~{{ g.to }}g</span>
              <span class="gap-tag">空白{{ g.gap }}g</span>
            </div>
          </div>
          <div v-else class="no-data">无明显空白区</div>
        </ChartCard>
      </div>

      <!-- 价格阶梯分析 -->
      <ChartCard title="🔢 价格阶梯检测 (物品数 ≥2 的价格点)">
        <div class="tier-grid">
          <div v-for="tier in priceTiers" :key="tier.price" class="tier-tag" :class="{ highlight: tier.count >= 5 }">
            <span class="tier-price">{{ tier.price }}g</span>
            <span class="tier-count">×{{ tier.count }}</span>
          </div>
        </div>
      </ChartCard>
    </ChartSection>

    <!-- ========== 合成层级分析 ========== -->
    <ChartSection id="synthesis" title="🧩 合成层级分析" color="green">
      <ChartStatsGrid :stats="synthesisStats" />
      
      <ChartCard title="合成层级分布">
        <ClientOnly>
          <VChart :option="synthesisChartOption" autoresize style="width: 100%; height: 300px;" />
        </ClientOnly>
      </ChartCard>
    </ChartSection>

    <!-- ========== 卷轴/配方分析 ========== -->
    <ChartSection id="recipe" title="📜 卷轴配方分析" color="yellow">
      <ChartStatsGrid :stats="recipeStats" />
      
      <ChartCard title="卷轴占比分布">
        <ClientOnly>
          <VChart :option="recipeChartOption" autoresize style="width: 100%; height: 300px;" />
        </ClientOnly>
        <div class="chart-note">卷轴占比 = 卷轴价格 / 成品总价</div>
      </ChartCard>
    </ChartSection>

    <!-- 分析结论 -->
    <div class="insight-box">
      <h4>分析总结</h4>
      <ul>
        <li>共 {{ priceStats.total }} 个有价格物品，价格范围 {{ priceStats.min }}~{{ priceStats.max }}g</li>
        <li>平均价格 <strong>{{ priceStats.avg }}g</strong>，中位数 <strong>{{ priceStats.median }}g</strong></li>
      </ul>
    </div>
  </ChartLayout>
</template>

<script setup lang="ts">
import type { TocItem } from '~/components/chart/Layout.vue'
import type { StatItem } from '~/components/chart/StatsGrid.vue'

interface ItemData {
  name: string
  nameZh: string | null
  displayName: string
  cost: number
  quality: string | null
  components: string[] | null
  recipeCost: number
  attributes?: Record<string, number>
}

interface PricingItem {
  name: string
  unitPrice: number
  reference: string
  unit: string
}

interface PricingConfig {
  pricing: Record<string, PricingItem>
}

const props = defineProps<{
  items: ItemData[]
  loading?: boolean
}>()

// 目录配置
const tocItems: TocItem[] = [
  { id: 'price-overview', title: '📊 价格概览', level: 1 },
  { id: 'price-patterns', title: '🔍 价格规律', level: 1 },
  { id: 'synthesis', title: '🧩 合成层级', level: 1 },
  { id: 'recipe', title: '📜 卷轴分析', level: 1 },
]

// ========== 价格分析 ==========
const pricedItems = computed(() => props.items.filter(i => i.cost > 0))
const sortedByPrice = computed(() => [...pricedItems.value].sort((a, b) => a.cost - b.cost))

const priceStats = computed(() => {
  const prices = pricedItems.value.map(i => i.cost)
  if (prices.length === 0) return { total: 0, avg: 0, max: 0, min: 0, median: 0 }
  const sorted = [...prices].sort((a, b) => a - b)
  const sum = prices.reduce((a, b) => a + b, 0)
  return {
    total: prices.length,
    avg: Math.round(sum / prices.length),
    max: sorted[sorted.length - 1],
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)]
  }
})

const priceStatsCards = computed<StatItem[]>(() => [
  { label: '物品数量', value: priceStats.value.total },
  { label: '平均价格', value: `${priceStats.value.avg}g`, highlight: true, highlightColor: 'orange' },
  { label: '中位数', value: `${priceStats.value.median}g` },
  { label: '价格范围', value: `${priceStats.value.min}~${priceStats.value.max}g` },
])

const getPriceColor = (cost: number) => {
  if (cost >= 6000) return '#ef4444'
  if (cost >= 4000) return '#f59e0b'
  if (cost >= 2500) return '#8b5cf6'
  if (cost >= 1500) return '#3b82f6'
  return '#6b7280'
}

const scatterOption = computed(() => {
  const priceGroups = new Map<number, number>()
  const dataPoints = sortedByPrice.value.map((item) => {
    const count = priceGroups.get(item.cost) || 0
    priceGroups.set(item.cost, count + 1)
    return {
      name: item.nameZh || item.displayName,
      value: [item.cost, count],
      itemStyle: { color: getPriceColor(item.cost) }
    }
  })

  return {
    tooltip: { trigger: 'item', formatter: (params: any) => `<b>${params.name}</b><br/>价格: ${params.value[0]}g` },
    grid: { left: '3%', right: '4%', bottom: '12%', top: 20, containLabel: true },
    xAxis: {
      type: 'value', name: '价格 (金币)', nameLocation: 'middle', nameGap: 30, min: 0,
      max: Math.max(...pricedItems.value.map(i => i.cost)) + 500,
      axisLabel: { color: '#7f8c8d', formatter: (val: number) => val >= 1000 ? `${val/1000}k` : val },
      splitLine: { lineStyle: { color: '#f1f2f6', type: 'dashed' } }
    },
    yAxis: { type: 'value', show: false, min: -1, max: 8 },
    series: [{ type: 'scatter', symbolSize: 12, data: dataPoints, emphasis: { focus: 'self', itemStyle: { borderColor: '#1f2937', borderWidth: 2 } } }]
  }
})

const priceAnalysis = computed(() => {
  const prices = sortedByPrice.value.map(i => i.cost)
  if (prices.length < 2) return { clusters: [], gaps: [] }
  
  const gaps: { from: number, to: number, gap: number }[] = []
  for (let i = 1; i < prices.length; i++) {
    const gap = prices[i] - prices[i-1]
    if (gap > 300) gaps.push({ from: prices[i-1], to: prices[i], gap })
  }
  
  const priceCounts = new Map<number, number>()
  prices.forEach(p => priceCounts.set(p, (priceCounts.get(p) || 0) + 1))
  const clusters = [...priceCounts.entries()]
    .filter(([_, count]) => count >= 3)
    .map(([price, count]) => ({ price, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)
  
  return { clusters, gaps: gaps.sort((a, b) => b.gap - a.gap).slice(0, 8) }
})

// ========== 价格阶梯分析 ==========
const priceTiers = computed(() => {
  const priceCounts = new Map<number, number>()
  pricedItems.value.forEach(i => priceCounts.set(i.cost, (priceCounts.get(i.cost) || 0) + 1))
  const tiers = [...priceCounts.entries()]
    .filter(([_, count]) => count >= 2)
    .map(([price, count]) => ({ price, count, percent: 0 }))
    .sort((a, b) => a.price - b.price)
  const maxCount = Math.max(...tiers.map(t => t.count), 1)
  tiers.forEach(t => t.percent = Math.round((t.count / maxCount) * 100))
  return tiers
})

// ========== 合成层级分析 ==========
const basicItems = computed(() => pricedItems.value.filter(i => !i.components || i.components.length === 0).sort((a, b) => a.cost - b.cost))
const synthesizedItems = computed(() => pricedItems.value.filter(i => i.components && i.components.length > 0))

const synthesisStats = computed<StatItem[]>(() => [
  { label: '基础物品', value: basicItems.value.length },
  { label: '合成物品', value: synthesizedItems.value.length, highlight: true, highlightColor: 'green' },
  { label: '基础平均价', value: `${Math.round(basicItems.value.reduce((s, i) => s + i.cost, 0) / basicItems.value.length || 0)}g` },
  { label: '合成平均价', value: `${Math.round(synthesizedItems.value.reduce((s, i) => s + i.cost, 0) / synthesizedItems.value.length || 0)}g` },
])

const synthesisChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 'bottom' },
  series: [{
    type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
    data: [
      { value: basicItems.value.length, name: '基础物品', itemStyle: { color: '#6b7280' } },
      { value: synthesizedItems.value.length, name: '合成物品', itemStyle: { color: '#10b981' } },
    ],
    label: { show: true, formatter: '{b}: {c} ({d}%)' }
  }]
}))

// ========== 卷轴/配方分析 ==========
const itemsWithRecipe = computed(() => pricedItems.value.filter(i => i.recipeCost > 0).map(i => ({
  ...i, recipePercent: Math.round((i.recipeCost / i.cost) * 100)
})))

const highRecipeItems = computed(() => [...itemsWithRecipe.value].sort((a, b) => b.recipePercent - a.recipePercent).slice(0, 10))

const recipeStats = computed<StatItem[]>(() => {
  const total = itemsWithRecipe.value.length
  const avgPercent = total > 0 ? Math.round(itemsWithRecipe.value.reduce((s, i) => s + i.recipePercent, 0) / total) : 0
  const maxRecipe = total > 0 ? Math.max(...itemsWithRecipe.value.map(i => i.recipeCost)) : 0
  return [
    { label: '有卷轴物品', value: total },
    { label: '平均卷轴占比', value: `${avgPercent}%`, highlight: true, highlightColor: 'orange' },
    { label: '最高卷轴价', value: `${maxRecipe}g` },
    { label: '无卷轴物品', value: pricedItems.value.length - total },
  ]
})

const recipeChartOption = computed(() => {
  const sorted = [...itemsWithRecipe.value].sort((a, b) => a.recipePercent - b.recipePercent)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const p = params[0]
      const item = sorted[p.dataIndex]
      return `<b>${p.name}</b><br/>卷轴: ${item.recipeCost}g / ${item.cost}g<br/>占比: <b>${p.value}%</b>`
    }},
    grid: { left: '3%', right: '4%', bottom: '15%', top: 30, containLabel: true },
    xAxis: { 
      type: 'category', 
      data: sorted.map(i => i.nameZh || i.displayName), 
      axisLabel: { color: '#7f8c8d', fontSize: 9, rotate: 45, interval: Math.floor(sorted.length / 25) }
    },
    yAxis: { type: 'value', name: '占比 (%)', nameTextStyle: { color: '#7f8c8d' }, axisLabel: { color: '#7f8c8d', formatter: '{value}%' }, max: 100 },
    dataZoom: [{ type: 'slider', xAxisIndex: 0, start: 0, end: 100, height: 20, bottom: 5 }],
    series: [{ 
      type: 'bar', 
      data: sorted.map(i => ({ value: i.recipePercent, itemStyle: { color: i.recipePercent >= 40 ? '#ef4444' : i.recipePercent >= 25 ? '#f59e0b' : '#eab308' } })),
      barMaxWidth: 15
    }]
  }
})

// ========== 属性定价（从基础物品自动计算） ==========
interface ItemTraits { isBasic?: boolean }
const { data: itemTraits } = useFetch<Record<string, ItemTraits>>('/api/items/traits')

// 属性名称映射
const attrNameMap: Record<string, string> = {
  bonus_strength: '力量', bonus_agility: '敏捷', bonus_intellect: '智力', bonus_all_stats: '全属性',
  bonus_damage: '攻击力', bonus_attack_speed: '攻速', bonus_armor: '护甲', bonus_health: '生命值',
  bonus_mana: '魔法值', bonus_health_regen: '生命恢复', bonus_mana_regen: '魔法恢复', bonus_regen: '生命恢复',
  movement_speed: '移速', bonus_movement_speed: '移速', bonus_evasion: '闪避', bonus_magical_armor: '魔抗', bonus_lifesteal: '吸血',
  spell_lifesteal: '法术吸血', bonus_chance: '暴击率', bonus_chance_damage: '暴击伤害',
  lifesteal_percent: '物理吸血', tooltip_resist: '魔抗'
}

// 获取基础物品列表
const basicItemsList = computed(() => {
  if (!itemTraits.value) return []
  return props.items.filter(i => itemTraits.value[i.name]?.isBasic && i.cost > 0)
})

// 分析基础物品并计算属性单价（按中文名称合并同类属性）
const attrPricingAnalysis = computed(() => {
  const attrData: Record<string, { items: { name: string, cost: number, value: number, unitPrice: number }[], avgPrice: number }> = {}
  
  for (const item of basicItemsList.value) {
    if (!item.attributes) continue
    for (const [attr, value] of Object.entries(item.attributes)) {
      if (typeof value !== 'number' || value <= 0) continue
      // 跳过一些非属性字段
      if (['blink_range', 'cast_range', 'duration', 'radius', 'cooldown', 'charges'].some(k => attr.includes(k))) continue
      
      // 使用中文名称作为 key，合并同类属性
      const attrName = attrNameMap[attr] || attr
      if (!attrData[attrName]) attrData[attrName] = { items: [], avgPrice: 0 }
      
      // 避免同一物品重复添加到同一属性（如抗魔斗篷同时有 bonus_magical_armor 和 tooltip_resist）
      const itemName = item.nameZh || item.displayName
      if (attrData[attrName].items.some(i => i.name === itemName)) continue
      
      const unitPrice = Math.round((item.cost / value) * 10) / 10
      attrData[attrName].items.push({
        name: itemName,
        cost: item.cost,
        value: value,
        unitPrice: unitPrice
      })
    }
  }
  
  // 计算平均单价
  for (const attrName of Object.keys(attrData)) {
    const items = attrData[attrName].items
    if (items.length > 0) {
      attrData[attrName].avgPrice = Math.round(items.reduce((s, i) => s + i.unitPrice, 0) / items.length * 10) / 10
    }
  }
  
  return attrData
})

// 排序后的属性列表（按平均单价降序）
const sortedAttrPricing = computed(() => {
  return Object.entries(attrPricingAnalysis.value)
    .map(([name, data]) => ({ key: name, name, ...data }))
    .filter(a => a.items.length > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice)
})

// 分类展示
const attrCategories = computed(() => {
  const stats = sortedAttrPricing.value.filter(p => ['bonus_strength', 'bonus_agility', 'bonus_intellect', 'bonus_all_stats'].includes(p.key))
  const offense = sortedAttrPricing.value.filter(p => ['bonus_damage', 'bonus_attack_speed', 'bonus_chance', 'bonus_lifesteal'].includes(p.key))
  const defense = sortedAttrPricing.value.filter(p => ['bonus_armor', 'bonus_health', 'bonus_evasion', 'bonus_magical_armor'].includes(p.key))
  const utility = sortedAttrPricing.value.filter(p => ['movement_speed', 'bonus_mana', 'bonus_health_regen', 'bonus_mana_regen', 'bonus_regen', 'spell_lifesteal'].includes(p.key))
  return [
    { label: '📊 基础属性', items: stats, color: '#3b82f6' },
    { label: '⚔️ 攻击属性', items: offense, color: '#ef4444' },
    { label: '🛡️ 防御属性', items: defense, color: '#10b981' },
    { label: '✨ 功能属性', items: utility, color: '#8b5cf6' }
  ].filter(c => c.items.length > 0)
})

// 属性单价对比图表
const barOption = computed(() => {
  const items = sortedAttrPricing.value.slice(0, 15)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const d = params[0]; const attr = items.find(x => x.name === d.name)
      return `<b>${d.name}</b><br/>平均单价: ${d.value}g<br/>参考物品: ${attr?.items.length || 0}个`
    }},
    grid: { left: '3%', right: '10%', bottom: '3%', top: 20, containLabel: true },
    xAxis: { type: 'value', name: '金币/点', axisLabel: { color: '#7f8c8d' } },
    yAxis: { type: 'category', data: items.map(i => i.name).reverse(), axisLabel: { color: '#374151', fontSize: 11 } },
    series: [{ type: 'bar', data: items.map(i => i.avgPrice).reverse(), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#a78bfa' }] }, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', formatter: '{c}g', color: '#6b7280', fontSize: 10 } }]
  }
})
</script>

<style scoped>
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px; color: #6b7280; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.intro-section { padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; color: white; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.intro-section h3 { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; }
.intro-section p { margin: 0; font-size: 0.9rem; opacity: 0.9; }

.chart-note { text-align: center; font-size: 0.8rem; color: #9ca3af; margin-top: 8px; }

.pattern-grid, .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.cluster-list, .gap-list { display: flex; flex-wrap: wrap; gap: 8px; }
.pattern-item { display: flex; gap: 8px; padding: 6px 10px; background: #f9fafb; border-radius: 6px; font-size: 0.85rem; }
.price-tag, .range-tag { font-weight: 600; color: #f59e0b; }
.count-tag { color: #6b7280; }
.gap-tag { font-weight: 500; color: #ef4444; }
.no-data { padding: 20px; text-align: center; color: #9ca3af; font-size: 0.85rem; }

.formula-box { padding: 12px 16px; background: #f5f3ff; border-radius: 6px; font-size: 0.85rem; color: #5b21b6; margin-bottom: 16px; }
.formula-note { margin-left: 8px; color: #7c3aed; font-size: 0.8rem; }

.pricing-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.pricing-table th { text-align: left; padding: 6px 8px; background: #f9fafb; color: #6b7280; font-weight: 500; border-bottom: 1px solid #e5e7eb; }
.pricing-table td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
.attr-name { color: #374151; font-weight: 500; }
.attr-price { color: #f59e0b; font-weight: 600; }
.attr-ref { color: #9ca3af; font-size: 0.75rem; }

.attr-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.item-name { color: #374151; }
.item-cost { color: #f59e0b; }
.item-value { color: #3b82f6; }
.item-unit-price { color: #10b981; font-weight: 600; }
.pricing-table tfoot { background: #fef3c7; }
.avg-row td { font-weight: 600; color: #92400e; }
.avg-price { color: #d97706; }

.insight-box { background: #fffbeb; border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b; margin-top: 24px; }
.insight-box h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; color: #92400e; }
.insight-box ul { margin: 0; padding-left: 20px; }
.insight-box li { margin-bottom: 8px; color: #78350f; font-size: 0.9rem; line-height: 1.6; }
.insight-box li:last-child { margin-bottom: 0; }

/* 价格阶梯 */
.tier-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.tier-tag { display: flex; gap: 6px; padding: 6px 12px; background: #fef3c7; border-radius: 6px; font-size: 0.85rem; }
.tier-tag.highlight { background: #fbbf24; }
.tier-tag .tier-price { font-weight: 600; color: #92400e; }
.tier-tag .tier-count { color: #78350f; }
.tier-note { margin-top: 12px; font-size: 0.8rem; color: #9ca3af; text-align: center; }

/* 合成分析 */
.synthesis-detail { margin-top: 16px; }
.item-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.item-tag { padding: 4px 10px; background: #f3f4f6; border-radius: 4px; font-size: 0.8rem; color: #374151; }
.more-tag { padding: 4px 10px; background: #e5e7eb; border-radius: 4px; font-size: 0.8rem; color: #6b7280; font-style: italic; }

/* 卷轴分析 */
.recipe-list { display: flex; flex-direction: column; gap: 8px; }
.recipe-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #fffbeb; border-radius: 6px; }
.recipe-name { flex: 1; font-size: 0.85rem; color: #374151; font-weight: 500; }
.recipe-cost { font-size: 0.8rem; color: #6b7280; }
.recipe-percent { font-size: 0.85rem; font-weight: 600; color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 4px; }
</style>
