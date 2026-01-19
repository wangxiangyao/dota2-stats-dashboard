/**
 * 输出技能分类概览到 Markdown 文件，便于人工审核
 * 
 * 使用方法: node scripts/analyze-damage-types.cjs
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'damage-abilities.json');
const OUTPUT_MD = path.join(__dirname, '..', 'docs', '技能分类概览.md');
const OUTPUT_JSON = path.join(__dirname, '..', 'public', 'data', 'damage-abilities-classified.json');

const abilities = require(INPUT_PATH);

// ============ 分类函数 ============
function classifyAbility(ability) {
    const keys = ability.damageKeys;
    const values = ability.abilityValues || {};
    const valueKeys = Object.keys(values).map(k => k.toLowerCase());

    // 无伤害值的特殊技能（白名单强制包含）
    if (keys.length === 0) {
        return 'special';
    }

    // 检查是否有 DoT 特征
    const hasDuration = valueKeys.some(k => k.includes('duration'));
    const hasTick = valueKeys.some(k => k.includes('tick') || k.includes('interval'));
    const hasDps = keys.some(k => k.toLowerCase().includes('dps') || k.toLowerCase().includes('per_second'));
    const hasBurn = keys.some(k => k.toLowerCase().includes('burn'));

    if ((hasDuration && hasTick) || hasDps || hasBurn) {
        return 'dot';
    }

    // 检查是否有多段伤害特征
    const hasWave = valueKeys.some(k => k.includes('wave') || k.includes('pulse'));
    const hasCount = valueKeys.some(k => k.includes('count') && !k.includes('cooldown'));
    const hasHit = valueKeys.some(k => k.includes('hit') && !k.includes('threshold'));

    if (hasWave || hasCount || hasHit) {
        return 'multi';
    }

    // 检查是否有百分比伤害
    const hasPct = keys.some(k => k.toLowerCase().includes('pct') || k.toLowerCase().includes('percent'));
    if (hasPct) {
        return 'percent';
    }

    // 多个 damageKey 的复杂技能
    if (keys.length >= 3) {
        return 'complex';
    }

    // 简单直接伤害
    return 'simple';
}

// ============ 执行分类 ============
const classified = {
    simple: [],
    dot: [],
    multi: [],
    percent: [],
    complex: [],
    special: []
};

abilities.forEach(a => {
    const type = classifyAbility(a);
    classified[type].push(a);
});

// ============ 生成 Markdown ============
const typeLabels = {
    simple: '简单直接伤害',
    dot: '持续伤害(DoT)',
    multi: '多段伤害',
    percent: '百分比伤害',
    complex: '复杂技能',
    special: '特殊技能（无damageValues）'
};

let md = `# 技能分类概览

> 自动生成于 ${new Date().toLocaleString('zh-CN')}
> 总技能数: ${abilities.length}
> **直接伤害** 列：✓ 表示是直接伤害技能，请审阅并修改

## 分类统计

| 分类 | 数量 | 占比 |
|------|------|------|
`;

Object.entries(classified).forEach(([type, list]) => {
    const pct = ((list.length / abilities.length) * 100).toFixed(1);
    md += `| ${typeLabels[type]} | ${list.length} | ${pct}% |\n`;
});

// 每个分类的完整列表
Object.entries(classified).forEach(([type, list]) => {
    md += `\n## ${typeLabels[type]} (${list.length}个)\n\n`;

    if (list.length === 0) {
        md += '无\n';
        return;
    }

    md += '| 英雄 | 技能 | 伤害类型 | damageKeys | 直接伤害 |\n';
    md += '|------|------|----------|------------|:--------:|\n';

    list.forEach(a => {
        const hero = a.heroNameZh || a.heroName;
        const name = a.nameZh || a.internalName;
        const dmgType = a.damageType || '-';
        const keys = a.damageKeys.join(', ') || '(无)';
        // 默认 simple 类型为 ✓，其他为空，用户可手动修改
        const isDirect = type === 'simple' ? '✓' : ' ';
        md += `| ${hero} | ${name} | ${dmgType} | ${keys} | ${isDirect} |\n`;
    });
});

// 保存 Markdown
fs.writeFileSync(OUTPUT_MD, md, 'utf-8');
console.log('已保存分类概览到:', OUTPUT_MD);

// 保存带分类的 JSON
const classifiedOutput = abilities.map(a => ({
    ...a,
    damageCategory: classifyAbility(a)
}));
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(classifiedOutput, null, 2), 'utf-8');
console.log('已保存分类数据到:', OUTPUT_JSON);

// 控制台简要统计
console.log('\n=== 分类统计 ===');
Object.entries(classified).forEach(([type, list]) => {
    console.log(`  ${typeLabels[type]}: ${list.length}`);
});
