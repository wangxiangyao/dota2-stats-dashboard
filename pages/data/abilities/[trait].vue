<script setup lang="ts">
import type { DamageTraitData, DamageTraitDataMap } from '~/types/traits'

const { getDamageSummary, calculateAbilityDamage, formatDamageArray } = useDamageCalculator()

/**
 * 技能特征管理页面
 * 功能：过滤、选择、编辑技能特征
 */

const route = useRoute()
const traitType = computed(() => route.params.trait as string)

// 特征配置
const traitConfig: Record<string, { name: string; icon: string }> = {
  damage: { name: '伤害特征', icon: '💥' }
}

// 数据状态
const abilities = ref<any[]>([])
const heroes = ref<any[]>([])
const traitData = ref<DamageTraitDataMap>({})  // 本地编辑数据
const savedTraitData = ref<Set<string>>(new Set())  // 已持久化到文件的技能名
const loading = ref(true)
const saving = ref(false)

// 搜索和筛选
const searchQuery = ref('')

// 加载数据
onMounted(async () => {
  try {
    const [abilitiesData, heroesData, traitDataRes] = await Promise.all([
      $fetch<any[]>('/data/abilities/abilities.json'),
      $fetch<any[]>('/data/heroes/heroes.json'),
      $fetch<DamageTraitDataMap>(`/api/traits/${traitType.value}`)
    ])
    abilities.value = abilitiesData || []
    heroes.value = heroesData || []
    traitData.value = traitDataRes || {}
    // 记录已保存的技能名
    savedTraitData.value = new Set(Object.keys(traitDataRes || {}))
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
})

// ============ 英雄属性映射 ============

// 创建英雄名 -> 属性的映射（heroName 是 "abaddon"，internalName 是 "npc_dota_hero_abaddon"）
const heroAttributeMap = computed(() => {
  const map: Record<string, string> = {}
  for (const hero of heroes.value) {
    // 从 internalName 提取短名：npc_dota_hero_xxx -> xxx
    if (hero.internalName) {
      const shortName = hero.internalName.replace('npc_dota_hero_', '')
      map[shortName] = hero.primaryAttribute || 'universal'
    }
  }
  return map
})

// 获取英雄属性
const getHeroAttribute = (heroName: string): string => {
  return heroAttributeMap.value[heroName] || 'universal'
}

// ============ 过滤逻辑 ============

const excludeDamageKeys = [
  'incoming_damage', 'illusion_incoming_damage', 'illusion_damage_incoming',
  'images_take_damage_percent', 'images_do_damage_percent', 'illusion_flat_damage',
  'illusion_outgoing_damage', 'damage_block', 'damage_block_base', 'damage_block_loss',
  'damage_block_threshold', 'damage_reflect_pct', 'damage_reflection_pct',
  'reward_damage', 'wolf_damage', 'boar_base_damage', 'familiar_attack_damage',
  'attack_damage', 'eidelon_base_damage', 'eidolon_damage_spread', 'treant_damage',
  'enchant_damage', 'gods_strength_damage', 'totem_damage_percentage',
  'damage_grace_period', 'damage_threshold', 'cooldown_on_take_damage', 'radius_explosion'
]

const excludeNamePatterns = [
  'phantasm', 'mirror_image', 'conjure_image', 'doppelwalk', 'summon_wolves',
  'call_of_the_wild', 'demonic_conversion', 'summon_familiars', 'haunt', 'reality',
  'disruption', 'demonic_purge', 'enchant', 'stone_gaze', 'living_armor',
  'gods_strength', 'flesh_heap', 'spiked_carapace', 'dark_portrait', 'parting_shot',
  'shrink_ray', 'monkey_king_tree_dance', 'duel', 'terrorize', 'bedlam', 'ink_over',
  'call_of_the_wild_boar', 'call_of_the_wild_hawk', 'summon_spirit_bear', 'entangling_claws'
]

const excludeAbilities = [
  'ember_spirit_activate_fire_remnant', 'invoker_ghost_walk', 'invoker_alacrity',
  'invoker_forge_spirit', 'invoker_invoke', 'invoker_quas', 'invoker_wex', 'invoker_exort',
  'invoker_cold_snap_ad', 'invoker_ghost_walk_ad', 'invoker_tornado_ad', 'invoker_emp_ad',
  'invoker_alacrity_ad', 'invoker_sun_strike_ad', 'invoker_chaos_meteor_ad',
  'invoker_ice_wall_ad', 'invoker_deafening_blast_ad', 'invoker_forge_spirit_ad',
  'forged_spirit_melting_strike', 'skeleton_king_bone_guard', 'clinkz_wind_walk',
  'clinkz_tar_bomb', 'mirana_solar_flare', 'visage_stone_form_self_cast',
  'furion_arboreal_might', 'furion_hedgerow', 'dark_troll_warlord_raise_dead',
  'techies_remote_mines', 'brewmaster_storm_cyclone', 'brewmaster_fire_pull',
  'brewmaster_storm_dispel_magic', 'brewmaster_earth_hurl_boulder'
]

const forceIncludeAbilities = [
  'tusk_walrus_punch', 'omniknight_purification', 'elder_titan_earth_splitter',
  'luna_eclipse', 'pugna_life_drain', 'grimstroke_spirit_walk', 'lich_frost_shield',
  'dazzle_shadow_wave', 'marci_companion_run', 'nyx_assassin_vendetta',
  'abaddon_aphotic_shield', 'mars_gods_rebuke', 'dark_willow_bedlam',
  'furion_sprout', 'furion_wrath_of_nature', 'brewmaster_thunder_clap',
  'brewmaster_cinder_brew', 'invoker_cold_snap', 'invoker_tornado', 'invoker_emp',
  'invoker_chaos_meteor', 'invoker_sun_strike', 'invoker_ice_wall', 'invoker_deafening_blast'
]

const hasValidDamage = (ability: any): boolean => {
  if (!ability.damageValues || ability.damageValues.length === 0) return false
  const validKeys = (ability.damageKeys || []).filter((k: string) =>
    !excludeDamageKeys.some(ex => k.toLowerCase().includes(ex.toLowerCase()))
  )
  if (validKeys.length === 0) return false
  return ability.damageValues.some((arr: number[]) => arr.some((v: number) => v > 0))
}

const canTargetEnemy = (ability: any): boolean => {
  const team = ability.targetTeam || ''
  const behavior = ability.behavior || ''
  if (team.includes('ENEMY') || team === 'BOTH' || team === 'CUSTOM') return true
  if (behavior.includes('NO_TARGET') || behavior.includes('POINT') || behavior.includes('AOE')) return true
  return false
}

const isExcludedByName = (ability: any): boolean => {
  const name = ability.internalName.toLowerCase()
  if (excludeAbilities.includes(ability.internalName)) return true
  return excludeNamePatterns.some(pattern => {
    if (pattern === 'haunt') return name.includes('_haunt') || name.endsWith('haunt')
    return name.includes(pattern)
  })
}

// 候选技能
const candidateAbilities = computed(() => {
  return abilities.value.filter(a => {
    if (forceIncludeAbilities.includes(a.internalName)) return true
    if (a.isPassive || a.isInnate || a.isGrantedByScepter || a.isGrantedByShard) return false
    if (isExcludedByName(a)) return false
    if (!hasValidDamage(a)) return false
    if (!canTargetEnemy(a)) return false
    return true
  })
})

// 选中状态
const selectedAbilities = ref<Set<string>>(new Set())

watch(traitData, (data) => {
  selectedAbilities.value = new Set(Object.keys(data))
}, { immediate: true })

const toggleSelect = (name: string) => {
  if (selectedAbilities.value.has(name)) {
    selectedAbilities.value.delete(name)
  } else {
    selectedAbilities.value.add(name)
  }
}

const selectAll = () => {
  filteredHeroes.value.forEach(hero => {
    hero.abilities.forEach((a: any) => selectedAbilities.value.add(a.internalName))
  })
}

const deselectAll = () => {
  selectedAbilities.value.clear()
}

// 判断技能是否已保存（持久化到文件）
const isSaved = (name: string) => savedTraitData.value.has(name)

// 判断特征是否需要填写（选中但必填项未填）
const needsEdit = (name: string) => {
  if (!selectedAbilities.value.has(name)) return false
  const data = traitData.value[name]
  if (!data) return true // 选中了但没有数据
  // formulaExpected 是必填
  if (!data.formulaExpected || data.formulaExpected.trim() === '') return true
  return false
}

// 获取 tooltip 内容（HTML 格式）
const getTooltipContent = (ability: any): string => {
  const data = traitData.value[ability.internalName]
  if (!data) {
    return '<div style="text-align:left;line-height:1.5;">未配置公式</div>'
  }
  
  const summary = getDamageSummary(ability, data)
  return `<div style="text-align:left;line-height:1.5;font-size:12px;">${summary.replace(/\n/g, '<br>')}</div>`
}

// 获取伤害显示信息
const getDamageDisplay = (ability: any): { expected: string; min: string | null; max: string | null } | null => {
  const data = traitData.value[ability.internalName]
  if (!data || !data.formulaExpected) return null
  
  const result = calculateAbilityDamage(ability, data)
  return {
    expected: formatDamageArray(result.expected),
    min: data.formulaMin ? formatDamageArray(result.min) : null,
    max: data.formulaMax ? formatDamageArray(result.max) : null
  }
}

// ============ 按属性分类 ============

// 按英雄分组
const heroesGrouped = computed(() => {
  const groups: Record<string, { name: string; nameZh: string; attribute: string; abilities: any[] }> = {}
  
  for (const a of candidateAbilities.value) {
    if (!groups[a.heroName]) {
      groups[a.heroName] = {
        name: a.heroName,
        nameZh: a.heroNameZh || a.heroName,
        attribute: getHeroAttribute(a.heroName),
        abilities: []
      }
    }
    groups[a.heroName].abilities.push(a)
  }
  
  return Object.values(groups).sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-CN'))
})

// 搜索过滤
const filteredHeroes = computed(() => {
  if (!searchQuery.value.trim()) return heroesGrouped.value
  const query = searchQuery.value.toLowerCase()
  return heroesGrouped.value.filter(h => 
    h.nameZh.toLowerCase().includes(query) || 
    h.name.toLowerCase().includes(query)
  )
})

// 按属性分类
const attrGroups = computed(() => {
  const strength = filteredHeroes.value.filter(h => h.attribute === 'strength')
  const agility = filteredHeroes.value.filter(h => h.attribute === 'agility')
  const intelligence = filteredHeroes.value.filter(h => h.attribute === 'intelligence')
  const universal = filteredHeroes.value.filter(h => h.attribute === 'universal')
  
  return [
    { key: 'strength', label: '力量', color: '#e63946', heroes: strength },
    { key: 'agility', label: '敏捷', color: '#2ecc71', heroes: agility },
    { key: 'intelligence', label: '智力', color: '#3498db', heroes: intelligence },
    { key: 'universal', label: '全能', color: '#9b59b6', heroes: universal }
  ]
})

// ============ 编辑弹窗 ============

const editDialogVisible = ref(false)
const editingAbility = ref<any>(null)
const editingData = ref<DamageTraitData>({
  formulaExpected: 'damage',
  formulaMin: null,
  formulaMax: null,
  customParams: null,
  notes: null
})

// 自定义变量编辑（数组形式便于 UI 编辑）
const editingCustomParams = ref<{ key: string; value: string }[]>([])

const openEditDialog = (ability: any) => {
  editingAbility.value = ability
  const existing = traitData.value[ability.internalName]
  if (existing) {
    editingData.value = { ...existing }
    // 将 customParams 转为数组
    if (existing.customParams) {
      editingCustomParams.value = Object.entries(existing.customParams).map(([k, v]) => ({ key: k, value: v }))
    } else {
      editingCustomParams.value = []
    }
  } else {
    editingData.value = {
      formulaExpected: 'damage',
      formulaMin: null,
      formulaMax: null,
      customParams: null,
      notes: null
    }
    editingCustomParams.value = []
  }
  editDialogVisible.value = true
}

const saveEditDialog = () => {
  if (editingAbility.value) {
    // 将自定义变量数组转回对象
    const params: Record<string, string> = {}
    for (const p of editingCustomParams.value) {
      if (p.key.trim()) {
        params[p.key.trim()] = p.value
      }
    }
    editingData.value.customParams = Object.keys(params).length > 0 ? params : null
    
    traitData.value[editingAbility.value.internalName] = { ...editingData.value }
    selectedAbilities.value.add(editingAbility.value.internalName)
  }
  editDialogVisible.value = false
}

// 添加自定义变量
const addCustomParam = () => {
  editingCustomParams.value.push({ key: '', value: '' })
}

// 删除自定义变量
const removeCustomParam = (index: number) => {
  editingCustomParams.value.splice(index, 1)
}

// 获取技能属性值（用于显示）
const getAbilityValues = (ability: any): Record<string, any> => {
  if (!ability?.abilityValues) return {}
  return ability.abilityValues
}

// 格式化属性值
const formatAttrValue = (value: any): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object' && value.value !== undefined) {
    return String(value.value)
  }
  return String(value)
}

