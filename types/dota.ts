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

// 技能数据
export interface Ability {
  id: number
  name: string
  localizedName: string
  heroId?: number
  description?: string

  // 技能属性
  manaCost?: number[]
  cooldown?: number[]
  damage?: number[]
  damageType?: 'physical' | 'magical' | 'pure'

  // 其他属性
  behavior?: string[]
  targetType?: string
  isUltimate?: boolean
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
