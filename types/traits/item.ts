/**
 * 物品自定义属性数据类型
 * 用于手动维护物品的标准属性，避免原始 attribute 命名混乱
 */

/** 物品标准属性 */
export interface ItemAttributes {
    /** 力量 */
    strength?: number
    /** 敏捷 */
    agility?: number
    /** 智力 */
    intellect?: number
    /** 全属性 */
    allStats?: number
    /** 攻击力 */
    damage?: number
    /** 攻速 */
    attackSpeed?: number
    /** 护甲 */
    armor?: number
    /** 生命值 */
    health?: number
    /** 魔法值 */
    mana?: number
    /** 生命恢复 */
    healthRegen?: number
    /** 魔法恢复 */
    manaRegen?: number
    /** 移速 (固定值) */
    moveSpeed?: number
    /** 闪避 (百分比) */
    evasion?: number
    /** 魔抗 (百分比) */
    magicResist?: number
    /** 物理吸血 (百分比) */
    lifesteal?: number
    /** 法术吸血 (百分比) */
    spellLifesteal?: number
}

/** 物品自定义 Trait */
export interface ItemTraitData {
    /** 是否为基础物品 */
    isBasic?: boolean
    /** 手动维护的标准属性 */
    attributes?: ItemAttributes
    /** 备注 */
    notes?: string
}

/**
 * 物品 Trait 数据集合
 * key 为物品内部名称 (如 item_boots)
 */
export type ItemTraitDataMap = Record<string, ItemTraitData>

/** 属性中文名映射 */
export const ATTR_NAME_MAP: Record<keyof ItemAttributes, string> = {
    strength: '力量',
    agility: '敏捷',
    intellect: '智力',
    allStats: '全属性',
    damage: '攻击力',
    attackSpeed: '攻速',
    armor: '护甲',
    health: '生命值',
    mana: '魔法值',
    healthRegen: '生命恢复',
    manaRegen: '魔法恢复',
    moveSpeed: '移速',
    evasion: '闪避',
    magicResist: '魔抗',
    lifesteal: '物理吸血',
    spellLifesteal: '法术吸血',
}
