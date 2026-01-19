/**
 * Dota2 数据类型定义
 */

// 主属性类型
export type PrimaryAttribute = 'strength' | 'agility' | 'intelligence' | 'universal'

// 攻击类型
export type AttackType = 'melee' | 'ranged'

// 英雄数据
export interface Hero {
  id: number
  name: string
  nameEn?: string  // 英文名
  internalName?: string  // 内部名称，如 npc_dota_hero_antimage
  localizedName: string
  primaryAttribute: PrimaryAttribute
  attackType: AttackType

  // 基础属性
  baseStrength: number
  baseAgility: number
  baseIntelligence: number

  // 属性成长
  strengthGain: number
  agilityGain: number
  intelligenceGain: number

  // 战斗属性
  baseHealth: number
  baseMana: number
  baseArmor: number
  baseMagicResistance: number
  baseAttackMin: number
  baseAttackMax: number
  attackRange: number
  attackRate: number  // BAT
  moveSpeed: number
  turnRate: number

  // 其他
  roles?: string[]
  img?: string
}

// 技能属性
export interface AbilityAttribute {
  key: string
  header: string
  value: string | string[]
  generated?: boolean
}

// 技能数据
export interface Ability {
  internalName: string
  name: string
  name_zh?: string  // 技能中文名
  description?: string
  behavior: string | null
  damageType: string | null  // 'Physical' | 'Magical' | 'Pure' | null
  cooldown: string | string[] | null
  manaCost: string | string[] | null
  attributes: AbilityAttribute[]
  heroName: string
  is_ultimate?: boolean  // 是否是大招
}

// 技能分类类型
export type AbilitySlotType = 'normal' | 'ultimate' | 'special'
export type DamageType = 'Physical' | 'Magical' | 'Pure'
export type AbilityFunctionType = 'damage' | 'control' | 'buff' | 'survival' | 'mobility' | 'hybrid' | 'other'
export type TargetType = 'unit_target' | 'no_target' | 'point' | 'passive'

// 技能统计数据
export interface AbilityStats {
  damage: number
  cooldown: number
  manaCost: number
  crowdControl: number
  castRange: number
  aoeRadius: number
  dps: number
  damagePerMana: number
  dpm: number
  controlRate: number
}

// 技能分组统计
export interface AbilityGroupStats {
  count: number
  avgDamage: number
  avgCooldown: number
  avgManaCost: number
  avgDPS: number
  avgDamagePerMana: number
}

// 物品数据
export interface Item {
  id: number
  name: string
  localizedName: string
  cost: number

  // 物品属性
  attributes?: ItemAttribute[]
  components?: string[]

  // 分类
  isRecipe?: boolean
  isConsumable?: boolean
  isNeutral?: boolean
}

export interface ItemAttribute {
  key: string
  value: number | string
  display?: string
}

// 世界数据
export interface WorldData {
  // 地图相关
  mapSize?: number

  // 经济相关
  goldPerSecond?: number
  startingGold?: number

  // 经验相关
  experienceTable?: number[]

  // 其他常量
  [key: string]: any
}

// 数据加载器返回类型
export interface GameData {
  heroes: Hero[] | null
  abilities: Ability[] | null
  items: Item[] | null
  world: WorldData | null
}

// 计算相关类型
export interface HeroStats {
  hp: number
  mana: number
  armor: number
  magicResistance: number
  damage: number
  attackSpeed: number
  dps: number
  physicalEHP: number
  magicalEHP: number
}

// 图表配色
export const ATTRIBUTE_COLORS = {
  strength: '#e63946',
  agility: '#2ecc71',
  intelligence: '#3498db',
  universal: '#9b59b6'
} as const

// 属性中文名
export const ATTRIBUTE_NAMES = {
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  universal: '全能'
} as const
