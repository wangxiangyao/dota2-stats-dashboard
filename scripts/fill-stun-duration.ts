/**
 * 从 abilities.json 中提取眩晕时间数据，填充到 stun.json
 */

import fs from 'fs'
import path from 'path'

const basePath = 'd:/作品/Dota2/【LOL - Dota】攻略/No.3 Dota的逻辑/dota2-analysis/public/data/abilities'

// 读取数据
const abilities = JSON.parse(fs.readFileSync(path.join(basePath, 'abilities.json'), 'utf-8'))
const stunData = JSON.parse(fs.readFileSync(path.join(basePath, 'traits/stun.json'), 'utf-8'))

// 眩晕时间相关的关键词（优先精确匹配，移除容易误判的 duration）
const stunDurationKeys = [
    'stun_duration', 'bash_duration', 'hex_duration', 'root_duration',
    'sleep_duration', 'cyclone_duration', 'taunt_duration', 'fear_duration',
    'disable_duration', 'shackle_duration', 'channel_time',
    'voodoo_duration', 'lift_duration', 'bind_duration', 'entangle_duration',
    'ensnare_duration', 'knockback_duration', 'stone_duration', 'petrify_duration'
]

// 从 abilityValues 中提取眩晕时间
function extractStunDuration(abilityValues: Record<string, any>): string | null {
    if (!abilityValues) return null

    for (const key of stunDurationKeys) {
        for (const [k, v] of Object.entries(abilityValues)) {
            if (k.toLowerCase().includes(key)) {
                if (typeof v === 'string' && v.trim()) return v.trim()
                if (typeof v === 'object' && (v as any)?.value) {
                    const val = (v as any).value
                    if (typeof val === 'string' && val.trim()) return val.trim()
                }
                if (typeof v === 'number') return String(v)
            }
        }
    }
    return null
}

// 构建技能名 -> 技能映射
const abilityMap = new Map<string, any>()
for (const ability of abilities) {
    if (ability.internalName) {
        abilityMap.set(ability.internalName, ability)
    }
}

// 统计
let updated = 0
let skipped = 0

// 遍历 stun.json 中的技能，用 abilities.json 数据覆盖
for (const [name, data] of Object.entries(stunData)) {
    const existing = data as any

    // 查找对应的技能
    const ability = abilityMap.get(name)
    if (!ability) {
        console.log(`未找到技能: ${name}`)
        continue
    }

    // 提取眩晕时间
    const duration = extractStunDuration(ability.abilityValues)
    if (duration) {
        // 检查是否与现有值不同
        if (existing.stunDuration !== duration) {
            console.log(`✓ ${name}: ${existing.stunDuration || '(空)'} -> ${duration}`)
            existing.stunDuration = duration
            updated++
        } else {
            skipped++
        }
        if (!existing.stunType) {
            existing.stunType = 'stun'
        }
    } else {
        console.log(`✗ ${name}: 未找到眩晕时间字段 (当前: ${existing.stunDuration || '(空)'})`)
    }
}

// 保存
fs.writeFileSync(
    path.join(basePath, 'traits/stun.json'),
    JSON.stringify(stunData, null, 2),
    'utf-8'
)

console.log(`\n完成! 更新: ${updated}, 跳过: ${skipped}`)
