<script setup lang="ts">
import type { Ability, Hero } from '~/types/dota'
import { useAbilityCalculator } from '~/composables/useAbilityCalculator'

const { loadActiveAbilities, loadHeroes } = useDataLoader()
const {
  extractDamage,
  extractCooldown,
  extractManaCost,
  filterDamageAbilities,
  calculateMedian,
  calculatePercentile,
  calculateStdDev
} = useAbilityCalculator()

// 当前Tab
const activeTab = ref('damage')

// 数据
const allAbilities = ref<Ability[]>([])
const allHeroes = ref<Hero[]>([])
const loading = ref(true)

// 英雄属性映射
const heroAttributeMap = computed(() => {
  const map: Record<string, string> = {}
  allHeroes.value.forEach(h => {
    const key = h.internalName?.replace('npc_dota_hero_', '') || ''
    if (key) map[key] = h.primaryAttribute
  })
  return map
})

// 伤害类技能
const damageAbilities = computed(() => filterDamageAbilities(allAbilities.value))

// 按槽位分组
const normalAbilities = computed(() => damageAbilities.value.filter(a => !a.is_ultimate))
const ultimateAbilities = computed(() => damageAbilities.value.filter(a => a.is_ultimate))

// 提取数值数组
const extractValues = (abilities: Ability[], extractor: (a: Ability, level: number) => number, level: number = 1) => {
  return abilities.map(a => extractor(a, level)).filter(v => v > 0)
}

// 计算统计数据
const calculateStats = (values: number[]) => {
  if (values.length === 0) return { count: 0, mean: 0, median: 0, p25: 0, p75: 0, min: 0, max: 0, stdDev: 0 }
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    count: values.length,
    mean: sum / values.length,
    median: calculateMedian(values),
    p25: calculatePercentile(values, 25),
    p75: calculatePercentile(values, 75),
    min: Math.min(...values),
    max: Math.max(...values),
    stdDev: calculateStdDev(values)
  }
}

// 普通技能统计
const normalStats = computed(() => {
  const damages = extractValues(normalAbilities.value, extractDamage)
  const cds = extractValues(normalAbilities.value, extractCooldown)
  const manas = extractValues(normalAbilities.value, extractManaCost)
  return {
    damage: calculateStats(damages),
    cooldown: calculateStats(cds),
    manaCost: calculateStats(manas),
    dps: calculateStats(damages.map((d, i) => cds[i] > 0 ? d / cds[i] : 0).filter(v => v > 0)),
    efficiency: calculateStats(damages.map((d, i) => manas[i] > 0 ? d / manas[i] : 0).filter(v => v > 0))
  }
})

// 大招统计
const ultimateStats = computed(() => {
  const damages = extractValues(ultimateAbilities.value, extractDamage)
  const cds = extractValues(ultimateAbilities.value, extractCooldown)
  const manas = extractValues(ultimateAbilities.value, extractManaCost)
  return {
    damage: calculateStats(damages),
    cooldown: calculateStats(cds),
    manaCost: calculateStats(manas),
    dps: calculateStats(damages.map((d, i) => cds[i] > 0 ? d / cds[i] : 0).filter(v => v > 0)),
    efficiency: calculateStats(damages.map((d, i) => manas[i] > 0 ? d / manas[i] : 0).filter(v => v > 0))
  }
})

// 比例计算
const ratios = computed(() => {
  const n = normalStats.value
  const u = ultimateStats.value
  if (n.damage.mean === 0) return { damage: 0, cooldown: 0, manaCost: 0, dps: 0, efficiency: 0 }
  return {
    damage: u.damage.mean / n.damage.mean,
    cooldown: u.cooldown.mean / n.cooldown.mean,
    manaCost: u.manaCost.mean / n.manaCost.mean,
    dps: u.dps.mean / n.dps.mean,
    efficiency: u.efficiency.mean / n.efficiency.mean
  }
})

