/**
 * 眩晕特性数据类型定义
 */

export interface StunTraitData {
    /** 眩晕持续时间，支持多级（空格分隔） */
    stunDuration: string
    /** 眩晕类型 */
    stunType: 'stun' | 'hex' | 'root' | 'sleep' | 'taunt' | 'channel_stun' | 'mini_stun' | 'time_stop' | 'none'
    /** 备注 */
    notes: string | null
}

export type StunTraitDataMap = Record<string, StunTraitData>

/**
 * 用于分析的眩晕技能信息
 */
export interface StunAbilityInfo {
    /** 技能内部名称 */
    internalName: string
    /** 技能中文名 */
    nameZh: string | null
    /** 技能英文名 */
    name: string | null
    /** 英雄内部名称 */
    heroName: string
    /** 英雄中文名 */
    heroNameZh: string
    /** 英雄英文名 */
    heroNameEn: string
    /** 是否是大招 */
    isUltimate: boolean
    /** 眩晕持续时间数组（各等级） */
    stunDurations: number[]
    /** 最大眩晕时间 */
    maxStunDuration: number
    /** 眩晕类型 */
    stunType: string
    /** 技能冷却 */
    cooldown: string | null
    /** 技能施法距离 */
    castRange: string | null
    /** 英雄攻击距离 */
    heroAttackRange: number
    /** 英雄主属性 */
    heroPrimaryAttr: string
    /** 技能伤害（如有） */
    damage: number | null
    /** 备注 */
    notes: string | null
}
