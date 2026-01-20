const fs = require('fs');
const path = require('path');

const FORMULAS_DIR = path.join(__dirname, '..', 'docs', 'damage-formulas');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'damage-formulas-config.json');

// 解析 Markdown 文件提取公式
function parseFormulasFromMD(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const formulas = {};

    // 按技能块分割
    const skillBlocks = content.split(/^## /m).slice(1);

    skillBlocks.forEach(block => {
        const lines = block.split('\n');
        const skillName = lines[0].trim();

        // 提取 internalName
        const internalNameMatch = block.match(/\*\*内部名\*\*:\s*`([^`]+)`/);
        if (!internalNameMatch) return;
        const internalName = internalNameMatch[1];

        // 提取 damageType
        const damageTypeMatch = block.match(/\*\*伤害类型\*\*:\s*(\w+)/);
        const damageType = damageTypeMatch ? damageTypeMatch[1] : null;

        // 提取公式
        const formulaMatch = block.match(/公式:\s*(.+?)(?:\n|等效伤害类型)/s);
        let formula = formulaMatch ? formulaMatch[1].trim() : null;

        // 提取等效伤害类型
        const effectiveTypeMatch = block.match(/等效伤害类型:\s*(\w+)/);
        const effectiveType = effectiveTypeMatch ? effectiveTypeMatch[1] : damageType;

        // 提取 customParams
        const customParamsMatch = block.match(/\*\*customParams\*\*:\s*([\s\S]*?)(?=###|$)/);
        let customParams = {};
        if (customParamsMatch) {
            const paramsBlock = customParamsMatch[1];
            const paramLines = paramsBlock.match(/`([^`]+)`:\s*(.+)/g);
            if (paramLines) {
                paramLines.forEach(line => {
                    const match = line.match(/`([^`]+)`:\s*(.+)/);
                    if (match) {
                        customParams[match[1]] = match[2].trim();
                    }
                });
            }
        }

        // 提取 abilityValues (完整参数)
        const abilityValuesMatch = block.match(/\*\*abilityValues\*\* \(完整参数\):\s*([\s\S]*?)(?=\*\*customParams\*\*|### 公式定义)/);
        let abilityValues = {};
        if (abilityValuesMatch) {
            const valuesBlock = abilityValuesMatch[1];
            const valueLines = valuesBlock.match(/`([^`]+)`:\s*(.+)/g);
            if (valueLines) {
                valueLines.forEach(line => {
                    const match = line.match(/`([^`]+)`:\s*(.+)/);
                    if (match) {
                        const key = match[1];
                        const val = match[2].trim();
                        // 跳过 [object Object] 类型的值
                        if (val !== '[object Object]') {
                            abilityValues[key] = val;
                        }
                    }
                });
            }
        }

        // 提取备注
        const notesMatch = block.match(/\*\*备注\*\*:\s*(.+)/);
        const notes = notesMatch && notesMatch[1].trim() !== '-' ? notesMatch[1].trim() : null;

        // 提取 reviewed 状态
        const reviewedMatch = block.match(/\*\*reviewed\*\*:\s*(✅|❌)/);
        const reviewed = reviewedMatch ? reviewedMatch[1] === '✅' : false;

        // 只提取已审核的公式
        if (!reviewed) return;

        formulas[internalName] = {
            nameZh: skillName,
            damageType: damageType,
            effectiveType: effectiveType,
            formulaMin: null,
            formulaExpected: formula,
            formulaMax: null,
            abilityValues: Object.keys(abilityValues).length > 0 ? abilityValues : null,
            customParams: Object.keys(customParams).length > 0 ? customParams : null,
            notes: notes,
            reviewed: reviewed
        };
    });

    return formulas;
}

// 主程序
const allFormulas = {};

// 遍历所有 MD 文件
const files = fs.readdirSync(FORMULAS_DIR).filter(f => f.endsWith('.md'));

files.forEach(file => {
    const filePath = path.join(FORMULAS_DIR, file);
    const formulas = parseFormulasFromMD(filePath);
    Object.assign(allFormulas, formulas);
});

// 按 internalName 排序
const sortedFormulas = {};
Object.keys(allFormulas).sort().forEach(key => {
    sortedFormulas[key] = allFormulas[key];
});

// 写入 JSON
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortedFormulas, null, 2), 'utf-8');

console.log(`✅ 已提取 ${Object.keys(sortedFormulas).length} 个技能公式到: ${OUTPUT_PATH}`);
