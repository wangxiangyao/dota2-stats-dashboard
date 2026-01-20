/**
 * 伤害特征数据类型
 */
export interface DamageTraitData {
    /** 期望伤害公式 */
    formulaExpected: string
    /** 最小伤害公式 */
    formulaMin?: string | null
    /** 最大伤害公式 */
    formulaMax?: string | null
    /** 自定义参数 */
    customParams?: Record<string, string> | null
    /** 备注 */
    notes?: string | null
}

/**
 * 伤害特征数据集合
 * key 为技能内部名称 (internalName)
 */
export type DamageTraitDataMap = Record<string, DamageTraitData>
