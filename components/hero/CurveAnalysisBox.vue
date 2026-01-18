<script setup lang="ts">
import type { Hero, PrimaryAttribute } from '~/types/dota'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  selectedHeroes: string[]
  title: string
  valueGetter: (hero: Hero, level: number) => number
  unit?: string
}>()

// 计算每个选中英雄的曲线变化数据
const curveAnalysis = computed(() => {
  if (!props.heroes.length || !props.selectedHeroes.length) return null

  const selectedHeroData = props.heroes.filter(h => props.selectedHeroes.includes(h.name))

  const analysis = selectedHeroData.map(hero => {
    const value1 = props.valueGetter(hero, 1)
    const value30 = props.valueGetter(hero, 30)
    const absoluteChange = value30 - value1
    const percentChange = ((value30 - value1) / value1) * 100

    return {
      hero,
      name: hero.localizedName || hero.name,
      attr: hero.primaryAttribute,
      value1,
      value30,
      absoluteChange,
      percentChange,
      // 获取成长数据
      strGain: hero.strengthGain,
      agiGain: hero.agilityGain,
      intGain: hero.intelligenceGain
    }
  })

  // 按变化率排序
  const sortedByChange = [...analysis].sort((a, b) => b.percentChange - a.percentChange)

  // 变化最大的（前3个或一半，取较小值）
  const topCount = Math.min(3, Math.ceil(analysis.length / 2))
  const highChange = sortedByChange.slice(0, topCount)

  // 变化最小的（后3个或一半）
  const lowChange = sortedByChange.slice(-topCount).reverse()

  // 计算平均变化率
  const avgChange = analysis.reduce((sum, h) => sum + h.percentChange, 0) / analysis.length

  // 按属性分组的平均变化率
  const byAttr: Record<string, number[]> = {}
  analysis.forEach(h => {
    if (!byAttr[h.attr]) byAttr[h.attr] = []
    byAttr[h.attr].push(h.percentChange)
  })
  const attrAvgChange: Record<string, number> = {}
  for (const attr in byAttr) {
    attrAvgChange[attr] = byAttr[attr].reduce((a, b) => a + b, 0) / byAttr[attr].length
  }

  return {
    total: analysis.length,
    avgChange,
    attrAvgChange,
    highChange,
    lowChange
  }
})

const formatValue = (val: number) => val.toFixed(1)
const formatPercent = (val: number) => val.toFixed(1) + '%'
</script>

<template>
  <div v-if="curveAnalysis" class="curve-analysis-box">
    <h4>📈 {{ title }}变化分析（1级 → 30级）</h4>

    <ul class="stats-list">
      <li>
        已选择 <span class="stat-highlight">{{ curveAnalysis.total }}</span> 个英雄进行对比
      </li>
      <li>
        平均变化率：<span class="stat-highlight">{{ formatPercent(curveAnalysis.avgChange) }}</span>
      </li>
      <li>
        按主属性平均变化率：
        <span
          v-for="(avg, attr) in curveAnalysis.attrAvgChange"
          :key="attr"
          class="attr-avg"
          :style="{ color: ATTRIBUTE_COLORS[attr as PrimaryAttribute] }"
        >
          {{ ATTRIBUTE_NAMES[attr as PrimaryAttribute] }}: {{ formatPercent(avg) }}
        </span>
      </li>
    </ul>

    <div class="change-comparison">
      <!-- 变化大的英雄 -->
      <div class="change-col high">
        <strong class="change-title">📈 变化最大（曲线陡峭）</strong>
        <div v-for="h in curveAnalysis.highChange" :key="h.name" class="hero-change-item">
          <div class="hero-name" :style="{ color: ATTRIBUTE_COLORS[h.attr] }">
            {{ h.name }}
          </div>
          <div class="hero-values">
            {{ formatValue(h.value1) }}{{ unit }} → {{ formatValue(h.value30) }}{{ unit }}
            <span class="change-rate high">+{{ formatPercent(h.percentChange) }}</span>
          </div>
          <div class="hero-reason">
            原因：力量成长 <strong>{{ h.strGain.toFixed(1) }}</strong> |
            敏捷成长 <strong>{{ h.agiGain.toFixed(1) }}</strong>
          </div>
        </div>
      </div>

      <!-- 变化小的英雄 -->
      <div class="change-col low">
        <strong class="change-title">📉 变化最小（曲线平缓）</strong>
        <div v-for="h in curveAnalysis.lowChange" :key="h.name" class="hero-change-item">
          <div class="hero-name" :style="{ color: ATTRIBUTE_COLORS[h.attr] }">
            {{ h.name }}
          </div>
          <div class="hero-values">
            {{ formatValue(h.value1) }}{{ unit }} → {{ formatValue(h.value30) }}{{ unit }}
            <span class="change-rate low">+{{ formatPercent(h.percentChange) }}</span>
          </div>
          <div class="hero-reason">
            原因：力量成长 <strong>{{ h.strGain.toFixed(1) }}</strong> |
            敏捷成长 <strong>{{ h.agiGain.toFixed(1) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="insight">
      <strong>💡 分析结论：</strong>
      <p>
        被击杀时间 = 物理EHP ÷ 平均DPS。物理EHP由<strong>力量</strong>（影响HP）和<strong>敏捷</strong>（影响护甲）决定。
      </p>
      <p>
        • <strong>曲线陡峭</strong>的英雄：力量成长高，HP随等级增长快，EHP增速超过平均DPS增速<br/>
        • <strong>曲线平缓</strong>的英雄：力量/敏捷成长低，EHP增速接近或低于平均DPS增速
      </p>
    </div>
  </div>
  <div v-else class="curve-analysis-box empty">
    请选择英雄进行分析
  </div>
</template>

<style scoped>
.curve-analysis-box {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%);
  border-radius: 12px;
  border-left: 4px solid #3498db;
}

.curve-analysis-box.empty {
  color: #7f8c8d;
  text-align: center;
  padding: 2rem;
}

.curve-analysis-box h4 {
  color: #2980b9;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.stats-list {
  margin: 0.5rem 0 1rem;
  padding-left: 1.2rem;
}

.stats-list li {
  margin-bottom: 0.5rem;
  color: #555;
}

.stat-highlight {
  display: inline-block;
  background: #3498db;
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  margin: 0 0.2rem;
}

.attr-avg {
  font-weight: 600;
  margin-right: 0.5rem;
}

.attr-avg::after {
  content: ' |';
  color: #ccc;
}

.attr-avg:last-child::after {
  content: '';
}

.change-comparison {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.change-col {
  flex: 1;
  min-width: 280px;
}

.change-title {
  display: block;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
}

.change-col.high .change-title {
  color: #27ae60;
}

.change-col.low .change-title {
  color: #e67e22;
}

.hero-change-item {
  background: #fff;
  padding: 0.8rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.hero-name {
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.hero-values {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 0.3rem;
}

.change-rate {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  margin-left: 0.5rem;
}

.change-rate.high {
  background: #d5f5e3;
  color: #27ae60;
}

.change-rate.low {
  background: #fdebd0;
  color: #e67e22;
}

.hero-reason {
  font-size: 0.8rem;
  color: #7f8c8d;
}

.hero-reason strong {
  color: #2c3e50;
}

.insight {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #2c3e50;
}

.insight strong {
  color: #2980b9;
}

.insight p {
  margin: 0.5rem 0 0;
  line-height: 1.6;
}
</style>
