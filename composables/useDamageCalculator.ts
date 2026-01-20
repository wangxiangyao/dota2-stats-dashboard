/**
 * 伤害公式计算器 Composable
 * 用于根据公式和技能数据计算各等级伤害
 */

import type { DamageTraitData } from '~/types/traits'

export const useDamageCalculator = () => {

    /**
     * 从值中提取数字数组
     * 支持格式: "8 14 20 26" | 8 | { value: "8 14 20 26" }
     */
    const extractValue = (val: any): number[] | null => {
        if (val === null || val === undefined) return null
        if (typeof val === 'number') return [val]
        if (typeof val === 'string') {
            // "8 14 20 26" -> [8, 14, 20, 26]
            const nums = val.split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
            return nums.length > 0 ? nums : null
        }
        if (typeof val === 'object' && val.value !== undefined) {
            return extractValue(val.value)
        }
        return null
    }

    /**
     * 计算公式表达式
     * @param formula 公式字符串，如 "damage × duration"
     * @param abilityValues 技能数值
     * @param level 技能等级（0-indexed）
     * @param customParams 自定义参数（优先级高于 abilityValues）
     */
    const calculateFormula = (
        formula: string,
        abilityValues: Record<string, any>,
        level: number,
        customParams: Record<string, any> = {}
    ): number | null => {
        if (!formula) return null

        let expr = formula

        // 合并 abilityValues 和 customParams，customParams 优先
        const allValues = { ...abilityValues, ...customParams }

        // 提取所有变量名
        const varPattern = /\$?([a-zA-Z_][a-zA-Z0-9_]*)/g
        const matches = [...formula.matchAll(varPattern)]

        for (const match of matches) {
            const varName = match[1]

            // 跳过运算符相关名称
            if (['×', 'x', 'X'].includes(varName)) continue

            const values = extractValue(allValues[varName])
            if (values === null) continue

            // 根据等级取值（如果只有一个值则所有等级都用该值）
            const value = values.length > 1 ? (values[level] ?? values[values.length - 1]) : values[0]

            // 替换变量（先替换带 $ 的，再替换不带 $ 的）
            expr = expr.replace(new RegExp(`\\$${varName}\\b`, 'g'), String(value))
            expr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(value))
        }

        // 替换乘号
        expr = expr.replace(/×/g, '*')
        expr = expr.replace(/÷/g, '/')

        try {
            // 安全计算表达式（只允许数字和基本运算符）
            if (!/^[\d\s+\-*/().]+$/.test(expr)) {
                return null
            }
            return eval(expr)
        } catch (e) {
            return null
        }
    }

    /**
     * 计算技能在各等级的伤害
     * @param ability 技能数据
     * @param traitData 特征数据（包含公式）
     * @returns 各等级伤害数组
     */
    const calculateAbilityDamage = (
        ability: any,
        traitData: DamageTraitData | null
    ): { expected: number[]; min: number[]; max: number[] } => {
        const result = {
            expected: [] as number[],
            min: [] as number[],
            max: [] as number[]
        }

        if (!traitData || !ability.abilityValues) return result

        // 确定技能等级数
        let levelCount = 4
        if (ability.damageValues && ability.damageValues.length > 0) {
            const maxLen = Math.max(...ability.damageValues.map((arr: any[]) => arr?.length || 0))
            if (maxLen > 0) levelCount = maxLen
        }

        // 如果是大招，通常只有 3 级
        if (ability.isUltimate) {
            levelCount = 3
        }

        // 解析 customParams
        const customParams: Record<string, any> = {}
        if (traitData.customParams) {
            try {
                const parsed = typeof traitData.customParams === 'string'
                    ? JSON.parse(traitData.customParams)
                    : traitData.customParams
                Object.assign(customParams, parsed)
            } catch (e) {
                // 忽略解析错误
            }
        }

        // 计算各等级
        for (let level = 0; level < levelCount; level++) {
            // 期望值
            if (traitData.formulaExpected) {
                const val = calculateFormula(traitData.formulaExpected, ability.abilityValues, level, customParams)
                result.expected.push(val ?? 0)
            }

            // 最小值
            if (traitData.formulaMin) {
                const val = calculateFormula(traitData.formulaMin, ability.abilityValues, level, customParams)
                result.min.push(val ?? 0)
            }

            // 最大值
            if (traitData.formulaMax) {
                const val = calculateFormula(traitData.formulaMax, ability.abilityValues, level, customParams)
                result.max.push(val ?? 0)
            }
        }

        return result
    }

    /**
     * 格式化伤害数组为显示字符串
     */
    const formatDamageArray = (damages: number[]): string => {
        if (damages.length === 0) return '-'
        return damages.map(d => Math.round(d)).join(' / ')
    }

    /**
     * 获取技能伤害的简短摘要（用于 tooltip）
     */
    const getDamageSummary = (
        ability: any,
        traitData: DamageTraitData | null
    ): string => {
        if (!traitData) return '未配置公式'

        const result = calculateAbilityDamage(ability, traitData)
        const lines: string[] = []

        if (traitData.formulaExpected) {
            lines.push(`期望: ${traitData.formulaExpected}`)
            lines.push(`伤害: ${formatDamageArray(result.expected)}`)
        }

        if (traitData.formulaMin) {
            lines.push(`最小: ${traitData.formulaMin}`)
            lines.push(`伤害: ${formatDamageArray(result.min)}`)
        }

        if (traitData.formulaMax) {
            lines.push(`最大: ${traitData.formulaMax}`)
            lines.push(`伤害: ${formatDamageArray(result.max)}`)
        }

        if (traitData.notes) {
            lines.push(`备注: ${traitData.notes}`)
        }

        return lines.length > 0 ? lines.join('\n') : '已配置'
    }

    return {
        extractValue,
        calculateFormula,
        calculateAbilityDamage,
        formatDamageArray,
        getDamageSummary
    }
}
