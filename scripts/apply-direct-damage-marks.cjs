/**
 * 从技能分类概览.md中提取直接伤害标记，更新到 damage-abilities.json
 * 
 * 使用方法: node scripts/apply-direct-damage-marks.cjs
 */

const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', 'docs', '技能分类概览.md');
const ABILITIES_PATH = path.join(__dirname, '..', 'public', 'data', 'damage-abilities.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'damage-abilities.json');

// 读取文件
const mdContent = fs.readFileSync(MD_PATH, 'utf-8');
const abilities = require(ABILITIES_PATH);

// 解析 Markdown 表格，提取被标记为直接伤害的技能
const directDamageSkills = new Set();

// 逐行解析表格
const lines = mdContent.split('\n');
for (const line of lines) {
    // 跳过非表格行
    if (!line.startsWith('|')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 5) continue;

    // 跳过表头和分隔行
    if (cells[0] === '英雄' || cells[0].includes('---')) continue;

    const hero = cells[0];
    const skill = cells[1];
    const isDirect = cells[4].includes('✓');

    if (isDirect) {
        directDamageSkills.add(`${hero}-${skill}`);
    }
}

console.log('从 Markdown 中提取到直接伤害技能:', directDamageSkills.size, '个');

// 更新 abilities 数据，添加 isDamagePurpose 字段
let directCount = 0;
let indirectCount = 0;

abilities.forEach(ability => {
    const hero = ability.heroNameZh || ability.heroName;
    const skill = ability.nameZh || ability.internalName;
    const key = `${hero}-${skill}`;

    if (directDamageSkills.has(key)) {
        ability.isDamagePurpose = true;
        directCount++;
    } else {
        ability.isDamagePurpose = false;
        indirectCount++;
    }
});

console.log('标记结果:');
console.log('  直接伤害技能:', directCount);
console.log('  非直接伤害技能:', indirectCount);

// 保存更新后的数据
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(abilities, null, 2), 'utf-8');
console.log('\n已保存到:', OUTPUT_PATH);

// 验证几个关键技能
console.log('\n=== 验证 ===');
const testCases = ['莉娜-龙破斩', '祈求者-急速冷却', '亚巴顿-迷雾缠绕', '潮汐猎人-毁灭'];
testCases.forEach(key => {
    const [hero, skill] = key.split('-');
    const ability = abilities.find(a =>
        (a.heroNameZh === hero || a.heroName === hero) &&
        (a.nameZh === skill || a.internalName === skill)
    );
    if (ability) {
        console.log(`${key}: isDamagePurpose=${ability.isDamagePurpose}`);
    }
});
