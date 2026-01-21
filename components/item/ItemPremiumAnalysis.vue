<script setup lang="ts">
/**
 * 物品溢价分析组件
 * 功能：计算每个物品的属性价值总和，与实际价格对比得出溢价
 */
import type { TocItem } from '~/components/chart/Layout.vue'

interface ItemData {
  name: string
  nameZh: string | null
  displayName: string
  cost: number
  recipeCost?: number
  attributes?: Record<string, any>
  components: string[] | null
  behavior: string | null
}

interface ItemAttributes {
  strength?: number
  agility?: number
  intellect?: number
  allStats?: number
  damage?: number
  attackSpeed?: number
  armor?: number
  health?: number
  mana?: number
  healthRegen?: number
  manaRegen?: number
  moveSpeed?: number
  evasion?: number
  magicResist?: number
  lifesteal?: number
  spellLifesteal?: number
}

interface ItemTraits { 
  isBasic?: boolean
  attributes?: ItemAttributes
}

const props = defineProps<{
  items: ItemData[]
}>()

// 目录配置
const tocItems: TocItem[] = [
  { id: 'attribute-pricing', title: '💎 属性基准价格', level: 1 },
  { id: 'basic-premium', title: '📦 基础物品溢价', level: 1 },
  { id: 'synthesis-premium', title: '🔧 合成物品溢价', level: 1 },
]

// ========== 属性基准价格（从 ItemPriceDistribution 移过来） ==========
const { data: itemTraits } = useFetch<Record<string, ItemTraits>>('/api/items/traits')

// 属性名称映射（合并同类属性）
const attrNameMap: Record<string, string> = {
  // 基础属性
  bonus_strength: '力量', bonus_agility: '敏捷', bonus_intellect: '智力', bonus_all_stats: '全属性',
  // 攻击
  bonus_damage: '攻击力', bonus_attack_speed: '攻速', bonus_chance: '暴击率', bonus_chance_damage: '暴击伤害',
  // 防御
  bonus_armor: '护甲', bonus_health: '生命值', bonus_evasion: '闪避', 
  bonus_magical_armor: '魔抗', tooltip_resist: '魔抗',
  // 移速
  movement_speed: '移速', bonus_movement_speed: '移速', bonus_movement: '移速',
  // 魔法
  bonus_mana: '魔法值',
  // 回复
  bonus_health_regen: '生命恢复', bonus_regen: '生命恢复', hp_regen: '生命恢复', aura_health_regen: '生命恢复',
  bonus_mana_regen: '魔法恢复', mana_regen: '魔法恢复', bonus_mana_regen_pct: '魔法恢复', aura_mana_regen: '魔法恢复',
  // 吸血
  bonus_lifesteal: '吸血', lifesteal_percent: '物理吸血', spell_lifesteal: '法术吸血',
}

// 获取基础物品列表（附带 traits 属性）
const basicItemsList = computed(() => {
  if (!itemTraits.value) return []
  return props.items
    .filter(i => itemTraits.value[i.name]?.isBasic && i.cost > 0)
    .map(i => ({
      ...i,
      traitAttrs: itemTraits.value[i.name]?.attributes || {}
    }))
})

// 属性中文名映射（使用新结构）
const attrDisplayName: Record<string, string> = {
  strength: '力量', agility: '敏捷', intellect: '智力', allStats: '全属性',
  damage: '攻击力', attackSpeed: '攻速', armor: '护甲', health: '生命值',
  mana: '魔法值', healthRegen: '生命恢复', manaRegen: '魔法恢复', moveSpeed: '移速',
  evasion: '闪避', magicResist: '魔抗', lifesteal: '物理吸血', spellLifesteal: '法术吸血'
}

