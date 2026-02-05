<template>
  <AnalysisLayout
    title="技能分析"
    subtitle="基于技能数据的伤害、控制与效率分析"
    :tabs="tabs"
    default-tab="distribution"
  >
    <!-- Tab 1: 伤害分布 -->
    <template #distribution>
      <AbilityAnalysisDamageDistribution
        :damage-list="damageList"
        :loading="loading"
      />
    </template>

    <!-- Tab 2: 瞬发与持续 -->
    <template #damageType>
      <AbilityAnalysisBurstDotAnalysis
        :damage-list="damageList"
        :loading="loading"
      />
    </template>

    <!-- Tab 3: 冷却时间 -->
    <template #cooldown>
      <AbilityAnalysisCooldownAnalysis
        :damage-list="damageList"
        :loading="loading"
      />
    </template>

    <!-- Tab 4: 蓝耗分析 -->
    <template #manaCost>
      <AbilityAnalysisManaCostAnalysis
        :damage-list="damageList"
        :loading="loading"
      />
    </template>

    <!-- Tab 5: 眩晕分析 -->
    <template #stun>
      <AbilityAnalysisStunAnalysis
        :stun-abilities="stunAbilities"
        :damage-list="damageList"
        :loading="loading"
      />
    </template>

    <!-- Tab 6: 综合分析 -->
    <template #comprehensive>
      <AbilityAnalysisComprehensiveAnalysis
        :damage-list="damageList"
        :loading="loading"
      />
    </template>
  </AnalysisLayout>
</template>

<script setup lang="ts">
import type { DamageTraitDataMap } from '~/types/traits/damage'
import type { StunTraitDataMap, StunAbilityInfo } from '~/types/traits/stun'
import type { AbilityDamageInfo } from '~/composables/useAbilityDamageAnalyzer'

// Tab配置
const tabs = [
  { name: 'distribution', label: '伤害分布' },
  { name: 'damageType', label: '瞬发与持续' },
  { name: 'cooldown', label: '冷却时间' },
  { name: 'manaCost', label: '蓝耗分析' },
  { name: 'stun', label: '眩晕分析' },
  { name: 'comprehensive', label: '综合分析' }
]

const { loadAbilities, loadHeroes } = useDataLoader()
const { buildAbilityDamageList } = useAbilityDamageAnalyzer()

// 状态
const loading = ref(true)
const damageList = ref<AbilityDamageInfo[]>([])
const stunAbilities = ref<StunAbilityInfo[]>([])

// 构建眩晕技能列表
function buildStunAbilityList(
  stunData: StunTraitDataMap,
  abilities: any[],
  heroes: any[]
): StunAbilityInfo[] {
  // heroes.json 的 internalName 是 "npc_dota_hero_sven"，但 abilities.json 的 heroName 是 "sven"
  // 需要转换 key 以便匹配
  const heroMap = new Map(heroes.map(h => [h.internalName.replace('npc_dota_hero_', ''), h]))
  const abilityMap = new Map(abilities.map(a => [a.internalName, a]))
  
  // 控制时间相关的关键词
  const stunDurationKeys = [
    'stun_duration', 'bash_duration', 'hex_duration', 'root_duration',
    'sleep_duration', 'cyclone_duration', 'taunt_duration', 'fear_duration',
    'channel_time', 'duration', 'disable_duration', 'shackle_duration'
  ]
  
  // 从 abilityValues 中提取控制时间
  function extractStunDuration(ability: any): string {
    if (!ability.abilityValues) return '0'
    
    for (const key of stunDurationKeys) {
      for (const [k, v] of Object.entries(ability.abilityValues)) {
        if (k.toLowerCase().includes(key)) {
          if (typeof v === 'string') return v
          if (typeof v === 'object' && (v as any)?.value) return (v as any).value
          if (typeof v === 'number') return String(v)
        }
      }
    }
    return '0'
  }
  
  const result: StunAbilityInfo[] = []

  for (const [internalName, stun] of Object.entries(stunData)) {
    const ability = abilityMap.get(internalName)
    if (!ability) continue
    
    const hero = heroMap.get(ability.heroName)
    if (!hero) continue
    
    // 解析眩晕时间 - 优先使用 stun 数据中的，否则从 abilityValues 提取
    let durationStr = (stun as any).stunDuration
    if (!durationStr || durationStr === '0') {
      durationStr = extractStunDuration(ability)
    }
    
    const durations = durationStr.split(' ').map(Number).filter((n: number) => !isNaN(n))
    const maxDuration = Math.max(...durations, 0)
    
    // 获取控制类型
    let stunType = (stun as any).stunType || 'stun'
    
    // 尝试获取伤害数据
    let damage: number | null = null
    if (ability.damageValues && ability.damageValues.length > 0) {
      const lastLevel = ability.damageValues[0]
      if (Array.isArray(lastLevel) && lastLevel.length > 0) {
        damage = lastLevel[lastLevel.length - 1]
      }
    }
    
    result.push({
      internalName,
      nameZh: ability.nameZh,
      name: ability.name,
      heroName: ability.heroName,
      heroNameZh: ability.heroNameZh || hero.nameZh,
      heroNameEn: ability.heroNameEn || hero.nameEn,
      isUltimate: ability.isUltimate,
      stunDurations: durations,
      maxStunDuration: maxDuration,
      stunType: stunType,
      cooldown: ability.cooldown,
      castRange: ability.castRange,
      heroAttackRange: hero.attackRange || 150,
      heroPrimaryAttr: hero.primaryAttribute,
      damage,
      notes: (stun as any).notes || ability.nameZh
    })
  }
  
  return result
}


// 加载数据
onMounted(async () => {
  try {
    const [abilities, heroes, damageRes, namesRes, stunRes] = await Promise.all([
      loadAbilities(),
      loadHeroes(),
      $fetch<DamageTraitDataMap>('/data/abilities/traits/damage.json'),
      $fetch<Record<string, string>>('/data/abilities/translations/ability-names.json'),
      $fetch<StunTraitDataMap>('/data/abilities/traits/stun.json')
    ])
    
    damageList.value = buildAbilityDamageList(
      damageRes || {},
      abilities || [],
      heroes || [],
      namesRes || {}
    )
    
    stunAbilities.value = buildStunAbilityList(
      stunRes || {},
      abilities || [],
      heroes || []
    )
  } catch (e) {
    console.error('Failed to load data:', e)
  } finally {
    loading.value = false
  }
})
</script>

