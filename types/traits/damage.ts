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
    /** 是否为瞬间伤害（true=瞬间伤害，false=持续伤害） */
    isBurst?: boolean | null
    /** 造成期望伤害所需时间（秒），仅持续伤害有效，格式: "16" 或 "1 2 3 4" */
    damageTime?: string | null
}

/**
 * 伤害特征数据集合
 * key 为技能内部名称 (internalName)
 */
export type DamageTraitDataMap = Record<string, DamageTraitData>