// 分析基础物品并计算属性单价（从 traits 中读取 attributes）
const attrPricingAnalysis = computed(() => {
  const attrData: Record<string, { items: { name: string, cost: number, value: number, unitPrice: number }[], avgPrice: number, minPrice: number }> = {}
  
  for (const item of basicItemsList.value) {
    const traitAttrs = item.traitAttrs
    for (const [attr, value] of Object.entries(traitAttrs)) {
      if (typeof value !== 'number' || value <= 0) continue
      
      const attrName = attrDisplayName[attr] || attr
      if (!attrData[attrName]) attrData[attrName] = { items: [], avgPrice: 0, minPrice: Infinity }
      
      const itemName = item.nameZh || item.displayName
      if (attrData[attrName].items.some(i => i.name === itemName)) continue
      
      const unitPrice = Math.round((item.cost / value) * 10) / 10
      attrData[attrName].items.push({ name: itemName, cost: item.cost, value, unitPrice })
    }
  }
  
  // 计算平均单价和最低单价
  for (const attrName of Object.keys(attrData)) {
    const items = attrData[attrName].items
    if (items.length > 0) {
      attrData[attrName].avgPrice = Math.round(items.reduce((s, i) => s + i.unitPrice, 0) / items.length * 10) / 10
      attrData[attrName].minPrice = Math.min(...items.map(i => i.unitPrice))
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

// ========== 基础物品格子溢价分析 ==========
// 计算每个属性内，物品相对于最便宜物品的溢价
const slotPremiumAnalysis = computed(() => {
  const results: { attrName: string, minItem: any, premium: { item: any, stackCost: number, slotValue: number, slotsSaved: number }[] }[] = []
  
  for (const attr of sortedAttrPricing.value) {
    if (attr.items.length < 2) continue // 只有一个物品无法比较
    
    // 按单价排序，找最便宜的
    const sortedItems = [...attr.items].sort((a, b) => a.unitPrice - b.unitPrice)
    const minItem = sortedItems[0]
    
    const premium: typeof results[0]['premium'] = []
    for (const item of sortedItems.slice(1)) {
      // 用最便宜物品堆出同样属性值需要多少钱
      const stackCost = Math.round(minItem.unitPrice * item.value)
      // 格子价值 = 实际价格 - 堆叠成本
      const slotValue = item.cost - stackCost
      // 省了多少格子（向上取整）
      const slotsSaved = Math.ceil(item.value / minItem.value) - 1
      
      premium.push({ item, stackCost, slotValue, slotsSaved })
    }
    
    results.push({ attrName: attr.name, minItem, premium })
  }
  
  return results
})

// ========== 合成物品溢价分析 ==========
// 获取全局最低单价映射
const minUnitPrices = computed(() => {
  const map: Record<string, number> = {}
  for (const attr of sortedAttrPricing.value) {
    map[attr.name] = attr.minPrice
  }
  return map
})

// 递归查找合成物品使用的所有基础物品
const findBasicComponents = (itemName: string, visited = new Set<string>()): string[] => {
  if (visited.has(itemName)) return []
  visited.add(itemName)
  
  const item = props.items.find(i => i.name === itemName)
  if (!item) return []
  
  // 是基础物品
  if (itemTraits.value?.[itemName]?.isBasic) return [itemName]
  
  // 有配方，递归
  if (item.components) {
    const basics: string[] = []
    for (const compName of item.components) {
      basics.push(...findBasicComponents(compName, visited))
    }
    return basics
  }
  
  return []
}

// 根据基础物品列表计算属性的实际单价（返回单价和参考物品名）
const getActualUnitPriceInfo = (attrName: string, basicNames: string[]): { price: number, itemName: string } => {
  // 找这些基础物品中提供该属性的
  for (const basicName of basicNames) {
    const basicItem = basicItemsList.value.find(i => i.name === basicName)
    if (basicItem?.traitAttrs) {
      for (const [attr, value] of Object.entries(basicItem.traitAttrs)) {
        const mapped = attrDisplayName[attr] || attr
        if (mapped === attrName && typeof value === 'number' && value > 0) {
          return { 
            price: Math.round((basicItem.cost / value) * 10) / 10,
            itemName: basicItem.nameZh || basicItem.displayName
          }
        }
      }
    }
  }
  return { price: minUnitPrices.value[attrName] || 0, itemName: '' }
}

// 获取最低单价参考物品名
const getMinPriceRefItem = (attrName: string): string => {
  const attrData = attrPricingAnalysis.value[attrName]
  if (!attrData?.items?.length) return ''
  const minItem = attrData.items.reduce((a, b) => a.unitPrice < b.unitPrice ? a : b)
  return minItem.name
}

// 合成物品溢价结果
interface AttrBreakdown {
  name: string
  value: number
  minPrice: number  // 全局最低单价
  actualPrice: number  // 实际基础物品单价
  theoryValue: number  // 理论价值 = value * minPrice
  actualValue: number  // 实际价值 = value * actualPrice
  minRefItem?: string  // 最低单价参考物品
  actualRefItem?: string  // 实际单价参考物品
}

interface SynthesisPremiumResult {
  item: ItemData
  breakdown: AttrBreakdown[]  // 属性详细拆解
  theoryValue: number  // 理论属性价值（用最低单价）
  actualValue: number  // 实际属性价值（用配方基础物品单价）
  recipeCost: number  // 卷轴费用
  theoryPremium: number  // 理论溢价
  actualPremium: number  // 合成溢价（真实溢价）
  theoryRate: number
  actualRate: number
}

const synthesisPremiumResults = computed<SynthesisPremiumResult[]>(() => {
  if (!itemTraits.value || sortedAttrPricing.value.length === 0) return []
  
  const results: SynthesisPremiumResult[] = []
  
  for (const item of props.items) {
    // 只分析合成物品
    if (!item.components || item.cost <= 0) continue
    if (itemTraits.value[item.name]?.isBasic) continue
    
    const basicComponents = findBasicComponents(item.name)
    let theoryValue = 0
    let actualValue = 0
    const breakdown: AttrBreakdown[] = []
    
    // 从 traits.json 获取物品的标准化属性
    const traitAttrs = itemTraits.value[item.name]?.attributes
    if (traitAttrs) {
      for (const [attr, value] of Object.entries(traitAttrs)) {
        if (typeof value !== 'number' || value <= 0) continue
        
        const attrName = attrDisplayName[attr] || attr
        const minPrice = minUnitPrices.value[attrName]
        const actualInfo = getActualUnitPriceInfo(attrName, basicComponents)
        
        if (minPrice) {
          const tv = value * minPrice
          const av = value * (actualInfo.price || minPrice)
          theoryValue += tv
          actualValue += av
          breakdown.push({
            name: attrName,
            value,
            minPrice,
            actualPrice: actualInfo.price || minPrice,
            theoryValue: Math.round(tv),
            actualValue: Math.round(av),
            minRefItem: getMinPriceRefItem(attrName),
            actualRefItem: actualInfo.itemName
          })
        }
      }
    }
    
    const recipeCost = item.recipeCost || 0
    if (theoryValue > 0) {
      const theoryPremium = item.cost - theoryValue
      const actualPremium = item.cost - actualValue
      results.push({
        item,
        breakdown,
        theoryValue: Math.round(theoryValue),
        actualValue: Math.round(actualValue),
        recipeCost,
        theoryPremium: Math.round(theoryPremium),
        actualPremium: Math.round(actualPremium),
        theoryRate: Math.round((theoryPremium / item.cost) * 100),
        actualRate: Math.round((actualPremium / item.cost) * 100)
      })
    }
  }
  
  return results.sort((a, b) => b.actualRate - a.actualRate)
})

// 高溢价物品（actualRate > 50%）
const highPremiumItems = computed(() => synthesisPremiumResults.value.filter(r => r.actualRate > 50).slice(0, 12))
// 超值物品（actualRate < 0）
const valuableItems = computed(() => synthesisPremiumResults.value.filter(r => r.actualRate < 0).sort((a, b) => a.actualRate - b.actualRate).slice(0, 12))
</script>

<template>
  <ChartLayout :tocItems="tocItems" title="物品溢价分析">
    <!-- ========== 属性基准价格 ========== -->
    <ChartSection id="attribute-pricing" title="💎 属性基准价格" color="purple">
      <div class="formula-box">
        <strong>公式：</strong> 单位价格 = 物品价格 / 属性数值
        <span class="formula-note">（从 {{ basicItemsList.length }} 个基础物品中自动计算）</span>
      </div>

      <div class="attr-pricing-grid">
        <ChartCard v-for="attr in sortedAttrPricing" :key="attr.key" :title="attr.name">
          <table class="pricing-table">
            <thead>
              <tr>
                <th>物品</th>
                <th>价格</th>
                <th>数值</th>
                <th>单价</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in attr.items" :key="item.name">
                <td class="item-name">{{ item.name }}</td>
                <td class="item-cost">{{ item.cost }}g</td>
                <td class="item-value">{{ item.value }}</td>
                <td class="item-unit-price">{{ item.unitPrice }}g/点</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="avg-row">
                <td colspan="3">平均单价</td>
                <td class="avg-price">{{ attr.avgPrice }}g</td>
              </tr>
            </tfoot>
          </table>
        </ChartCard>
      </div>
    </ChartSection>

    <!-- ========== 基础物品溢价（格子溢价分析） ========== -->
    <ChartSection id="basic-premium" title="📦 基础物品溢价" color="orange">
      <div class="section-intro">
        <strong>格子价值分析：</strong>
        同属性内，高价物品比便宜物品的单价更贵。溢价 = 腾出格子的价值。
        <br/><strong>公式：</strong> 格子价值 = 物品实际价格 - 用最便宜物品堆到同数值的成本
      </div>
      
      <div class="slot-premium-grid">
        <ChartCard v-for="attr in slotPremiumAnalysis" :key="attr.attrName" :title="attr.attrName">
          <div class="baseline-item">
            <span class="baseline-label">基准物品：</span>
            <span class="baseline-name">{{ attr.minItem.name }}</span>
            <span class="baseline-price">{{ attr.minItem.unitPrice }}g/点</span>
          </div>
          <table class="slot-table">
            <thead>
              <tr>
                <th>物品</th>
                <th>实际价格</th>
                <th>堆叠成本</th>
                <th>格子价值</th>
                <th>省格子</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in attr.premium" :key="p.item.name">
                <td class="item-name">{{ p.item.name }}</td>
                <td>{{ p.item.cost }}g</td>
                <td class="stack-cost">{{ p.stackCost }}g</td>
                <td class="slot-value" :class="{ positive: p.slotValue > 0 }">{{ p.slotValue > 0 ? '+' : '' }}{{ p.slotValue }}g</td>
                <td class="slots-saved">{{ p.slotsSaved }}格</td>
              </tr>
            </tbody>
          </table>
        </ChartCard>
      </div>
    </ChartSection>

    <!-- ========== 合成物品溢价 ========== -->
    <ChartSection id="synthesis-premium" title="🔧 合成物品溢价" color="blue">
      <div class="section-intro">
        <strong>技能/效果价值分析：</strong>
        溢价 = 物品价格 - Σ(属性值 × 基准单价)。
        <strong>理论溢价</strong>使用全局最低单价，<strong>合成溢价</strong>使用实际配方基础物品单价。
      </div>
      
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ synthesisPremiumResults.length }}</div>
          <div class="stat-label">已分析合成物品</div>
        </div>
        <div class="stat-card">
          <div class="stat-value danger">{{ highPremiumItems.length }}</div>
          <div class="stat-label">高溢价 (>50%)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value success">{{ valuableItems.length }}</div>
          <div class="stat-label">超值物品 (<0%)</div>
        </div>
      </div>

      <div class="synth-item-grid">
        <div v-for="r in synthesisPremiumResults" :key="r.item.name" class="synth-item-card">
          <!-- 物品头部 -->
          <div class="synth-header">
            <span class="synth-name">{{ r.item.nameZh || r.item.displayName }}</span>
            <span class="synth-cost">{{ r.item.cost }}g</span>
          </div>
          
          <!-- 属性详情（逐条） -->
          <div class="attr-detail-list">
            <div v-for="b in r.breakdown" :key="b.name" class="attr-detail-item">
              <div class="attr-detail-header">
                <span class="attr-name">{{ b.name }}</span>
                <span class="attr-val">{{ b.value }}</span>
              </div>
              <div class="attr-calc-row">
                <span class="calc-label">理论：</span>
                <span class="calc-formula">{{ b.value }} × {{ b.minPrice }}g<template v-if="b.minRefItem">（{{ b.minRefItem }}）</template></span>
                <span class="calc-result">= {{ b.theoryValue }}g</span>
              </div>
              <div class="attr-calc-row">
                <span class="calc-label">合成：</span>
                <span class="calc-formula">{{ b.value }} × {{ b.actualPrice }}g<template v-if="b.actualRefItem">（{{ b.actualRefItem }}）</template></span>
                <span class="calc-result">= {{ b.actualValue }}g</span>
              </div>
            </div>
          </div>
          
          <!-- 卷轴费用（如有） -->
          <div v-if="r.recipeCost > 0" class="recipe-cost-row">
            <span class="recipe-label">🔧 卷轴费用</span>
            <span class="recipe-value">{{ r.recipeCost }}g</span>
          </div>
          
          <!-- 溢价总结 -->
          <div class="premium-summary">
            <div class="summary-title">💰 溢价总结</div>
            <div class="summary-row">
              <span class="summary-label">理论溢价：</span>
              <span class="summary-calc">{{ r.item.cost }}g - {{ r.theoryValue }}g</span>
              <span class="summary-result" :class="{ positive: r.theoryPremium > 0, negative: r.theoryPremium < 0 }">
                = {{ r.theoryPremium > 0 ? '+' : '' }}{{ r.theoryPremium }}g ({{ r.theoryRate }}%)
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">合成溢价：</span>
              <span class="summary-calc">{{ r.item.cost }}g - {{ r.actualValue }}g</span>
              <span class="summary-result" :class="{ positive: r.actualPremium > 0, negative: r.actualPremium < 0 }">
                = {{ r.actualPremium > 0 ? '+' : '' }}{{ r.actualPremium }}g ({{ r.actualRate }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </ChartSection>
  </ChartLayout>
</template>

<style scoped>
.formula-box { padding: 12px 16px; background: #f5f3ff; border-radius: 6px; font-size: 0.85rem; color: #5b21b6; margin-bottom: 16px; }
.formula-note { margin-left: 8px; color: #7c3aed; font-size: 0.8rem; }

.attr-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.pricing-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.pricing-table th { text-align: left; padding: 6px 8px; background: #f9fafb; color: #6b7280; font-weight: 500; border-bottom: 1px solid #e5e7eb; }
.pricing-table td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
.item-name { color: #374151; }
.item-cost { color: #f59e0b; }
.item-value { color: #3b82f6; }
.item-unit-price { color: #10b981; font-weight: 600; }
.pricing-table tfoot { background: #fef3c7; }
.avg-row td { font-weight: 600; color: #92400e; }
.avg-price { color: #d97706; }

.section-intro { padding: 14px 18px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; font-size: 0.85rem; color: #92400e; margin-bottom: 16px; }
.coming-soon { text-align: center; padding: 40px 20px; background: #f9fafb; border-radius: 8px; border: 2px dashed #e5e7eb; }
.coming-soon p { margin-top: 8px; color: #6b7280; font-size: 0.85rem; }

/* 格子溢价分析 */
.slot-premium-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 16px; }
.baseline-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ecfdf5; border-radius: 6px; margin-bottom: 12px; font-size: 0.8rem; }
.baseline-label { color: #6b7280; }
.baseline-name { color: #059669; font-weight: 600; }
.baseline-price { color: #10b981; margin-left: auto; }
.slot-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.slot-table th { text-align: left; padding: 6px 8px; background: #fff7ed; color: #9a3412; font-weight: 500; border-bottom: 1px solid #fed7aa; }
.slot-table td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
.stack-cost { color: #6b7280; }
.slot-value { font-weight: 600; }
.slot-value.positive { color: #ea580c; }
.slots-saved { color: #8b5cf6; font-weight: 500; }

/* 合成物品溢价 */
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { padding: 14px; background: #f9fafb; border-radius: 8px; text-align: center; }
.stat-value { font-size: 1.4rem; font-weight: 700; color: #1f2937; }
.stat-value.danger { color: #ef4444; }
.stat-value.success { color: #10b981; }
.stat-label { font-size: 0.75rem; color: #6b7280; margin-top: 4px; }

.synth-item-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 16px; }
.synth-item-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
.synth-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; margin-bottom: 14px; }
.synth-name { font-weight: 700; color: #1f2937; font-size: 1rem; }
.synth-cost { font-weight: 700; color: #f59e0b; font-size: 1rem; }

/* 属性详情列表 */
.attr-detail-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
.attr-detail-item { background: #f9fafb; border-radius: 8px; padding: 10px 12px; }
.attr-detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.attr-name { font-weight: 600; color: #374151; font-size: 0.85rem; }
.attr-val { font-weight: 700; color: #3b82f6; font-size: 0.9rem; }

.attr-calc-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; padding: 2px 0; }
.calc-label { color: #6b7280; min-width: 40px; }
.calc-formula { color: #374151; flex: 1; }
.calc-result { font-weight: 600; color: #059669; min-width: 70px; text-align: right; }

/* 卷轴费用 */
.recipe-cost-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fef3c7; border-radius: 6px; margin-bottom: 14px; font-size: 0.85rem; }
.recipe-label { font-weight: 500; color: #92400e; }
.recipe-value { font-weight: 700; color: #d97706; }

/* 溢价总结 */
.premium-summary { background: #f0fdf4; border-radius: 8px; padding: 12px 14px; border: 1px solid #bbf7d0; }
.summary-title { font-weight: 600; color: #166534; margin-bottom: 8px; font-size: 0.85rem; }
.summary-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; padding: 4px 0; }
.summary-label { color: #6b7280; min-width: 70px; }
.summary-calc { color: #374151; flex: 1; }
.summary-result { font-weight: 700; min-width: 120px; text-align: right; }
.summary-result.positive { color: #ea580c; }
.summary-result.negative { color: #10b981; }
</style>
