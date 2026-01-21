<template>
  <AnalysisLayout
    title="技能伤害分析"
    subtitle="基于 damage.json 的技能伤害数据统计与分析"
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

    <!-- Tab 5: 综合分析 -->
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
import type { AbilityDamageInfo } from '~/composables/useAbilityDamageAnalyzer'

// Tab配置
const tabs = [
  { name: 'distribution', label: '伤害分布' },
  { name: 'damageType', label: '瞬发与持续' },
  { name: 'cooldown', label: '冷却时间' },
  { name: 'manaCost', label: '蓝耗分析' },
  { name: 'comprehensive', label: '综合分析' }
]

const { loadAbilities, loadHeroes } = useDataLoader()
const { buildAbilityDamageList } = useAbilityDamageAnalyzer()

// 状态
const loading = ref(true)
const damageList = ref<AbilityDamageInfo[]>([])

// 加载数据
onMounted(async () => {
  try {
    const [abilities, heroes, damageRes, namesRes] = await Promise.all([
      loadAbilities(),
      loadHeroes(),
      $fetch<DamageTraitDataMap>('/data/abilities/traits/damage.json'),
      $fetch<Record<string, string>>('/data/abilities/translations/ability-names.json')
    ])
    damageList.value = buildAbilityDamageList(
      damageRes || {},
      abilities || [],
      heroes || [],
      namesRes || {}
    )
  } catch (e) {
    console.error('Failed to load data:', e)
  } finally {
    loading.value = false
  }
})
</script>
