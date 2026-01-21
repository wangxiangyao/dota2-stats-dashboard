<script setup lang="ts">
/**
 * 属性单价分析组件
 * 功能：展示各属性的基准单价，作为溢价分析的定价基础
 */

interface PricingItem {
  name: string
  unitPrice: number
  reference: string
  unit: string
}

interface PricingConfig {
  version: string
  description: string
  pricing: Record<string, PricingItem>
  notes: string[]
}

// 加载定价配置
const { data: pricingConfig } = useFetch<PricingConfig>('/data/items/attribute-pricing.json')

// 转换为数组格式
const pricingList = computed(() => {
  if (!pricingConfig.value) return []
  return Object.entries(pricingConfig.value.pricing).map(([key, value]) => ({
    key,
    ...value
  })).sort((a, b) => b.unitPrice - a.unitPrice)
})

// 分类属性
const categories = computed(() => {
  const stats = pricingList.value.filter(p => 
    ['bonus_strength', 'bonus_agility', 'bonus_intellect', 'bonus_all_stats'].includes(p.key)
  )
  const offense = pricingList.value.filter(p => 
    ['bonus_damage', 'bonus_attack_speed', 'spell_amp'].includes(p.key)
  )
  const defense = pricingList.value.filter(p => 
    ['bonus_armor', 'bonus_health', 'bonus_evasion', 'bonus_magical_armor'].includes(p.key)
  )
  const utility = pricingList.value.filter(p => 
    ['movement_speed', 'bonus_mana', 'bonus_regen', 'bonus_mana_regen_pct', 'spell_lifesteal_amp', 'hp_regen_amp'].includes(p.key)
  )
  
  return [
    { label: '📊 基础属性', items: stats, color: '#3b82f6' },
    { label: '⚔️ 攻击属性', items: offense, color: '#ef4444' },
    { label: '🛡️ 防御属性', items: defense, color: '#10b981' },
    { label: '✨ 功能属性', items: utility, color: '#8b5cf6' }
  ]
})

// 条形图配置
const barOption = computed(() => {
  const items = pricingList.value.slice(0, 12) // 取前12个
  return {
    title: {
      text: '属性单位价格对比',
      left: 'center',
      textStyle: { color: '#2c3e50', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0]
        const item = items.find(i => i.name === data.name)
        return `${data.name}<br/>单价: ${data.value} 金/${item?.unit || '点'}<br/>参考: ${item?.reference || '-'}`
      }
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      top: 50,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '金币',
      axisLabel: { color: '#7f8c8d' }
    },
    yAxis: {
      type: 'category',
      data: items.map(i => i.name).reverse(),
      axisLabel: { color: '#374151', fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: items.map(i => i.unitPrice).reverse(),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#60a5fa' }
          ]
        },
        borderRadius: [0, 4, 4, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}g',
        color: '#6b7280',
        fontSize: 10
      }
    }]
  }
})
</script>

<template>
  <div class="attribute-pricing">
    <!-- 说明 -->
    <div class="intro-box">
      <strong>💡 什么是属性单价？</strong>
      <p>从基础物品中提取各属性的"基准价格"，用于后续计算物品溢价。</p>
      <p>公式：<code>单位价格 = 物品价格 / 属性数值</code></p>
    </div>

    <!-- 条形图 -->
    <div class="chart-section">
      <ClientOnly>
        <VChart
          v-if="pricingList.length > 0"
          :option="barOption"
          autoresize
          style="width: 100%; height: 400px;"
        />
      </ClientOnly>
    </div>

    <!-- 分类表格 -->
    <div class="categories">
      <div
        v-for="category in categories"
        :key="category.label"
        class="category-card"
      >
        <h4 :style="{ borderLeftColor: category.color }">{{ category.label }}</h4>
        <table class="pricing-table">
          <thead>
            <tr>
              <th>属性</th>
              <th>单价</th>
              <th>参考物品</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in category.items" :key="item.key">
              <td class="attr-name">{{ item.name }}</td>
              <td class="attr-price">{{ item.unitPrice }}g/{{ item.unit }}</td>
              <td class="attr-ref">{{ item.reference }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 注释 -->
    <div class="notes" v-if="pricingConfig?.notes">
      <h4>📝 说明</h4>
      <ul>
        <li v-for="(note, i) in pricingConfig.notes" :key="i">{{ note }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.attribute-pricing {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.intro-box {
  padding: 14px 18px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e40af;
}

.intro-box strong {
  display: block;
  margin-bottom: 6px;
}

.intro-box p {
  margin: 4px 0;
}

.intro-box code {
  background: #bfdbfe;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8rem;
}

.chart-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.category-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.category-card h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #374151;
  padding-left: 10px;
  border-left: 3px solid;
}

.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.pricing-table th {
  text-align: left;
  padding: 6px 8px;
  background: #f9fafb;
  color: #6b7280;
  font-weight: 500;
  border-bottom: 1px solid #e5e7eb;
}

.pricing-table td {
  padding: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.attr-name {
  color: #374151;
  font-weight: 500;
}

.attr-price {
  color: #f59e0b;
  font-weight: 600;
}

.attr-ref {
  color: #9ca3af;
  font-size: 0.75rem;
}

.notes {
  background: #f9fafb;
  border-radius: 8px;
  padding: 14px 18px;
}

.notes h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #374151;
}

.notes ul {
  margin: 0;
  padding-left: 20px;
}

.notes li {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 4px 0;
}
</style>
