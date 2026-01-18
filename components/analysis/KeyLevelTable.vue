<script setup lang="ts">
/**
 * 通用关键等级分析表格
 * 用于分析生命值、护甲、攻击力等各类数值在关键等级的统计
 */
const EXCLUDE = ['美杜莎']
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  title: string                                    // 分析标题，如"生命值"
  valueGetter: (hero: Hero, level: number) => number  // 数值计算函数
  unit?: string                                    // 单位，如""、"%"、"/秒"
  precision?: number                               // 小数位数，默认0
  excludeHeroes?: string[]                         // 排除的英雄名单
}>()

// 关键等级
const KEY_LEVELS = [1, 4, 6, 12, 15, 18, 20, 25, 30]

// 过滤后的英雄列表
const filteredHeroes = computed(() => {
  const excludeSet = new Set(props.excludeHeroes || [])
  return props.heroes.filter(h => !excludeSet.has(h.name))
})

// 按主属性分组
const heroGroups = computed(() => {
  const groups: Record<string, Hero[]> = {
    strength: [],
    agility: [],
    intelligence: [],
    universal: []
  }
  filteredHeroes.value.forEach(h => groups[h.primaryAttribute].push(h))
  return groups
})

// 格式化数值
const formatValue = (val: number) => {
  const p = props.precision ?? 0
  return p === 0 ? Math.round(val) : val.toFixed(p)
}

// 计算各等级的统计数据
const levelStats = computed(() => {
  if (!filteredHeroes.value.length) return []
  
  return KEY_LEVELS.map((level, idx) => {
    // 全体英雄数据
    const allValues = filteredHeroes.value.map(h => props.valueGetter(h, level))
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length
    const max = Math.max(...allValues)
    const min = Math.min(...allValues)
    
    // 按属性分组统计
    const byAttr: Record<string, number> = {}
    for (const attr in heroGroups.value) {
      const heroes = heroGroups.value[attr]
      if (heroes.length) {
        const values = heroes.map(h => props.valueGetter(h, level))
        byAttr[attr] = values.reduce((a, b) => a + b, 0) / values.length
      }
    }
    
    return {
      level,
      avg,
      max,
      min,
      range: max - min,
      strength: byAttr.strength || 0,
      agility: byAttr.agility || 0,
      intelligence: byAttr.intelligence || 0,
      universal: byAttr.universal || 0
    }
  })
})

// 计算增长数据（相对于上一个等级）
const growthData = computed(() => {
  if (!levelStats.value.length) return []
  
  const baseAvg = levelStats.value[0].avg
  
  return levelStats.value.map((stat, idx) => {
    const prev = idx > 0 ? levelStats.value[idx - 1] : null
    const deltaAvg = prev ? stat.avg - prev.avg : 0
    const deltaLevels = prev ? stat.level - prev.level : 0
    const perLevel = deltaLevels > 0 ? deltaAvg / deltaLevels : 0
    
    return {
      level: stat.level,
      ratio: baseAvg > 0 ? (stat.avg / baseAvg) : 1,        // 相对1级的倍率
      deltaAvg,                                              // 相对上一等级的增量
      deltaLevels,                                           // 等级差
      perLevel                                               // 每级增长
    }
  })
})

// 是否高亮的等级
const isHighlight = (level: number) => [1, 6, 12, 25].includes(level)
</script>

<template>
  <div class="key-level-table">
    <h4>📊 {{ title }}关键等级统计</h4>
    
    <div class="table-wrapper">
      <table class="stats-table">
        <thead>
          <tr>
            <th rowspan="2">等级</th>
            <th colspan="4">全体英雄</th>
            <th colspan="4">按主属性平均</th>
            <th colspan="2">成长</th>
          </tr>
          <tr>
            <th>平均</th>
            <th class="max">最高</th>
            <th class="min">最低</th>
            <th>极差</th>
            <th :style="{ color: ATTRIBUTE_COLORS.strength }">力量</th>
            <th :style="{ color: ATTRIBUTE_COLORS.agility }">敏捷</th>
            <th :style="{ color: ATTRIBUTE_COLORS.intelligence }">智力</th>
            <th :style="{ color: ATTRIBUTE_COLORS.universal }">全能</th>
            <th>增量</th>
            <th>倍率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(stat, idx) in levelStats" :key="stat.level" :class="{ highlight: isHighlight(stat.level) }">
            <td class="level">{{ stat.level }}级</td>
            <td>{{ formatValue(stat.avg) }}{{ unit }}</td>
            <td class="max">{{ formatValue(stat.max) }}{{ unit }}</td>
            <td class="min">{{ formatValue(stat.min) }}{{ unit }}</td>
            <td>{{ formatValue(stat.range) }}</td>
            <td :style="{ color: ATTRIBUTE_COLORS.strength }">{{ formatValue(stat.strength) }}</td>
            <td :style="{ color: ATTRIBUTE_COLORS.agility }">{{ formatValue(stat.agility) }}</td>
            <td :style="{ color: ATTRIBUTE_COLORS.intelligence }">{{ formatValue(stat.intelligence) }}</td>
            <td :style="{ color: ATTRIBUTE_COLORS.universal }">{{ formatValue(stat.universal) }}</td>
            <td class="delta">
              <template v-if="idx > 0">
                +{{ formatValue(growthData[idx].deltaAvg) }}
                <span class="per-level">({{ formatValue(growthData[idx].perLevel) }}/级)</span>
              </template>
              <template v-else>-</template>
            </td>
            <td class="ratio">×{{ growthData[idx].ratio.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 排除英雄提示 -->
    <p v-if="excludeHeroes?.length" class="exclude-note">
      ⚠️ 已排除：{{ excludeHeroes.join('、') }}
    </p>
    
    <!-- 分析结论区域，由外部传入 -->
    <div v-if="$slots.default" class="analysis-conclusion">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.key-level-table {
  margin: 1.5rem 0;
  padding: 1.2rem;
  background-color: #f8f9fa;
  background-image: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border-left: 4px solid #3498db;
  position: relative;
  z-index: 1;
}

.key-level-table h4 {
  margin: 0 0 1rem;
  color: #2c3e50;
}

.table-wrapper {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  white-space: nowrap;
}

.stats-table th,
.stats-table td {
  padding: 0.4rem 0.5rem;
  text-align: center;
  border: 1px solid #dee2e6;
}

.stats-table thead th {
  background: #e9ecef;
  font-weight: 600;
  color: #495057;
}

.stats-table th.max { color: #27ae60; }
.stats-table th.min { color: #e74c3c; }

.stats-table tr.highlight {
  background: rgba(52, 152, 219, 0.1);
}

.stats-table td.level {
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fa;
}

.stats-table td.max {
  color: #27ae60;
  font-weight: 600;
}

.stats-table td.min {
  color: #e74c3c;
}

.stats-table td.delta {
  color: #27ae60;
  font-weight: 500;
}

.stats-table td.delta .per-level {
  font-size: 0.75rem;
  color: #7f8c8d;
  font-weight: normal;
}

.stats-table td.ratio {
  color: #9b59b6;
  font-weight: 600;
}

.exclude-note {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
  color: #95a5a6;
  font-style: italic;
}

.analysis-conclusion {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(52, 152, 219, 0.08);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #34495e;
  line-height: 1.6;
}

.analysis-conclusion :deep(p) {
  margin: 0.3rem 0;
}

.analysis-conclusion :deep(ul) {
  margin: 0.3rem 0;
  padding-left: 1.5rem;
}
</style>
