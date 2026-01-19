<script setup lang="ts">
import type { Hero, PrimaryAttribute } from '~/types/dota'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  level: number
  title: string
  valueGetter: (hero: Hero, level: number) => number
  unit?: string
  excludeHeroes?: string[]
  excludeNote?: string
}>()

// 计算分析数据
const analysisData = computed(() => {
  const unit = props.unit || ''
  const excludeSet = new Set(props.excludeHeroes || [])

  // 过滤并计算数据
  const heroData = props.heroes
    .filter(h => !excludeSet.has(h.name))
    .map(h => ({
      name: h.name,
      value: props.valueGetter(h, props.level),
      attr: h.primaryAttribute
    }))
    .sort((a, b) => b.value - a.value)

  const values = heroData.map(h => h.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const range = max - min

  // 按属性分组统计
  const byAttr: Record<string, number[]> = {}
  heroData.forEach(h => {
    if (!byAttr[h.attr]) byAttr[h.attr] = []
    byAttr[h.attr].push(h.value)
  })
  const attrAvg: Record<string, number> = {}
  for (const attr in byAttr) {
    attrAvg[attr] = byAttr[attr].reduce((a, b) => a + b, 0) / byAttr[attr].length
  }

  const top5 = heroData.slice(0, 5)
  const bottom5 = heroData.slice(-5).reverse()

  return {
    max,
    min,
    avg,
    range,
    attrAvg,
    top5,
    bottom5,
    unit,
    count: heroData.length
  }
})

// 格式化数值
const formatValue = (val: number) => {
  return Number.isInteger(val) ? val.toString() : val.toFixed(2)
}
</script>

<template>
  <div class="analysis-box">
    <h4>📊 {{ level }}级{{ title }}分析</h4>

    <p v-if="excludeNote" class="exclude-note">
      ⚠️ {{ excludeNote }}
    </p>

    <ul class="stats-list">
      <li>
        {{ title }}范围：
        <span class="stat-highlight">{{ formatValue(analysisData.min) }}{{ analysisData.unit }}</span>
        ~
        <span class="stat-highlight">{{ formatValue(analysisData.max) }}{{ analysisData.unit }}</span>
        （差距 {{ formatValue(analysisData.range) }}）
      </li>
      <li>
        平均{{ title }}：
        <span class="stat-highlight">{{ formatValue(analysisData.avg) }}{{ analysisData.unit }}</span>
      </li>
      <li>
        按主属性平均值：
        <span
          v-for="(avg, attr) in analysisData.attrAvg"
          :key="attr"
          class="attr-avg"
          :style="{ color: ATTRIBUTE_COLORS[attr as PrimaryAttribute] }"
        >
          {{ ATTRIBUTE_NAMES[attr as PrimaryAttribute] }}: {{ formatValue(avg) }}
        </span>
      </li>
    </ul>

    <div class="rankings">
      <div class="ranking-col">
        <strong class="rank-title top">🏆 {{ title }}Top 5：</strong>
        <ol>
          <li v-for="h in analysisData.top5" :key="h.name">
            {{ h.name }} ({{ formatValue(h.value) }}{{ analysisData.unit }})
          </li>
        </ol>
      </div>
      <div class="ranking-col">
        <strong class="rank-title bottom">⚠️ {{ title }}最低5：</strong>
        <ol>
          <li v-for="h in analysisData.bottom5" :key="h.name">
            {{ h.name }} ({{ formatValue(h.value) }}{{ analysisData.unit }})
          </li>
        </ol>
      </div>
    </div>

    <div class="insight">
      <slot name="insight">
        💡 共分析 {{ analysisData.count }} 个英雄
      </slot>
    </div>
  </div>
</template>

<style scoped>
.analysis-box {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border-left: 4px solid var(--accent-primary);
}

.analysis-box h4 {
  color: var(--accent-primary);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.exclude-note {
  color: #7f8c8d;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.stats-list {
  margin: 0.5rem 0;
  padding-left: 1.2rem;
}

.stats-list li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.stat-highlight {
  display: inline-block;
  background: var(--accent-primary);
  color: #fff;
  padding: 0.2rem 0.6rem;
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

.rankings {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.ranking-col {
  flex: 1;
  min-width: 200px;
}

.rank-title {
  display: block;
  margin-bottom: 0.5rem;
}

.rank-title.top {
  color: #27ae60;
}

.rank-title.bottom {
  color: #e74c3c;
}

.ranking-col ol {
  margin: 0.5rem 0;
  padding-left: 1.2rem;
}

.ranking-col li {
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.insight {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
  font-style: italic;
  color: var(--accent-primary);
}
</style>
