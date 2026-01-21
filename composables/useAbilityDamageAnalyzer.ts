import type { Ability, Hero } from '~/types/dota'
import type { DamageTraitDataMap, DamageTraitData } from '~/types/traits/damage'

export interface DamageStats {
    count: number
    mean: number
    median: number
    p25: number
    p75: number
    p90: number
    min: number
    max: number
}

export interface AbilityDamageInfo {
    name: string
    displayName: string
    heroName: string
    heroAttribute: string
    isUltimate: boolean
    isAOE: boolean
    isBurst: boolean  // 是否为瞬间伤害
    damageType: string | null
    cooldown: number
    damage: number  // 满级期望伤害
    damageAllLevels: number[]  // 各等级伤害
    damageTime: number | null  // 持续时间（仅DoT有效）
    dpsAllLevels: number[]  // 各等级DPS（仅DoT有效）
    cdDamage: number  // CD周期内的实际伤害（用于效率计算）
    cdDamageAllLevels: number[]  // 各等级CD周期伤害
    manaCost: number  // 满级蓝耗
    manaCostAllLevels: number[]  // 各等级蓝耗
}

export const useAbilityDamageAnalyzer = () => {
    const { calculateAbilityDamage } = useDamageCalculator()

    // 计算统计数据
    const calculateStats = (values: number[]): DamageStats => {
        if (values.length === 0) {
            return { count: 0, mean: 0, median: 0, p25: 0, p75: 0, p90: 0, min: 0, max: 0 }
        }

        const sorted = [...values].sort((a, b) => a - b)
        const sum = values.reduce((a, b) => a + b, 0)

        const percentile = (arr: number[], p: number) => {
            const index = Math.ceil((p / 100) * arr.length) - 1
            return arr[Math.max(0, index)]
        }

        return {
            count: values.length,
            mean: Math.round(sum / values.length),
            median: Math.round(percentile(sorted, 50)),
            p25: Math.round(percentile(sorted, 25)),
            p75: Math.round(percentile(sorted, 75)),
            p90: Math.round(percentile(sorted, 90)),
            min: Math.round(sorted[0]),
            max: Math.round(sorted[sorted.length - 1])
        }
    }

    // 计算 DPS
    const calculateDPS = (damage: number, cd: number, timeWindow: number): number => {
        if (cd <= 0 || timeWindow <= 0) return 0
        const casts = Math.floor(timeWindow / cd) + 1
        return Math.round((damage * casts) / timeWindow)
    }

    // 构建技能信息列表 - 使用真实公式计算
    const buildAbilityDamageList = (
        damageData: DamageTraitDataMap,
        abilities: Ability[],
        heroes: Hero[],
        abilityNames: Record<string, string>
    ): AbilityDamageInfo[] => {
        // 构建英雄属性映射
        const heroAttributeMap: Record<string, string> = {}
        heroes.forEach(h => {
            const key = h.internalName?.replace('npc_dota_hero_', '') || ''
            if (key) heroAttributeMap[key] = h.primaryAttribute || 'unknown'
        })

        // 构建技能映射（按 internalName）
        const abilityMap: Record<string, Ability> = {}
        abilities.forEach(a => {
            if (a.internalName) abilityMap[a.internalName] = a
        })

        const result: AbilityDamageInfo[] = []

        for (const [name, traitData] of Object.entries(damageData)) {
            if (!traitData.formulaExpected) continue

            const ability = abilityMap[name]

            // 提取英雄名（从技能名解析）
            const parts = name.split('_')
            let heroKey = parts[0]
            // 处理双段英雄名
            const doubleNamePrefixes = ['shadow', 'dark', 'night', 'storm', 'ember', 'earth', 'void',
                'winter', 'witch', 'keeper', 'ancient', 'dragon', 'phantom', 'chaos', 'death',
                'spirit', 'primal', 'faceless', 'obsidian', 'queen', 'troll', 'monkey', 'legion',
                'skywrath', 'nyx', 'sand', 'lone', 'treant', 'vengeful', 'crystal', 'skeleton']
            if (doubleNamePrefixes.includes(parts[0]) && parts.length > 2) {
                heroKey = `${parts[0]}_${parts[1]}`
            }

            // 判断是否大招（优先使用 abilities.json 中的 isUltimate 字段）
            const isUltimate = (ability as any)?.isUltimate === true

            // 判断是否AOE
            const behavior = (ability as any)?.AbilityBehavior || ''
            const isAOE = behavior.includes('AOE') ||
                traitData.formulaExpected.includes('radius') ||
                traitData.formulaExpected.includes('wave') ||
                name.includes('nova') || name.includes('storm') ||
                name.includes('shockwave') || name.includes('slam')

            // 使用真实公式计算伤害
            let damageAllLevels: number[] = []
            let maxLevelDamage = 0

            if (ability) {
                // 构建 abilityValues 对象（支持数组和对象两种格式）
                const abilityValues: Record<string, any> = {}
                const rawValues = (ability as any).abilityValues
                if (rawValues) {
                    if (Array.isArray(rawValues)) {
                        rawValues.forEach((v: any) => {
                            if (v.key) abilityValues[v.key] = v.value
                        })
                    } else if (typeof rawValues === 'object') {
                        // 直接是对象格式
                        Object.assign(abilityValues, rawValues)
                    }
                }

                // 使用计算器计算
                const calcResult = calculateAbilityDamage(
                    { ...ability, abilityValues, is_ultimate: isUltimate },
                    traitData
                )
                damageAllLevels = calcResult.expected
                maxLevelDamage = damageAllLevels[damageAllLevels.length - 1] || 0
            }

            // 如果没有 ability 数据或计算失败，尝试从公式中提取基础值
            if (maxLevelDamage === 0 || isNaN(maxLevelDamage)) {
                // 尝试从公式中提取数字
                const nums = traitData.formulaExpected.match(/\d+/g)
                if (nums && nums.length > 0) {
                    maxLevelDamage = Math.max(...nums.map(n => parseInt(n)))
                } else {
                    maxLevelDamage = isUltimate ? 400 : 200  // 无法计算时的默认值
                }
            }

            // 提取CD（取满级CD值）
            let cooldown = isUltimate ? 80 : 10
            if (ability) {
                const cd = (ability as any).cooldown
                if (cd && typeof cd === 'string') {
                    const cdValues = cd.split(/\s+/).map(Number).filter(v => !isNaN(v) && v > 0)
                    if (cdValues.length > 0) {
                        cooldown = cdValues[cdValues.length - 1] // 满级 CD
                    }
                } else if (typeof cd === 'number') {
                    cooldown = cd
                }
            }

            // 提取显示名称（abilityNames 格式是 { zh, en }）
            const nameObj = abilityNames[name] as any
            const displayName = nameObj?.zh || (typeof nameObj === 'string' ? nameObj : name.replace(/_/g, ' '))

            // 解析 damageTime（持续时间）
            let damageTime: number | null = null
            let dpsAllLevels: number[] = []

            if (traitData.isBurst === false && traitData.damageTime) {
                const times = traitData.damageTime.split(/\s+/).map(Number).filter(v => !isNaN(v) && v > 0)
                if (times.length > 0) {
                    damageTime = times[times.length - 1] // 使用满级时间
                    // 计算各等级 DPS
                    dpsAllLevels = damageAllLevels.map((dmg, i) => {
                        const time = times.length > 1 ? (times[i] ?? times[times.length - 1]) : times[0]
                        return time > 0 ? Math.round(dmg / time) : 0
                    })
                }
            }

            // 计算 CD 周期内的实际伤害
            // 对于持续伤害技能：如果 CD < damageTime，按比例计算
            // 对于瞬发技能：cdDamage = damage
            let cdDamageAllLevels: number[] = []
            let cdDamage = Math.round(maxLevelDamage)

            if (traitData.isBurst === false && damageTime && damageTime > 0 && cooldown > 0) {
                // 持续伤害技能：按 CD/damageTime 比例计算
                const ratio = Math.min(cooldown / damageTime, 1)
                cdDamageAllLevels = damageAllLevels.map(dmg => Math.round(dmg * ratio))
                cdDamage = Math.round(maxLevelDamage * ratio)
            } else {
                // 瞬发技能：CD 伤害 = 完整伤害
                cdDamageAllLevels = [...damageAllLevels]
            }

            // 提取蓝耗
            let manaCost = 0
            let manaCostAllLevels: number[] = []
            if (ability) {
                const mc = (ability as any).manaCost
                if (mc && typeof mc === 'string') {
                    manaCostAllLevels = mc.split(/\s+/).map(Number).filter(v => !isNaN(v) && v >= 0)
                    if (manaCostAllLevels.length > 0) {
                        manaCost = manaCostAllLevels[manaCostAllLevels.length - 1] // 满级蓝耗
                    }
                } else if (typeof mc === 'number') {
                    manaCost = mc
                    manaCostAllLevels = [mc]
                }
            }

            result.push({
                name,
                displayName,
                heroName: heroKey,
                heroAttribute: heroAttributeMap[heroKey] || 'universal',
                isUltimate,
                isAOE,
                isBurst: traitData.isBurst !== false,  // 默认为瞬间伤害
                damageType: (ability as any)?.damageType || 'MAGICAL',
                cooldown,
                damage: Math.round(maxLevelDamage),
                damageAllLevels,
                damageTime,
                dpsAllLevels,
                cdDamage,
                cdDamageAllLevels,
                manaCost,
                manaCostAllLevels
            })
        }

        console.log(`Built ${result.length} abilities from damage.json`)
        console.log(`  - Ultimates: ${result.filter(a => a.isUltimate).length}`)
        console.log(`  - With calculated damage: ${result.filter(a => a.damage > 0).length}`)

        return result
    }

    // 按维度分组统计
    const groupByUltimate = (list: AbilityDamageInfo[]) => {
        const normal = list.filter(a => !a.isUltimate)
        const ultimate = list.filter(a => a.isUltimate)
        return {
            normal: calculateStats(normal.map(a => a.damage)),
            ultimate: calculateStats(ultimate.map(a => a.damage))
        }
    }

    const groupByAttribute = (list: AbilityDamageInfo[]) => {
        const groups: Record<string, AbilityDamageInfo[]> = {
            strength: [],
            agility: [],
            intelligence: [],
            universal: []
        }

        list.forEach(a => {
            const attr = a.heroAttribute.toLowerCase()
            if (attr.includes('str')) groups.strength.push(a)
            else if (attr.includes('agi')) groups.agility.push(a)
            else if (attr.includes('int')) groups.intelligence.push(a)
            else groups.universal.push(a)
        })

        return {
            strength: calculateStats(groups.strength.map(a => a.damage)),
            agility: calculateStats(groups.agility.map(a => a.damage)),
            intelligence: calculateStats(groups.intelligence.map(a => a.damage)),
            universal: calculateStats(groups.universal.map(a => a.damage))
        }
    }

    const groupByTargetType = (list: AbilityDamageInfo[]) => {
        const single = list.filter(a => !a.isAOE)
        const aoe = list.filter(a => a.isAOE)
        return {
            single: calculateStats(single.map(a => a.damage)),
            aoe: calculateStats(aoe.map(a => a.damage))
        }
    }

    return {
        calculateStats,
        calculateDPS,
        buildAbilityDamageList,
        groupByUltimate,
        groupByAttribute,
        groupByTargetType
    }
}
