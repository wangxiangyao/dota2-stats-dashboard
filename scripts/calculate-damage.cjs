/**
 * 解析伤害公式并计算各等级伤害
 * 
 * 使用方法: node scripts/calculate-damage.cjs [英雄名]
 * 示例: node scripts/calculate-damage.cjs 矮人直升机
 */

const fs = require('fs');
const path = require('path');

const ABILITIES_PATH = path.join(__dirname, '..', 'public', 'data', 'damage-abilities.json');
const FORMULAS_DIR = path.join(__dirname, '..', 'docs', 'damage-formulas');

const abilities = require(ABILITIES_PATH);

// 从命令行获取英雄名
const heroName = process.argv[2];
if (!heroName) {
    console.log('用法: node scripts/calculate-damage.cjs <英雄名>');
    console.log('示例: node scripts/calculate-damage.cjs 矮人直升机');
    process.exit(1);
}

// 读取 MD 文档并解析公式
function parseFormulaFromMD(heroName) {
    const mdPath = path.join(FORMULAS_DIR, `${heroName}.md`);
    if (!fs.existsSync(mdPath)) {
        console.error(`找不到文档: ${mdPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(mdPath, 'utf-8');
    const formulas = {};

    // 匹配每个技能块
    const skillBlocks = content.split(/^## /m).slice(1);

    skillBlocks.forEach(block => {
        // 提取技能名
        const nameMatch = block.match(/^(.+?)[\n\r]/);
        if (!nameMatch) return;
        const skillName = nameMatch[1].trim();

        // 提取内部名
        const internalMatch = block.match(/内部名\*\*:\s*`([^`]+)`/);
        if (!internalMatch) return;
        const internalName = internalMatch[1];

        // 提取公式
        const formulaMatch = block.match(/公式:\s*(.+)/);
        if (!formulaMatch) return;
        const formula = formulaMatch[1].trim();

        // 检查是否已审核
        const reviewed = block.includes('reviewed**: ✅');

        // 解析自定义参数 customParams
        const customParams = {};
        const customParamsMatch = block.match(/\*\*customParams\*\*:\s*([\s\S]*?)(?=\n\n|\n###|\n\*\*|$)/);
        if (customParamsMatch) {
            const paramsBlock = customParamsMatch[1];
            const paramLines = paramsBlock.match(/- `([^`]+)`:\s*(.+)/g) || [];
            paramLines.forEach(line => {
                const m = line.match(/- `([^`]+)`:\s*(.+)/);
                if (m) {
                    customParams[m[1]] = m[2].trim();
                }
            });
        }

        formulas[internalName] = {
            name: skillName,
            formula: formula,
            reviewed: reviewed,
            customParams: customParams
        };
    });

    return formulas;
}

// 从 abilityValues 中提取值
function extractValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return [val];
    if (typeof val === 'string') {
        // "8 14 20 26" -> [8, 14, 20, 26]
        return val.split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
    }
    if (typeof val === 'object' && val.value) {
        return extractValue(val.value);
    }
    return null;
}

// 计算公式
function calculateFormula(formula, abilityValues, level, customParams = {}) {
    // 将公式中的变量替换为实际值
    // 公式格式: $var1 × $var2 或 var1 × var2

    let expr = formula;

    // 合并 abilityValues 和 customParams，customParams 优先
    const allValues = { ...abilityValues };
    Object.entries(customParams).forEach(([key, val]) => {
        allValues[key] = val;
    });

    // 提取所有变量名并按长度降序排列（避免 damage 匹配到 damage_per_unit）
    const varPattern = /\$?([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const matches = [...formula.matchAll(varPattern)];
    const varNames = [...new Set(matches.map(m => m[1]))];

    for (const match of matches) {
        const varName = match[1];

        // 跳过运算符等
        if (['×', '*', '+', '-', '/', '(', ')'].includes(varName)) continue;

        const values = extractValue(allValues[varName]);
        if (values === null) {
            console.warn(`  警告: 找不到变量 ${varName}`);
            continue;
        }

        // 根据等级取值
        const value = values.length > 1 ? values[level] : values[0];

        // 替换变量
        expr = expr.replace(new RegExp(`\\$?${varName}`, 'g'), value);
    }

    // 替换 × 为 *
    expr = expr.replace(/×/g, '*');

    try {
        return eval(expr);
    } catch (e) {
        console.error(`  计算错误: ${expr}`);
        return null;
    }
}

// 主程序
console.log(`\n=== ${heroName} 伤害计算 ===\n`);

const formulas = parseFormulaFromMD(heroName);
const heroAbilities = abilities.filter(a => a.heroNameZh === heroName && a.isDamagePurpose);

heroAbilities.forEach(ability => {
    const formulaInfo = formulas[ability.internalName];

    console.log(`【${ability.nameZh}】`);
    console.log(`  内部名: ${ability.internalName}`);

    if (!formulaInfo) {
        console.log(`  ❌ 未找到公式定义`);
        return;
    }

    console.log(`  公式: ${formulaInfo.formula}`);
    console.log(`  审核: ${formulaInfo.reviewed ? '✅' : '❌'}`);

    // 计算各等级伤害
    // 优先从 customParams 检测等级数，否则从 damageValues 取最大长度
    let levelCount = 4; // 默认值

    // 检查 customParams 中是否有数组
    const customParamValues = Object.values(formulaInfo.customParams || {});
    for (const val of customParamValues) {
        const parsed = String(val).split(/[\s\/]+/).filter(v => v && !isNaN(parseFloat(v)));
        if (parsed.length > 1) {
            levelCount = parsed.length;
            break;
        }
    }

    // 如果 customParams 没有多级值，从 damageValues 取最大长度
    if (levelCount === 4 && ability.damageValues) {
        const maxLen = Math.max(...ability.damageValues.map(arr => arr?.length || 0));
        if (maxLen > 0) levelCount = maxLen;
    }

    const results = [];

    for (let level = 0; level < levelCount; level++) {
        const damage = calculateFormula(formulaInfo.formula, ability.abilityValues, level, formulaInfo.customParams);
        results.push(damage);
    }

    console.log(`  各等级伤害: ${results.join(' / ')}`);
    console.log('');
});
