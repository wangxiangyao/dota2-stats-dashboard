<script setup lang="ts">
// 技能数据接口（来自 abilities.json）
interface Ability {
  internalName: string
  name: string | null
  nameZh: string | null
  heroName: string
  heroNameZh: string | null
  heroNameEn: string | null
  damageType: string | null
  behavior: string
  targetTeam: string | null  // ENEMY / FRIENDLY / BOTH / CUSTOM / null
  isUltimate: boolean
  isPassive: boolean
  isInnate: boolean
  cooldown: string | null
  manaCost: string | null
  damageKeys: string[]
  damageValues: number[][]
}

// 英雄属性配置
const attributeConfig = {
  strength: { label: '力量', color: '#e63946' },
  agility: { label: '敏捷', color: '#2ecc71' },
  intelligence: { label: '智力', color: '#3498db' },
  universal: { label: '全能', color: '#9b59b6' }
} as const

type HeroAttribute = keyof typeof attributeConfig

// 数据状态
const abilities = ref<Ability[]>([])
const damageAbilities = ref<Ability[]>([])  // 主动伤害类技能（预过滤）
const loading = ref(true)
const activeTab = ref('overview')

// 加载数据
onMounted(async () => {
  try {
    const [allData, damageData] = await Promise.all([
      $fetch<Ability[]>('/data/abilities.json'),
      $fetch<Ability[]>('/data/damage-abilities.json')
    ])
    if (allData) abilities.value = allData
    if (damageData) damageAbilities.value = damageData
  } catch (e) {
    console.error('加载技能数据失败:', e)
  }
  loading.value = false
})

// 从 heroName 推断英雄属性（基于 abilities.json 中的数据）
// 注：这里需要一个英雄属性映射，暂时从 heroes.json 加载
const heroAttributes = ref<Record<string, HeroAttribute>>({})

onMounted(async () => {
  try {
    const heroes = await $fetch<any[]>('/data/heroes.json')
    if (heroes) {
      for (const h of heroes) {
        const key = h.internalName?.replace('npc_dota_hero_', '') || ''
        if (key) {
          heroAttributes.value[key] = h.primaryAttribute || 'universal'
        }
      }
    }
  } catch (e) {
    console.error('加载英雄数据失败:', e)
  }
})

// 按英雄分组
const abilitiesByHero = computed(() => {
  const map: Record<string, Ability[]> = {}
  for (const a of abilities.value) {
    if (!map[a.heroName]) map[a.heroName] = []
    map[a.heroName].push(a)
  }
  return map
})

// 英雄列表（按中文名排序）
const heroList = computed(() => {
  return Object.entries(abilitiesByHero.value)
    .map(([name, abs]) => ({
      name,
      nameZh: abs[0]?.heroNameZh || name,
      nameEn: abs[0]?.heroNameEn || name,
      attribute: heroAttributes.value[name] || 'universal',
      abilities: abs
    }))
    .sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-CN'))
})

// 按属性分组的英雄
const heroListByAttribute = computed(() => {
  const groups: Record<HeroAttribute, typeof heroList.value> = {
    strength: [], agility: [], intelligence: [], universal: []
  }
  for (const hero of heroList.value) {
    groups[hero.attribute].push(hero)
  }
  return groups
})

// === 伤害技能标签页 ===

// 判断技能是否有伤害数值
const hasDamage = (ability: Ability): boolean => {
  return ability.damageValues.length > 0 && ability.damageValues.some(arr => arr.some(v => v > 0))
}

// 判断技能是否可以作用于敌方
// 1. targetTeam 明确包含 ENEMY（包括 ENEMY | FRIENDLY 等组合）
// 2. 或者是 NO_TARGET / POINT / AOE 行为（可作用于敌人的范围技能）
const canTargetEnemy = (ability: Ability): boolean => {
  const team = ability.targetTeam || ''
  const behavior = ability.behavior || ''
  // 显式指向敌人
  if (team.includes('ENEMY') || team === 'BOTH' || team === 'CUSTOM') return true
  // NO_TARGET / POINT / AOE 类型技能通常可作用于敌人
  if (behavior.includes('NO_TARGET') || behavior.includes('POINT') || behavior.includes('AOE')) return true
  return false
}

// 格式化伤害值显示
const formatDamage = (ability: Ability): string => {
  if (!hasDamage(ability)) return '-'
  // 取第一个伤害数组
  const values = ability.damageValues[0]
  return values.join(' / ')
}

// 有伤害的主动技能列表（使用预过滤的 damage-abilities.json）
const damageAbilitiesByHero = computed(() => {
  const map: Record<string, Ability[]> = {}
  for (const a of damageAbilities.value) {
    if (!map[a.heroName]) map[a.heroName] = []
    map[a.heroName].push(a)
  }
  return map
})

// 有伤害技能的英雄列表
const damageHeroList = computed(() => {
  return Object.entries(damageAbilitiesByHero.value)
    .map(([name, abs]) => ({
      name,
      nameZh: abs[0]?.heroNameZh || name,
      attribute: heroAttributes.value[name] || 'universal',
      abilities: abs
    }))
    .sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-CN'))
})