// 按伤害类型分组
const damageTypeGroups = computed(() => {
  const groups: Record<string, Ability[]> = { Physical: [], Magical: [], Pure: [] }
  damageAbilities.value.forEach(a => {
    if (a.damageType && groups[a.damageType]) {
      groups[a.damageType].push(a)
    }
  })
  return Object.entries(groups).map(([type, abilities]) => {
    const damages = extractValues(abilities, extractDamage)
    const cds = extractValues(abilities, extractCooldown)
    const manas = extractValues(abilities, extractManaCost)
    return {
      type,
      count: abilities.length,
      avgDamage: damages.length ? damages.reduce((a, b) => a + b, 0) / damages.length : 0,
      avgCooldown: cds.length ? cds.reduce((a, b) => a + b, 0) / cds.length : 0,
      avgManaCost: manas.length ? manas.reduce((a, b) => a + b, 0) / manas.length : 0
    }
  })
})

// 按英雄属性分组
const attributeGroups = computed(() => {
  const groups: Record<string, Ability[]> = { strength: [], agility: [], intelligence: [], universal: [] }
  damageAbilities.value.forEach(a => {
    const attr = heroAttributeMap.value[a.heroName] || 'universal'
    if (groups[attr]) groups[attr].push(a)
  })
  return Object.entries(groups).map(([attr, abilities]) => {
    const damages = extractValues(abilities, extractDamage)
    const normals = abilities.filter(a => !a.is_ultimate)
    const ults = abilities.filter(a => a.is_ultimate)
    const normalDmg = extractValues(normals, extractDamage)
    const ultDmg = extractValues(ults, extractDamage)
    return {
      attribute: attr,
      label: { strength: '力量', agility: '敏捷', intelligence: '智力', universal: '全能' }[attr],
      count: abilities.length,
      normalCount: normals.length,
      ultCount: ults.length,
      avgDamage: damages.length ? damages.reduce((a, b) => a + b, 0) / damages.length : 0,
      normalAvgDamage: normalDmg.length ? normalDmg.reduce((a, b) => a + b, 0) / normalDmg.length : 0,
      ultAvgDamage: ultDmg.length ? ultDmg.reduce((a, b) => a + b, 0) / ultDmg.length : 0
    }
  }).filter(g => g.count > 0)
})

// Top伤害技能
const topNormalAbilities = computed(() => {
  return [...normalAbilities.value]
    .map(a => ({ ...a, damage: extractDamage(a, 1), cd: extractCooldown(a, 1), mana: extractManaCost(a, 1) }))
    .filter(a => a.damage > 0)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10)
})

const topUltimateAbilities = computed(() => {
  return [...ultimateAbilities.value]
    .map(a => ({ ...a, damage: extractDamage(a, 1), cd: extractCooldown(a, 1), mana: extractManaCost(a, 1) }))
    .filter(a => a.damage > 0)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10)
})

// 直方图数据
const normalDamageValues = computed(() => extractValues(normalAbilities.value, extractDamage))
const ultimateDamageValues = computed(() => extractValues(ultimateAbilities.value, extractDamage))

// 格式化
const fmt = (n: number, d: number = 0) => n === 0 ? '-' : n.toFixed(d)

