/**
 * 英雄数值计算 Composable
 * 包含所有英雄数值计算公式
 */

import type { Hero, HeroStats, PrimaryAttribute } from '~/types/dota'

// 黄点加成（属性加成）配置
const ATTRIBUTE_BONUS_LEVELS = [15, 16, 17, 19, 20, 21, 22] // 获得黄点的等级
const ATTRIBUTE_BONUS_PER_LEVEL = 2 // 每次黄点+2全属性

export const useHeroCalculator = () => {
  /**
   * 计算指定等级的黄点加成
   */
  const getAttributeBonus = (level: number): number => {
    let bonus = 0
    for (const bonusLevel of ATTRIBUTE_BONUS_LEVELS) {
      if (level >= bonusLevel) {
        bonus += ATTRIBUTE_BONUS_PER_LEVEL
      }
    }
    return bonus
  }

  /**
   * 计算指定等级的属性值
   */
  const getAttributeAtLevel = (
    baseValue: number,
    gain: number,
    level: number,
    includeBonus: boolean = true
  ): number => {
    const levelGain = gain * (level - 1)
    const bonus = includeBonus ? getAttributeBonus(level) : 0
    return baseValue + levelGain + bonus
  }

  /**
   * 计算英雄在指定等级的所有属性
   */
  const getHeroAttributesAtLevel = (
    hero: Hero,
    level: number,
    includeBonus: boolean = true
  ) => {
    return {
      strength: getAttributeAtLevel(hero.baseStrength, hero.strengthGain, level, includeBonus),
      agility: getAttributeAtLevel(hero.baseAgility, hero.agilityGain, level, includeBonus),
      intelligence: getAttributeAtLevel(hero.baseIntelligence, hero.intelligenceGain, level, includeBonus)
    }
  }

  /**
   * 计算生命值
   * HP = 基础生命 + 力量 × 22
   */
  const calculateHP = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseHP = hero.baseHealth || 120 // 默认基础生命
    return baseHP + attrs.strength * 22
  }

  /**
   * 计算魔法值
   * Mana = 基础魔法 + 智力 × 12
   */
  const calculateMana = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseMana = hero.baseMana || 75 // 默认基础魔法
    return baseMana + attrs.intelligence * 12
  }

  /**
   * 计算生命恢复
   * 生命恢复 = 基础生命恢复 + 力量 × 0.1
   */
  const calculateHPRegen = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseRegen = hero.baseHealthRegen || 0
    return baseRegen + attrs.strength * 0.1
  }

  /**
   * 计算魔法恢复
   * 魔法恢复 = 基础魔法恢复 + 智力 × 0.05
   */
  const calculateManaRegen = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseRegen = hero.baseManaRegen || 0
    return baseRegen + attrs.intelligence * 0.05
  }

  /**
   * 计算护甲
   * 护甲 = 基础护甲 + 敏捷 × 0.167
   */
  const calculateArmor = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseArmor = hero.baseArmor || 0
    return baseArmor + attrs.agility * 0.167
  }

  /**
   * 计算物理减伤
   * 物理减伤 = 0.06 × 护甲 / (1 + 0.06 × 护甲)
   */
  const calculatePhysicalReduction = (armor: number): number => {
    return (0.06 * armor) / (1 + 0.06 * armor)
  }

  /**
   * 计算魔抗
   * 魔抗 = 基础魔抗(25%) + 智力 × 0.1%
   */
  const calculateMagicResistance = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseMR = hero.baseMagicResistance || 25
    return baseMR + attrs.intelligence * 0.1
  }

  /**
   * 计算物理EHP
   * 物理EHP = HP × (1 + 0.06 × 护甲)
   */
  const calculatePhysicalEHP = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const hp = calculateHP(hero, level, includeBonus)
    const armor = calculateArmor(hero, level, includeBonus)
    return hp * (1 + 0.06 * armor)
  }

  /**
   * 计算魔法EHP
   * 魔法EHP = HP / (1 - 魔抗%)
   */
  const calculateMagicalEHP = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const hp = calculateHP(hero, level, includeBonus)
    const mr = calculateMagicResistance(hero, level, includeBonus) / 100
    return hp / (1 - mr)
  }

  /**
   * 计算攻击力
   * 攻击力 = 基础攻击力 + 主属性加成
   * 力量/敏捷/智力英雄：主属性 × 1.0
   * 全能英雄：全属性 × 0.45
   * 参考：https://liquipedia.net/dota2/Attack_Damage
   */
  const calculateDamage = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const baseAttack = ((hero.baseAttackMin || 0) + (hero.baseAttackMax || 0)) / 2

    let attrBonus = 0
    switch (hero.primaryAttribute) {
      case 'strength':
        attrBonus = attrs.strength
        break
      case 'agility':
        attrBonus = attrs.agility
        break
      case 'intelligence':
        attrBonus = attrs.intelligence
        break
      case 'universal':
        attrBonus = (attrs.strength + attrs.agility + attrs.intelligence) * 0.45
        break
    }

    return baseAttack + attrBonus
  }

  /**
   * 计算攻击速度
   * 攻速 = (1 + 敏捷 × 0.01) / BAT
   */
  const calculateAttackSpeed = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const attrs = getHeroAttributesAtLevel(hero, level, includeBonus)
    const bat = hero.attackRate || 1.7
    return (1 + attrs.agility * 0.01) / bat
  }

  /**
   * 计算DPS
   * DPS = 攻击力 × 攻击速度
   */
  const calculateDPS = (hero: Hero, level: number, includeBonus: boolean = true): number => {
    const damage = calculateDamage(hero, level, includeBonus)
    const attackSpeed = calculateAttackSpeed(hero, level, includeBonus)
    return damage * attackSpeed
  }

  /**
   * 计算英雄所有战斗属性
   */
  const calculateHeroStats = (hero: Hero, level: number, includeBonus: boolean = true): HeroStats => {
    return {
      hp: calculateHP(hero, level, includeBonus),
      mana: calculateMana(hero, level, includeBonus),
      armor: calculateArmor(hero, level, includeBonus),
      magicResistance: calculateMagicResistance(hero, level, includeBonus),
      damage: calculateDamage(hero, level, includeBonus),
      attackSpeed: calculateAttackSpeed(hero, level, includeBonus),
      dps: calculateDPS(hero, level, includeBonus),
      physicalEHP: calculatePhysicalEHP(hero, level, includeBonus),
      magicalEHP: calculateMagicalEHP(hero, level, includeBonus)
    }
  }

  return {
    getAttributeBonus,
    getAttributeAtLevel,
    getHeroAttributesAtLevel,
    calculateHP,
    calculateMana,
    calculateHPRegen,
    calculateManaRegen,
    calculateArmor,
    calculatePhysicalReduction,
    calculateMagicResistance,
    calculatePhysicalEHP,
    calculateMagicalEHP,
    calculateDamage,
    calculateAttackSpeed,
    calculateDPS,
    calculateHeroStats
  }
}
