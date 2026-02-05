/**
 * 从 abilities.json 中提取可能的控制技能（眩晕/缠绕/沉默等）
 * 
 * 运行: npx tsx scripts/extract-stun-abilities.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// 控制相关的关键词
const stunKeywords = [
    'stun', 'bash', 'hex', 'root', 'ensnare', 'entangle',
    'sleep', 'cyclone', 'disable', 'imprison', 'taunt',
    'fear', 'silence', 'mute', 'break', 'disarm',
    'leash', 'banish', 'hidden', 'stop'
]

// 排除的关键词（这些通常不是控制效果）
const excludeKeywords = [
    'stunned_damage', 'stun_multiplier', 'bash_chance', 'bash_multiplier'
]

interface Ability {
    internalName: string
    name: string | null
    nameZh: string | null
    heroName: string
    heroNameZh: string
    heroNameEn: string
    isUltimate: boolean
    isPassive: boolean
    isInnate: boolean
    cooldown: string | null
    castRange: string | null
    abilityValues: Record<string, any>
    behavior: string | null
}

interface StunTraitData {
    stunDuration: string
    stunType: string
    notes: string | null
}

function extractStunAbilities() {
    const abilitiesPath = resolve(__dirname, '../public/data/abilities/abilities.json')
    const outputPath = resolve(__dirname, '../public/data/abilities/traits/stun.json')

    const abilities: Ability[] = JSON.parse(readFileSync(abilitiesPath, 'utf-8'))

    const stunAbilities: Record<string, StunTraitData> = {}

    for (const ability of abilities) {
        if (!ability.abilityValues) continue

        // 跳过被动和天生技能
        if (ability.isPassive || ability.isInnate) continue

        // 检查 abilityValues 中的属性
        for (const [key, value] of Object.entries(ability.abilityValues)) {
            const keyLower = key.toLowerCase()

            // 检查是否匹配控制关键词
            const matchedKeyword = stunKeywords.find(kw => keyLower.includes(kw))
            if (!matchedKeyword) continue

            // 排除特定关键词
            if (excludeKeywords.some(ex => keyLower.includes(ex))) continue

            // 检查是否有持续时间相关的值
            if (!keyLower.includes('duration') && !keyLower.includes('time')) continue

            // 提取时间值
            let duration = ''
            if (typeof value === 'string') {
                duration = value
            } else if (typeof value === 'object' && value?.value) {
                duration = value.value
            } else if (typeof value === 'number') {
                duration = String(value)
            }

            if (!duration) continue

            // 确定控制类型
            let stunType = 'stun'
            if (keyLower.includes('hex')) stunType = 'hex'
            else if (keyLower.includes('root') || keyLower.includes('ensnare') || keyLower.includes('entangle')) stunType = 'root'
            else if (keyLower.includes('sleep')) stunType = 'sleep'
            else if (keyLower.includes('cyclone')) stunType = 'cyclone'
            else if (keyLower.includes('taunt')) stunType = 'taunt'
            else if (keyLower.includes('silence')) stunType = 'silence'
            else if (keyLower.includes('fear')) stunType = 'fear'
            else if (keyLower.includes('disarm')) stunType = 'disarm'
            else if (keyLower.includes('leash')) stunType = 'leash'

            // 添加到结果
            if (!stunAbilities[ability.internalName]) {
                stunAbilities[ability.internalName] = {
                    stunDuration: duration,
                    stunType: stunType,
                    notes: `${ability.nameZh || ability.name} - ${key}`
                }
            }
        }
    }

    // 写入文件
    writeFileSync(outputPath, JSON.stringify(stunAbilities, null, 2), 'utf-8')
    console.log(`提取完成！共找到 ${Object.keys(stunAbilities).length} 个控制技能`)
    console.log(`输出文件: ${outputPath}`)
}

extractStunAbilities()