// 跟踪当前聚焦的公式输入框
const activeFormulaField = ref<'expected' | 'min' | 'max'>('expected')

// 点击变量插入到当前聚焦的公式输入框
const insertVariable = (varName: string) => {
  const field = activeFormulaField.value
  if (field === 'expected') {
    editingData.value.formulaExpected = (editingData.value.formulaExpected || '') + varName
  } else if (field === 'min') {
    editingData.value.formulaMin = (editingData.value.formulaMin || '') + varName
  } else if (field === 'max') {
    editingData.value.formulaMax = (editingData.value.formulaMax || '') + varName
  }
}

// 实时计算结果（使用编辑中的自定义变量）
const liveCalcResult = computed(() => {
  if (!editingAbility.value) return { expected: '-', min: '-', max: '-' }
  
  // 构建当前编辑中的 customParams
  const customParams: Record<string, string> = {}
  for (const p of editingCustomParams.value) {
    if (p.key.trim()) {
      customParams[p.key.trim()] = p.value
    }
  }
  
  // 临时构建完整的 traitData
  const tempData: DamageTraitData = {
    ...editingData.value,
    customParams: Object.keys(customParams).length > 0 ? customParams : null
  }
  
  const result = calculateAbilityDamage(editingAbility.value, tempData)
  
  return {
    expected: result.expected.length > 0 ? formatDamageArray(result.expected) : '-',
    min: result.min.length > 0 ? formatDamageArray(result.min) : '-',
    max: result.max.length > 0 ? formatDamageArray(result.max) : '-'
  }
})