// 按属性分组
const damageHeroListByAttribute = computed(() => {
  const groups: Record<HeroAttribute, typeof damageHeroList.value> = {
    strength: [], agility: [], intelligence: [], universal: []
  }
  for (const hero of damageHeroList.value) {
    groups[hero.attribute].push(hero)
  }
  return groups
})

// 统计信息
const stats = computed(() => {
  const totalAbilities = abilities.value.length
  const activeAbilities = abilities.value.filter(a => !a.isPassive).length
  const damageAbilitiesCount = damageAbilities.value.length  // 使用预过滤数据
  return {
    totalHeroes: heroList.value.length,
    totalAbilities,
    activeAbilities,
    damageAbilities: damageAbilitiesCount
  }
})
</script>

<template>
  <div class="ability-check-page">
    <h1>技能数据</h1>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else>
      <!-- 统计信息 -->
      <div class="stats-bar">
        <span>{{ stats.totalHeroes }} 英雄</span>
        <span>{{ stats.totalAbilities }} 技能</span>
        <span>{{ stats.activeAbilities }} 主动技能</span>
        <span>{{ stats.damageAbilities }} 有伤害值</span>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab">
        <!-- 技能概览 -->
        <el-tab-pane label="技能概览" name="overview">
          <div
            v-for="(attr, attrKey) in attributeConfig"
            :key="attrKey"
            class="attribute-section"
          >
            <h2 :style="{ color: attr.color }">
              {{ attr.label }} ({{ heroListByAttribute[attrKey as HeroAttribute].length }})
            </h2>
            <div class="hero-grid">
              <div
                v-for="hero in heroListByAttribute[attrKey as HeroAttribute]"
                :key="hero.name"
                class="hero-card"
              >
                <div class="hero-name">{{ hero.nameZh }}</div>
                <div class="ability-list">
                  <span
                    v-for="ability in hero.abilities"
                    :key="ability.internalName"
                    class="ability-tag"
                    :class="{
                      ultimate: ability.isUltimate,
                      passive: ability.isPassive,
                      innate: ability.isInnate
                    }"
                    :title="ability.name || ability.internalName"
                  >
                    {{ ability.nameZh || ability.internalName }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 伤害技能 -->
        <el-tab-pane :label="`伤害技能 (${stats.damageAbilities})`" name="damage">
          <div class="tab-description">
            ⚡ 手动甄别过滤，所有主动-伤害类技能（排除幻象、召唤、增益类及神杖/魔晶技能）
          </div>
          <div
            v-for="(attr, attrKey) in attributeConfig"
            :key="attrKey"
            class="attribute-section"
          >
            <h2 :style="{ color: attr.color }">
              {{ attr.label }} ({{ damageHeroListByAttribute[attrKey as HeroAttribute].length }})
            </h2>
            <div class="hero-grid damage-grid">
              <div
                v-for="hero in damageHeroListByAttribute[attrKey as HeroAttribute]"
                :key="hero.name"
                class="hero-card"
                :class="{ 'full-width': hero.name === 'invoker' }"
              >
                <div class="hero-name">{{ hero.nameZh }}</div>
                <div class="damage-abilities">
                  <div
                    v-for="ability in hero.abilities"
                    :key="ability.internalName"
                    class="damage-ability"
                  >
                    <span class="ability-name" :class="{ ultimate: ability.isUltimate }">
                      {{ ability.nameZh || ability.internalName }}
                    </span>
                    <span class="damage-type" :class="ability.damageType?.toLowerCase()">
                      {{ ability.damageType || '-' }}
                    </span>
                    <span class="damage-value">{{ formatDamage(ability) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<style scoped>
.ability-check-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 10px 15px;
  background: #f5f5f5;
  border-radius: 6px;
}

.stats-bar span {
  font-size: 14px;
  color: #666;
}

.tab-description {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea11, #764ba211);
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 14px;
  color: #555;
}

.attribute-section {
  margin-bottom: 30px;
}

.attribute-section h2 {
  font-size: 18px;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 2px solid currentColor;
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.hero-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
}

.hero-name {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.ability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ability-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #e8e8e8;
  border-radius: 4px;
  cursor: default;
}

.ability-tag.ultimate {
  background: #fff3cd;
  color: #856404;
  font-weight: 500;
}

.ability-tag.passive {
  background: #d4edda;
  color: #155724;
}

.ability-tag.innate {
  background: #cce5ff;
  color: #004085;
}

/* 伤害技能样式 */
.damage-grid .hero-card {
  min-width: 300px;
}

.damage-abilities {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.damage-ability {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
}

.damage-ability:last-child {
  border-bottom: none;
}

.ability-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ability-name.ultimate {
  color: #d4a017;
  font-weight: 500;
}

.damage-type {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #eee;
}

.damage-type.magical {
  background: #cce5ff;
  color: #004085;
}

.damage-type.physical {
  background: #f8d7da;
  color: #721c24;
}

.damage-type.pure {
  background: #fff3cd;
  color: #856404;
}

.damage-value {
  font-family: monospace;
  font-size: 12px;
  color: #e74c3c;
  min-width: 80px;
  text-align: right;
}

/* 祈求者特殊样式：占满整行 */
.hero-card.full-width {
  grid-column: 1 / -1;
}

.hero-card.full-width .damage-abilities {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-card.full-width .damage-ability {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 8px 12px;
  border-bottom: none;
}
</style>
