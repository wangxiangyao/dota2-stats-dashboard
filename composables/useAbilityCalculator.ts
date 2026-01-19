/**
 * 技能数值计算 Composable
 * 包含所有技能数值计算公式
 */

import type { Ability, AbilityStats, AbilitySlotType, DamageType, AbilityFunctionType } from '~/types/dota'
import { parseValue, parseAllLevels } from '~/utils/data/attributeParser'

export const useAbilityCalculator = () => {
  // ============ 基础提取函数 ============

  /**
   * 从 attributes 中查找指定 key 的属性
   */
  const findAttribute = (ability: Ability, key: string) => {
    return ability.attributes.find((attr) => attr.key === key)
  }

  /**
   * 伤害相关的属性 key（按优先级排序）
   * 优先使用直接伤害，其次是特殊伤害类型
   */
  const DAMAGE_KEYS = [
    'damage',           // 标准伤害 (119个)
    'base_damage',      // 基础伤害 (15个)
    'total_damage',     // 总伤害 (4个)
    'bonus_damage',     // 额外伤害 (29个)
    'impact_damage',    // 冲击伤害 (7个)
    'strike_damage',    // 打击伤害 (3个)
    'max_damage',       // 最大伤害 (9个)
    'damage_per_second', // 每秒伤害 (24个) - DOT技能
    'burn_damage',      // 燃烧伤害 (8个)
    'shadowraze_damage', // 影压伤害 (3个)
  ]

  /**
   * 提取伤害值（按优先级搜索多个可能的 key）
   */
  const extractDamage = (ability: Ability, level: number): number => {
    for (const key of DAMAGE_KEYS) {
      const attr = findAttribute(ability, key)
      if (attr) {
        const value = parseValue(attr.value, level)
        if (value > 0) return value
      }
    }
    return 0
  }

  /**
   * 获取所有等级的伤害值
   */
  const extractDamageLevels = (ability: Ability): number[] => {
    for (const key of DAMAGE_KEYS) {
      const attr = findAttribute(ability, key)
      if (attr) {
        const levels = parseAllLevels(attr.value)
        if (levels.some(v => v > 0)) return levels
      }
    }
    return [0]
  }

  /**
   * 提取冷却时间
   */
  const extractCooldown = (ability: Ability, level: number): number => {
    // 优先使用 cooldown 字段
    if (ability.cooldown) {
      return parseValue(ability.cooldown, level)
    }
    // 如果是 null，尝试从 attributes 找
    const attr = findAttribute(ability, 'cooldown')
    if (attr) {
      return parseValue(attr.value, level)
    }
    return 0
  }

  /**
   * 获取所有等级的冷却时间
   */
  const extractCooldownLevels = (ability: Ability): number[] => {
    if (ability.cooldown) {
      return parseAllLevels(ability.cooldown)
    }
    const attr = findAttribute(ability, 'cooldown')
    if (attr) {
      return parseAllLevels(attr.value)
    }
    return [0]
  }

  /**
   * 提取魔法消耗
   */
  const extractManaCost = (ability: Ability, level: number): number => {
    if (ability.manaCost) {
      return parseValue(ability.manaCost, level)
    }
    const attr = findAttribute(ability, 'mana_cost')
    if (attr) {
      return parseValue(attr.value, level)
    }
    return 0
  }

  /**
   * 获取所有等级的魔法消耗
   */
  const extractManaCostLevels = (ability: Ability): number[] => {
    if (ability.manaCost) {
      return parseAllLevels(ability.manaCost)
    }
    const attr = findAttribute(ability, 'mana_cost')
    if (attr) {
      return parseAllLevels(attr.value)
    }
    return [0]
  }

  /**
   * 提取控制时长（眩晕/沉默/减速）
   */
  const extractCrowdControl = (ability: Ability, level: number): number => {
    // 按优先级查找控制类型
    const controlKeys = [
      'stun_duration',
      'hero_stun_duration',
      'silence_duration',
      'slow_duration',
      'movement_speed'
    ]

    for (const key of controlKeys) {
      const attr = findAttribute(ability, key)
      if (attr) {
        const value = parseValue(attr.value, level)
        if (value > 0) return value
      }
    }
    return 0
  }

  /**
   * 提取施法距离
   */
  const extractCastRange = (ability: Ability): number => {
    const attr = findAttribute(ability, 'abilitycastrange')
    if (attr) {
      return parseValue(attr.value, 1)
    }
    const attr2 = findAttribute(ability, 'cast_range')
    if (attr2) {
      return parseValue(attr2.value, 1)
    }
    return 0
  }

  /**
   * 提取AOE半径
   */
  const extractAOERadius = (ability: Ability): number => {
    const attr = findAttribute(ability, 'radius')
    if (attr) {
      return parseValue(attr.value, 1)
    }
    const attr2 = findAttribute(ability, 'area_of_effect')
    if (attr2) {
      return parseValue(attr2.value, 1)
    }
    return 0
  }

  // ============ 效率计算函数 ============

  /**
   * 计算 DPS（每秒伤害）
   */
  const calculateDPS = (ability: Ability, level: number): number => {
    const damage = extractDamage(ability, level)
    const cd = extractCooldown(ability, level)
    if (cd === 0) return 0
    return damage / cd
  }

  /**
   * 计算伤害/蓝（每点蓝的伤害）
   */
  const calculateDamagePerMana = (ability: Ability, level: number): number => {
    const damage = extractDamage(ability, level)
    const mana = extractManaCost(ability, level)
    if (mana === 0) return 0
    return damage / mana
  }

  /**
   * 计算 DPM（综合效率 = 伤害 / (CD × 蓝耗 × 0.01)）
   */
  const calculateDPM = (ability: Ability, level: number): number => {
    const damage = extractDamage(ability, level)
    const cd = extractCooldown(ability, level)
    const mana = extractManaCost(ability, level)
    if (cd === 0 || mana === 0) return 0
    return damage / (cd * mana * 0.01)
  }

  /**
   * 计算控制率（控制时间 / CD）
   */
  const calculateControlRate = (ability: Ability, level: number): number => {
    const cc = extractCrowdControl(ability, level)
    const cd = extractCooldown(ability, level)
    if (cd === 0) return 0
    return cc / cd
  }

  /**
   * 计算技能所有统计属性
   */
  const calculateAbilityStats = (ability: Ability, level: number): AbilityStats => {
    const damage = extractDamage(ability, level)
    const cooldown = extractCooldown(ability, level)
    const manaCost = extractManaCost(ability, level)
    const crowdControl = extractCrowdControl(ability, level)
    const castRange = extractCastRange(ability)
    const aoeRadius = extractAOERadius(ability)

    return {
      damage,
      cooldown,
      manaCost,
      crowdControl,
      castRange,
      aoeRadius,
      dps: calculateDPS(ability, level),
      damagePerMana: calculateDamagePerMana(ability, level),
      dpm: calculateDPM(ability, level),
      controlRate: calculateControlRate(ability, level)
    }
  }

  // ============ 技能分类函数 ============

  /**
   * 常见大招关键词列表
   */
  const ULTIMATE_KEYWORDS = [
    // 通用后缀
    '_ult', 'ultimate',
    // 常见大招名称
    'mana_void', 'echo_slam', 'epicenter', 'laguna_blade', 'freezing_field',
    'omni_slash', 'black_hole', 'ravage', 'chronosphere', 'dream_coil',
    'reaper_scythe', 'finger_of_death', 'doom_bringer', 'doom', 'fiends_grip',
    'reverse_polarity', 'nether_swap', 'song_of_the_siren', 'mass_serpent_ward',
    'thundergods_wrath', 'supernova', 'sanity_eclipse', 'eclipse', 'impetus',
    'primal_roar', 'life_drain', 'wrath_of_nature', 'gods_strength', 'grow',
    'coup_de_grace', 'guardian_angel', 'chaotic_offering', 'exorcism',
    'presence_of_the_dark_lord', 'darkness', 'flesh_golem', 'haunt',
    'permanent_invisibility', 'ball_lightning', 'thunder_strike', 'sonic_wave',
    'earth_splitter', 'summon_wolves', 'stampede', 'walrus_punch', 'walrus_kick',
    'mystic_flare', 'assassinate', 'requiem_of_souls', 'shapeshift', 'infest',
    'open_wounds', 'dismember', 'stone_gaze', 'petrify', 'split_shot',
    'mana_shield', 'mystic_snake', 'burrow_strike', 'reincarnation',
    'avatar', 'berserkers_call', 'culling_blade', 'morph_replicate',
    'morphling_morph', 'adaptive_strike', 'time_walk', 'time_dilation',
    'time_lock', 'backtrack', 'borrowed_time', 'aphotic_shield',
    'ice_blast', 'cold_feet', 'freezing_field_stop', 'macropyre', 'dual_breath',
    'liquid_fire', 'elder_dragon_form', 'dragon_tail', 'poof',
    'divided_we_stand', 'geostrike', 'earth_bind', 'firefly', 'flaming_lasso',
    'sticky_napalm', 'blade_mail', 'berserker_rage'
  ]

  /**
   * 判断技能槽位类型
   * 综合使用关键词匹配和等级数判断
   */
  const getAbilitySlotType = (ability: Ability): AbilitySlotType => {
    const name = ability.internalName.toLowerCase()

    // 特殊技能判断
    if (name.includes('_scepter') || name.includes('_talent') || name.includes('_stop') || name.includes('_sub')) {
      return 'special'
    }

    // 关键词匹配大招
    for (const keyword of ULTIMATE_KEYWORDS) {
      if (name.includes(keyword)) {
        return 'ultimate'
      }
    }

    // 通过 cooldown 等级数判断（大招通常只有 3 级或 1 级固定 CD）
    if (ability.cooldown) {
      const cdLevels = Array.isArray(ability.cooldown) ? ability.cooldown.length : 1
      if (cdLevels === 3) {
        return 'ultimate'
      }
    }

    return 'normal'
  }

  /**
   * 获取技能功能类型
   */
  const getAbilityFunctionType = (ability: Ability): AbilityFunctionType => {
    const hasDamage = extractDamage(ability, 1) > 0
    const hasControl = extractCrowdControl(ability, 1) > 0
    const isPassive = ability.behavior === 'Passive'

    if (isPassive) {
      // 被动技能根据效果分类
      if (hasDamage) return 'damage'
      const name = ability.internalName.toLowerCase()
      if (name.includes('aura') || name.includes('buff')) return 'buff'
      return 'other'
    }

    if (hasDamage && hasControl) return 'hybrid'
    if (hasDamage) return 'damage'
    if (hasControl) return 'control'

    // 根据名称判断其他类型
    const name = ability.internalName.toLowerCase()
    if (name.includes('blink') || name.includes('dash') || name.includes('leap')) return 'mobility'
    if (name.includes('shield') || name.includes('heal') || name.includes('regen')) return 'survival'
    if (name.includes('aura') || name.includes('buff')) return 'buff'

    return 'other'
  }

  /**
   * 获取目标类型
   */
  const getTargetType = (ability: Ability): TargetType => {
    if (ability.behavior === 'Passive') return 'passive'
    if (ability.behavior?.includes('Unit Target')) return 'unit_target'
    if (ability.behavior?.includes('Point')) return 'point'
    return 'no_target'
  }

  // ============ 统计分析函数 ============

  /**
   * 过滤伤害类技能
   * 条件：types 包含 'damage' 且能提取到伤害值
   */
  const filterDamageAbilities = (abilities: Ability[]): Ability[] => {
    return abilities.filter(a => {
      // 必须有伤害类型标记
      const hasDamageType = (a as any).types?.includes('damage') || a.damageType !== null
      if (!hasDamageType) return false

      // 必须能提取到伤害值
      const damage = extractDamage(a, 1)
      return damage > 0
    })
  }

  /**
   * 按技能槽位分组
   */
  const groupBySlotType = (abilities: Ability[]) => {
    const groups: Record<AbilitySlotType, Ability[]> = {
      normal: [],
      ultimate: [],
      special: []
    }

    for (const ability of abilities) {
      const type = getAbilitySlotType(ability)
      groups[type].push(ability)
    }

    return groups
  }

  /**
   * 按伤害类型分组
   */
  const groupByDamageType = (abilities: Ability[]) => {
    const groups: Record<string, Ability[]> = {
      Physical: [],
      Magical: [],
      Pure: [],
      None: []
    }

    for (const ability of abilities) {
      const type = ability.damageType || 'None'
      if (type in groups) {
        groups[type].push(ability)
      }
    }

    return groups
  }

  /**
   * 计算一组技能的平均统计
   */
  const calculateGroupStats = (abilities: Ability[], level: number = 1) => {
    if (abilities.length === 0) {
      return {
        count: 0,
        avgDamage: 0,
        avgCooldown: 0,
        avgManaCost: 0,
        avgDPS: 0,
        avgDamagePerMana: 0
      }
    }

    const stats = abilities.map((a) => calculateAbilityStats(a, level))

    return {
      count: abilities.length,
      avgDamage: stats.reduce((sum, s) => sum + s.damage, 0) / stats.length,
      avgCooldown: stats.reduce((sum, s) => sum + s.cooldown, 0) / stats.length,
      avgManaCost: stats.reduce((sum, s) => sum + s.manaCost, 0) / stats.length,
      avgDPS: stats.reduce((sum, s) => sum + s.dps, 0) / stats.length,
      avgDamagePerMana: stats.reduce((sum, s) => sum + s.damagePerMana, 0) / stats.length
    }
  }

  /**
   * 计算分位数
   */
  const calculatePercentile = (values: number[], percentile: number): number => {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * 计算中位数
   */
  const calculateMedian = (values: number[]): number => {
    return calculatePercentile(values, 50)
  }

  /**
   * 计算标准差
   */
  const calculateStdDev = (values: number[]): number => {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  return {
    // 提取函数
    extractDamage,
    extractDamageLevels,
    extractCooldown,
    extractCooldownLevels,
    extractManaCost,
    extractManaCostLevels,
    extractCrowdControl,
    extractCastRange,
    extractAOERadius,

    // 效率计算
    calculateDPS,
    calculateDamagePerMana,
    calculateDPM,
    calculateControlRate,
    calculateAbilityStats,

    // 分类函数
    getAbilitySlotType,
    getAbilityFunctionType,
    getTargetType,

    // 统计分析
    filterDamageAbilities,
    groupBySlotType,
    groupByDamageType,
    calculateGroupStats,
    calculatePercentile,
    calculateMedian,
    calculateStdDev
  }
}
