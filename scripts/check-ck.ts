// 检查 chaos_knight_chaos_bolt 在 abilities.json 中的情况
import fs from 'fs'
const abilities = JSON.parse(fs.readFileSync('d:/作品/Dota2/【LOL - Dota】攻略/No.3 Dota的逻辑/dota2-analysis/public/data/abilities/abilities.json', 'utf-8'))

// 查找所有混沌骑士的技能
const ck = abilities.filter((a: any) => a.internalName?.includes('chaos_knight'))
console.log('混沌骑士技能数量:', ck.length)
for (const a of ck) {
    console.log(`\n${a.internalName}:`)
    console.log('  abilityValues:', JSON.stringify(a.abilityValues, null, 2).slice(0, 500))
}
