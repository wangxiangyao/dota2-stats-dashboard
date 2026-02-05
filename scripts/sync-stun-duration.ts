/**
 * 遍历 stun.json 中的所有技能
 * - 有 stun_duration 的：自动更新
 * - 没有的：列出来让用户手动维护
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

// 从 abilityValues 中查找 stun_duration
function findStunDuration(abilityValues: Record<string, any>): string | null {
    if (!abilityValues) return null

    // 直接查找 stun_duration 字段
    for (const [k, v] of Object.entries(abilityValues)) {
        if (k === 'stun_duration') {
            if (typeof v === 'string') return v
            if (typeof v === 'object' && v?.value) return v.value
            if (typeof v === 'number') return String(v)
        }
    }
    return null
}

const autoUpdated: string[] = []
const needsManual: { name: string; nameZh: string; currentStun: string }[] = []
const notFound: string[] = []

console.log('=== 检查 stun.json 中的技能 ===\n')

for (const [name, data] of Object.entries(stunData)) {
    const ability = abilityMap.get(name)

    if (!ability) {
        notFound.push(name)
        continue
    }

    const duration = findStunDuration(ability.abilityValues)

    if (duration) {
        // 有 stun_duration，自动更新
        const existing = (data as any).stunDuration
        if (existing !== duration) {
            console.log(`✓ 自动更新: ${ability.nameZh || name} (${name})`)
            console.log(`    ${existing || '(空)'} -> ${duration}`)
                ; (data as any).stunDuration = duration
            autoUpdated.push(name)
        }
        if (!(data as any).stunType) {
            (data as any).stunType = 'stun'
        }
    } else {
        // 没有 stun_duration，需要手动维护
        needsManual.push({
            name,
            nameZh: ability.nameZh || ability.name || name,
            currentStun: (data as any).stunDuration || '(未填写)'
        })
    }
}

// 保存更新的数据
fs.writeFileSync(
    path.join(basePath, 'traits/stun.json'),
    JSON.stringify(stunData, null, 2),
    'utf-8'
)

console.log('\n===================================')
console.log(`自动更新: ${autoUpdated.length} 个技能`)
console.log(`需手动维护: ${needsManual.length} 个技能`)
if (notFound.length > 0) {
    console.log(`未找到技能数据: ${notFound.length} 个`)
}

console.log('\n=== 需要手动维护的技能 ===\n')
for (const a of needsManual) {
    console.log(`${a.nameZh} (${a.name}): ${a.currentStun}`)
}