// 加载数据
onMounted(async () => {
  try {
    const [abilities, heroes] = await Promise.all([loadActiveAbilities(), loadHeroes()])
    if (abilities) allAbilities.value = abilities
    if (heroes) allHeroes.value = heroes
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <!-- 页头 -->
    <header class="page-header">
      <h1>技能数值分析</h1>
      <p>通过多维度数据揭示 Dota2 技能设计的底层逻辑</p>
    </header>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else>
      <!-- Tab 导航 -->
      <nav class="tabs">
        <button :class="{ active: activeTab === 'damage' }" @click="activeTab = 'damage'">A. 出伤效率</button>
        <button :class="{ active: activeTab === 'kill' }" @click="activeTab = 'kill'">B. 击杀效率</button>
        <button :class="{ active: activeTab === 'control' }" @click="activeTab = 'control'">C. 控制效率</button>
        <button :class="{ active: activeTab === 'mana' }" @click="activeTab = 'mana'">D. 魔法经济</button>
        <button :class="{ active: activeTab === 'range' }" @click="activeTab = 'range'">E. 技能范围</button>
      </nav>

      <!-- Tab A: 出伤效率 -->
      <div v-show="activeTab === 'damage'" class="tab-content">
        <!-- 数据概览 -->
        <section class="section">
          <h2>数据概览</h2>
          <div class="overview-cards">
            <div class="card">
              <div class="card-value">{{ damageAbilities.length }}</div>
              <div class="card-label">伤害类技能</div>
            </div>
            <div class="card">
              <div class="card-value">{{ normalAbilities.length }}</div>
              <div class="card-label">普通技能</div>
            </div>
            <div class="card">
              <div class="card-value">{{ ultimateAbilities.length }}</div>
              <div class="card-label">大招</div>
            </div>
          </div>
        </section>

        <!-- A1. 核心对比表 -->
        <section class="section">
          <h2>A1. 普通技能 vs 大招</h2>
          <p class="desc">大招各项数值相对于普通技能的倍数关系</p>

          <table class="data-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>技能数</th>
                <th>平均伤害</th>
                <th>平均CD</th>
                <th>平均蓝耗</th>
                <th>平均DPS</th>
                <th>平均蓝效</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>普通技能</td>
                <td>{{ normalStats.damage.count }}</td>
                <td class="damage">{{ fmt(normalStats.damage.mean) }}</td>
                <td>{{ fmt(normalStats.cooldown.mean, 1) }}s</td>
                <td>{{ fmt(normalStats.manaCost.mean) }}</td>
                <td class="dps">{{ fmt(normalStats.dps.mean, 1) }}</td>
                <td>{{ fmt(normalStats.efficiency.mean, 2) }}</td>
              </tr>
              <tr>
                <td>大招</td>
                <td>{{ ultimateStats.damage.count }}</td>
                <td class="damage">{{ fmt(ultimateStats.damage.mean) }}</td>
                <td>{{ fmt(ultimateStats.cooldown.mean, 1) }}s</td>
                <td>{{ fmt(ultimateStats.manaCost.mean) }}</td>
                <td class="dps">{{ fmt(ultimateStats.dps.mean, 1) }}</td>
                <td>{{ fmt(ultimateStats.efficiency.mean, 2) }}</td>
              </tr>
              <tr class="ratio-row">
                <td>大招/普通</td>
                <td>-</td>
                <td class="ratio">{{ fmt(ratios.damage, 2) }}x</td>
                <td class="ratio">{{ fmt(ratios.cooldown, 2) }}x</td>
                <td class="ratio">{{ fmt(ratios.manaCost, 2) }}x</td>
                <td class="ratio">{{ fmt(ratios.dps, 2) }}x</td>
                <td class="ratio">{{ fmt(ratios.efficiency, 2) }}x</td>
              </tr>
            </tbody>
          </table>

          <div class="insight">
            <strong>设计规律：</strong>
            大招伤害约为普通技能的 <em>{{ fmt(ratios.damage, 1) }}倍</em>，
            但CD约为 <em>{{ fmt(ratios.cooldown, 1) }}倍</em>，
            导致DPS反而只有 <em>{{ fmt(ratios.dps, 1) }}倍</em>。
            这体现了"高伤害=长等待"的设计平衡。
          </div>
        </section>

        <!-- A2. 伤害分布 -->
        <section class="section">
          <h2>A2. 伤害数值分布</h2>
          <p class="desc">分析技能伤害的设计区间</p>

          <div class="two-col">
            <!-- 普通技能 -->
            <div class="col">
              <h3>普通技能（1级）</h3>
              <div class="stats-grid">
                <div class="stat">
                  <span class="stat-label">均值</span>
                  <span class="stat-value">{{ fmt(normalStats.damage.mean) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">中位数</span>
                  <span class="stat-value">{{ fmt(normalStats.damage.median) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">25-75分位</span>
                  <span class="stat-value">{{ fmt(normalStats.damage.p25) }} - {{ fmt(normalStats.damage.p75) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">范围</span>
                  <span class="stat-value">{{ fmt(normalStats.damage.min) }} - {{ fmt(normalStats.damage.max) }}</span>
                </div>
              </div>
              <HistogramChart
                :data="{ name: '普通技能', values: normalDamageValues }"
                title=""
                :bin-count="15"
                height="250px"
              />
            </div>

            <!-- 大招 -->
            <div class="col">
              <h3>大招（1级）</h3>
              <div class="stats-grid">
                <div class="stat">
                  <span class="stat-label">均值</span>
                  <span class="stat-value">{{ fmt(ultimateStats.damage.mean) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">中位数</span>
                  <span class="stat-value">{{ fmt(ultimateStats.damage.median) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">25-75分位</span>
                  <span class="stat-value">{{ fmt(ultimateStats.damage.p25) }} - {{ fmt(ultimateStats.damage.p75) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">范围</span>
                  <span class="stat-value">{{ fmt(ultimateStats.damage.min) }} - {{ fmt(ultimateStats.damage.max) }}</span>
                </div>
              </div>
              <HistogramChart
                :data="{ name: '大招', values: ultimateDamageValues, color: '#f59e0b' }"
                title=""
                :bin-count="15"
                height="250px"
              />
            </div>
          </div>
        </section>

        <!-- A3. 按伤害类型分组 -->
        <section class="section">
          <h2>A3. 按伤害类型分组</h2>
          <p class="desc">物理/魔法/纯粹伤害的设计差异</p>

          <table class="data-table">
            <thead>
              <tr>
                <th>伤害类型</th>
                <th>技能数</th>
                <th>平均伤害</th>
                <th>平均CD</th>
                <th>平均蓝耗</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in damageTypeGroups" :key="g.type">
                <td>
                  <span class="type-badge" :class="g.type.toLowerCase()">{{ g.type }}</span>
                </td>
                <td>{{ g.count }}</td>
                <td class="damage">{{ fmt(g.avgDamage) }}</td>
                <td>{{ fmt(g.avgCooldown, 1) }}s</td>
                <td>{{ fmt(g.avgManaCost) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- A4. 按英雄属性分组 -->
        <section class="section">
          <h2>A4. 按英雄属性分组</h2>
          <p class="desc">不同属性英雄的技能伤害设计差异</p>

          <table class="data-table">
            <thead>
              <tr>
                <th>英雄属性</th>
                <th>技能数</th>
                <th>普通技能</th>
                <th>大招</th>
                <th>普通平均伤害</th>
                <th>大招平均伤害</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in attributeGroups" :key="g.attribute">
                <td>
                  <span class="attr-badge" :class="g.attribute">{{ g.label }}</span>
                </td>
                <td>{{ g.count }}</td>
                <td>{{ g.normalCount }}</td>
                <td>{{ g.ultCount }}</td>
                <td class="damage">{{ fmt(g.normalAvgDamage) }}</td>
                <td class="damage">{{ fmt(g.ultAvgDamage) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- A5. Top 10 排行 -->
        <section class="section">
          <h2>A5. 高伤害技能排行</h2>
          <p class="desc">1级伤害最高的技能</p>

          <div class="two-col">
            <div class="col">
              <h3>普通技能 Top 10</h3>
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>技能</th>
                    <th>类型</th>
                    <th>伤害</th>
                    <th>CD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, i) in topNormalAbilities" :key="a.internalName">
                    <td class="rank">{{ i + 1 }}</td>
                    <td>
                      <div class="ability-name">{{ a.name_zh || a.name }}</div>
                      <div class="hero-name">{{ a.heroName }}</div>
                    </td>
                    <td><span class="type-badge small" :class="a.damageType?.toLowerCase()">{{ a.damageType }}</span></td>
                    <td class="damage">{{ a.damage }}</td>
                    <td>{{ a.cd }}s</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="col">
              <h3>大招 Top 10</h3>
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>技能</th>
                    <th>类型</th>
                    <th>伤害</th>
                    <th>CD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, i) in topUltimateAbilities" :key="a.internalName">
                    <td class="rank">{{ i + 1 }}</td>
                    <td>
                      <div class="ability-name">{{ a.name_zh || a.name }}</div>
                      <div class="hero-name">{{ a.heroName }}</div>
                    </td>
                    <td><span class="type-badge small" :class="a.damageType?.toLowerCase()">{{ a.damageType }}</span></td>
                    <td class="damage">{{ a.damage }}</td>
                    <td>{{ a.cd }}s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <!-- 其他Tab占位 -->
      <div v-show="activeTab === 'kill'" class="tab-content">
        <section class="section">
          <h2>B. 击杀效率分析</h2>
          <el-empty description="功能开发中..." />
        </section>
      </div>

      <div v-show="activeTab === 'control'" class="tab-content">
        <section class="section">
          <h2>C. 控制效率分析</h2>
          <el-empty description="功能开发中..." />
        </section>
      </div>

      <div v-show="activeTab === 'mana'" class="tab-content">
        <section class="section">
          <h2>D. 魔法经济分析</h2>
          <el-empty description="功能开发中..." />
        </section>
      </div>

      <div v-show="activeTab === 'range'" class="tab-content">
        <section class="section">
          <h2>E. 技能范围分析</h2>
          <el-empty description="功能开发中..." />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.page-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.loading {
  padding: 40px;
  background: #fff;
  border-radius: 8px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 8px;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tabs button:hover {
  color: #1f2937;
}

.tabs button.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Section */
.section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.section h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #374151;
}

.desc {
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0 0 16px 0;
}

/* Overview Cards */
.overview-cards {
  display: flex;
  gap: 16px;
}

.card {
  flex: 1;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.card-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2563eb;
}

.card-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 4px;
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.data-table td.damage {
  color: #dc2626;
  font-weight: 600;
}

.data-table td.dps {
  color: #16a34a;
  font-weight: 500;
}

.data-table td.ratio {
  color: #2563eb;
  font-weight: 600;
}

.data-table td.rank {
  width: 40px;
  text-align: center;
  color: #9ca3af;
}

.data-table tr.ratio-row {
  background: #eff6ff;
}

.data-table.compact th,
.data-table.compact td {
  padding: 8px 10px;
}

/* Insight Box */
.insight {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 0 6px 6px 0;
  font-size: 0.85rem;
  color: #92400e;
}

.insight em {
  font-weight: 600;
  font-style: normal;
  color: #dc2626;
}

/* Two Column Layout */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.col {
  min-width: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat {
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

/* Type Badge */
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge.physical {
  background: #fef2f2;
  color: #dc2626;
}

.type-badge.magical {
  background: #eff6ff;
  color: #2563eb;
}

.type-badge.pure {
  background: #fefce8;
  color: #ca8a04;
}

.type-badge.small {
  padding: 1px 6px;
  font-size: 0.7rem;
}

/* Attribute Badge */
.attr-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.attr-badge.strength {
  background: #fef2f2;
  color: #dc2626;
}

.attr-badge.agility {
  background: #ecfdf5;
  color: #059669;
}

.attr-badge.intelligence {
  background: #eff6ff;
  color: #2563eb;
}

.attr-badge.universal {
  background: #f5f3ff;
  color: #7c3aed;
}

/* Ability Name in Table */
.ability-name {
  font-weight: 500;
  color: #1f2937;
}

.hero-name {
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