// ============ 保存 ============

const saveTraitData = async () => {
  saving.value = true
  try {
    const dataToSave: DamageTraitDataMap = {}
    for (const name of selectedAbilities.value) {
      dataToSave[name] = traitData.value[name] || {
        formulaExpected: 'damage',
        formulaMin: null,
        formulaMax: null,
        customParams: null,
        notes: null
      }
    }
    
    await $fetch(`/api/traits/${traitType.value}`, {
      method: 'POST',
      body: dataToSave
    })
    
    traitData.value = dataToSave
    // 更新已保存集合
    savedTraitData.value = new Set(Object.keys(dataToSave))
    ElMessage.success(`保存成功！共 ${Object.keys(dataToSave).length} 条记录`)
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 统计
const stats = computed(() => ({
  candidate: candidateAbilities.value.length,
  selected: selectedAbilities.value.size,
  saved: savedTraitData.value.size
}))
</script>

<template>
  <div class="trait-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-left">
        <NuxtLink to="/data" class="back-link">← 返回数据管理</NuxtLink>
        <h1>
          <span class="trait-icon">{{ traitConfig[traitType]?.icon || '📊' }}</span>
          {{ traitConfig[traitType]?.name || traitType }}
        </h1>
      </div>
      <div class="header-right">
        <div class="stats-info">
          <span>候选技能: <strong>{{ stats.candidate }}</strong></span>
          <span>已选中: <strong>{{ stats.selected }}</strong></span>
          <span>已保存: <strong>{{ stats.saved }}</strong></span>
        </div>
        <el-button type="primary" :loading="saving" @click="saveTraitData">
          保存 ({{ selectedAbilities.size }})
        </el-button>
      </div>
    </header>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索英雄..."
          clearable
          prefix-icon="Search"
          class="search-input"
        />
        <div class="toolbar-actions">
          <el-button size="small" @click="selectAll">全选</el-button>
          <el-button size="small" @click="deselectAll">取消全选</el-button>
        </div>
      </div>

      <!-- 属性分类展示 -->
      <div class="attr-sections">
        <template v-for="group in attrGroups" :key="group.key">
          <div v-if="group.heroes.length > 0" class="attr-section">
            <div class="attr-header" :style="{ borderColor: group.color }">
              <span class="attr-label" :style="{ color: group.color }">{{ group.label }}</span>
              <span class="attr-count">{{ group.heroes.length }} 英雄</span>
            </div>
            
            <div class="hero-grid">
              <div v-for="hero in group.heroes" :key="hero.name" class="hero-card">
                <div class="hero-name">{{ hero.nameZh }}</div>
                <div class="ability-list">
                  <div
                    v-for="ability in hero.abilities"
                    :key="ability.internalName"
                    class="ability-item"
                    :class="{ saved: isSaved(ability.internalName), selected: selectedAbilities.has(ability.internalName) && !isSaved(ability.internalName) }"
                  >
                    <div class="ability-row">
                      <el-checkbox
                        :model-value="selectedAbilities.has(ability.internalName)"
                        @change="toggleSelect(ability.internalName)"
                      />
                      <el-tooltip
                        :content="getTooltipContent(ability)"
                        placement="top"
                        :show-after="300"
                        raw-content
                      >
                        <span class="ability-name" :class="{ ultimate: ability.isUltimate }">
                          {{ ability.nameZh || ability.internalName }}
                        </span>
                      </el-tooltip>
                      <span class="damage-type" :class="ability.damageType?.toLowerCase()">
                        {{ ability.damageType || '-' }}
                      </span>
                      <button
                        class="trait-btn"
                        :class="{ 
                          configured: isSaved(ability.internalName),
                          warning: needsEdit(ability.internalName) 
                        }"
                        :title="isSaved(ability.internalName) ? '已配置' : '配置特征'"
                        @click="openEditDialog(ability)"
                      >
                        {{ isSaved(ability.internalName) ? '✓' : needsEdit(ability.internalName) ? '!' : '⚙' }}
                      </button>
                    </div>
                    <!-- 伤害显示 -->
                    <div v-if="getDamageDisplay(ability)" class="damage-row">
                      <div class="damage-line">
                        <span class="damage-label">期望:</span>
                        <span class="damage-values">{{ getDamageDisplay(ability)?.expected }}</span>
                      </div>
                      <div v-if="getDamageDisplay(ability)?.min" class="damage-line">
                        <span class="damage-label">最小:</span>
                        <span class="damage-values">{{ getDamageDisplay(ability)?.min }}</span>
                      </div>
                      <div v-if="getDamageDisplay(ability)?.max" class="damage-line">
                        <span class="damage-label">最大:</span>
                        <span class="damage-values">{{ getDamageDisplay(ability)?.max }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="`编辑 - ${editingAbility?.nameZh || editingAbility?.internalName}`"
      width="800px"
      class="edit-dialog"
    >
      <div class="edit-layout">
        <!-- 左侧：技能属性 -->
        <div class="ability-attrs">
          <div class="attrs-header">技能属性 (可在公式中使用变量名)</div>
          <div class="attrs-list">
            <div 
              v-for="(value, key) in getAbilityValues(editingAbility)" 
              :key="key" 
              class="attr-item"
              @click="insertVariable(key as string)"
            >
              <span class="attr-key">{{ key }}</span>
              <span class="attr-value">{{ formatAttrValue(value) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 右侧：公式编辑 -->
        <div class="formula-edit">
          <el-form label-position="top">
            <el-form-item label="期望公式 (必填)" required>
              <el-input 
                v-model="editingData.formulaExpected" 
                placeholder="damage 或 damage × duration"
                class="formula-input"
                @focus="activeFormulaField = 'expected'"
              />
            </el-form-item>
            <el-form-item label="最小公式">
              <el-input 
                v-model="editingData.formulaMin" 
                placeholder="可选"
                class="formula-input"
                @focus="activeFormulaField = 'min'"
              />
            </el-form-item>
            <el-form-item label="最大公式">
              <el-input 
                v-model="editingData.formulaMax" 
                placeholder="可选"
                class="formula-input"
                @focus="activeFormulaField = 'max'"
              />
            </el-form-item>
            
            <!-- 自定义变量 -->
            <el-form-item label="自定义变量">
              <div class="custom-params">
                <div v-for="(param, index) in editingCustomParams" :key="index" class="param-row">
                  <el-input v-model="param.key" placeholder="变量名" class="param-key" />
                  <span class="param-eq">=</span>
                  <el-input v-model="param.value" placeholder="值 (如: 1/2/3/4)" class="param-value" />
                  <el-button type="danger" size="small" circle @click="removeCustomParam(index)">
                    ✕
                  </el-button>
                </div>
                <el-button size="small" @click="addCustomParam">+ 添加变量</el-button>
              </div>
            </el-form-item>
            
            <el-form-item label="备注">
              <el-input v-model="editingData.notes" type="textarea" :rows="2" placeholder="可选" />
            </el-form-item>
          </el-form>
          
          <!-- 实时计算结果 -->
          <div class="calc-result">
            <div class="calc-header">计算结果预览</div>
            <div class="calc-rows">
              <div class="calc-row">
                <span class="calc-label">期望:</span>
                <span class="calc-value">{{ liveCalcResult.expected }}</span>
              </div>
              <div v-if="editingData.formulaMin" class="calc-row">
                <span class="calc-label">最小:</span>
                <span class="calc-value">{{ liveCalcResult.min }}</span>
              </div>
              <div v-if="editingData.formulaMax" class="calc-row">
                <span class="calc-label">最大:</span>
                <span class="calc-value">{{ liveCalcResult.max }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditDialog">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.trait-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
}

/* 头部 */
.page-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.back-link {
  font-size: 0.8rem;
  color: #6b7280;
  text-decoration: none;
}

.back-link:hover {
  color: #3b82f6;
}

.page-header h1 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-info {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  color: #6b7280;
}

.stats-info strong {
  color: #1f2937;
}

/* 工具栏 */
.toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.search-input {
  width: 240px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

/* 加载 */
.loading {
  flex: 1;
  padding: 20px;
}

/* 属性分区 */
.attr-sections {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.attr-section {
  background: #fff;
}

.attr-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f9fafb;
  border-left: 4px solid;
  margin-bottom: 12px;
}

.attr-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.attr-count {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* 英雄网格 */
.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.hero-card {
  background: #f9fafb;
  border-radius: 6px;
  padding: 10px;
}

.hero-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #374151;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
}

/* 技能列表 */
.ability-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ability-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid transparent;
  transition: all 0.15s;
}

/* 已保存 - 淡蓝色 */
.ability-item.saved {
  background: #eff6ff;
  border-color: #bfdbfe;
}

/* 已选中未保存 - 淡黄色 */
.ability-item.selected {
  background: #fefce8;
  border-color: #fef08a;
}

/* 技能行 */
.ability-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 伤害显示行 */
.damage-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 24px;
  font-size: 0.65rem;
  margin-top: 2px;
}

.damage-line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.damage-label {
  color: #9ca3af;
  min-width: 24px;
}

.damage-values {
  color: #2563eb;
  font-weight: 500;
  font-family: monospace;
}

.ability-name {
  flex: 1;
  font-size: 0.8rem;
  color: #1f2937;
}

.ability-name.ultimate {
  color: #d97706;
  font-weight: 500;
}

.damage-type {
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 3px;
  background: #e5e7eb;
}

.damage-type.magical {
  background: #dbeafe;
  color: #1d4ed8;
}

.damage-type.physical {
  background: #fee2e2;
  color: #dc2626;
}

.damage-type.pure {
  background: #fef3c7;
  color: #d97706;
}

/* 特征按钮 - 小圆形图标 */
.trait-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #6b7280;
}

.trait-btn:hover {
  background: #d1d5db;
  transform: scale(1.1);
}

.trait-btn.configured {
  background: #dcfce7;
  color: #16a34a;
}

.trait-btn.warning {
  background: #fef2f2;
  color: #dc2626;
}

/* 编辑弹窗 */
.edit-layout {
  display: flex;
  gap: 20px;
  min-height: 400px;
}

.ability-attrs {
  width: 280px;
  flex-shrink: 0;
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.attrs-header {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.attrs-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attr-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.15s;
}

.attr-item:hover {
  background: #eff6ff;
}

.attr-key {
  color: #2563eb;
  font-family: monospace;
}

.attr-value {
  color: #6b7280;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.formula-edit {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.formula-input :deep(input) {
  font-family: monospace;
}

.calc-result {
  margin-top: 12px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.calc-header {
  font-size: 0.8rem;
  font-weight: 600;
  color: #166534;
  margin-bottom: 8px;
}

.calc-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calc-row {
  display: flex;
  gap: 8px;
  font-size: 0.85rem;
}

.calc-label {
  color: #6b7280;
  width: 40px;
}

.calc-value {
  color: #166534;
  font-weight: 600;
  font-family: monospace;
}

/* 自定义变量 */
.custom-params {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-key {
  width: 120px;
}

.param-key :deep(input) {
  font-family: monospace;
}

.param-eq {
  color: #6b7280;
  font-weight: 600;
}

.param-value {
  flex: 1;
}

.param-value :deep(input) {
  font-family: monospace;
}
</style>
