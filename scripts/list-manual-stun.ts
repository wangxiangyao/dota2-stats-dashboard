/**
 * 列出 stun.json 中在 abilities.json 没有 stun_duration 的技能
 */

import fs from 'fs'
import path from 'path'

const basePath = 'd:/作品/Dota2/【LOL - Dota】攻略/No.3 Dota的逻辑/dota2-analysis/public/data/abilities'

const abilities = JSON.parse(fs.readFileSync(path.join(basePath, 'abilities.json'), 'utf-8'))
const stunData = JSON.parse(fs.readFileSync(path.join(basePath, 'traits/stun.json'), 'utf-8'))

// 构建技能映射
const abilityMap = new Map<string, any>()
for (const ability of abilities) {
    if (ability.internalName) {
        abilityMap.set(ability.internalName, ability)
    }
}

// 精确的眩晕时间关键词
const stunDurationKeys = [
    'stun_duration', 'stun_min', 'bash_duration', 'hex_duration', 'root_duration',
    'sleep_duration', 'cyclone_duration', 'taunt_duration', 'fear_duration',
    'disable_duration', 'shackle_duration', 'channel_time',
    'voodoo_duration', 'lift_duration', 'bind_duration', 'entangle_duration',
    'ensnare_duration', 'knockback_duration'
]

function findStunDurationKey(abilityValues: Record<string, any>): string | null {
    if (!abilityValues) return null
    for (const [k] of Object.entries(abilityValues)) {
        for (const key of stunDurationKeys) {
            if (k.toLowerCase().includes(key)) {
                return k
            }
        }
    }
    return null
}

console.log('=== 需要手动维护眩晕时间的技能 ===\n')

const needsManual: { name: string; nameZh: string; currentStun: string }[] = []

for (const [name, data] of Object.entries(stunData)) {
    const ability = abilityMap.get(name)
    if (!ability) {
        console.log(`未找到技能数据: ${name}`)
        continue
    }

    const stunKey = findStunDurationKey(ability.abilityValues)
    if (!stunKey) {
        needsManual.push({
            name,
            nameZh: ability.nameZh || ability.name || name,
            currentStun: (data as any).stunDuration || '(未填写)'
        })
    }
}

// 按当前是否填写分组
const filled = needsManual.filter(a => a.currentStun !== '(未填写)')
const empty = needsManual.filter(a => a.currentStun === '(未填写)')

console.log(`【已填写但需确认】(${filled.length}个)`)
for (const a of filled) {
    console.log(`  ${a.nameZh} (${a.name}): ${a.currentStun}`)
}

console.log(`\n【未填写需手动添加】(${empty.length}个)`)
for (const a of empty) {
    console.log(`  ${a.nameZh} (${a.name})`)
}

console.log(`\n总计需手动维护: ${needsManual.length} 个技能`)
