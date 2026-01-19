/**
 * 从 Dota2 原始数据生成技能数据
 * 
 * 输入:
 *   - public/source/heroes/*.txt (从 VPK 提取的原始英雄技能数据)
 *   - public/data/translations/ability-names.json (技能中文名映射)
 *   - public/data/translations/hero-names.json (英雄中文名映射)
 * 
 * 输出:
 *   - public/data/abilities.json (最终的技能数据)
 * 
 * 使用方法:
 *   1. 用 Source 2 Viewer 从 Dota2 VPK 提取 scripts/npc/heroes 目录
 *   2. 将提取的文件放到 public/source/heroes/
 *   3. 运行 node scripts/parse-valve-data.cjs
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const SOURCE_DIR = path.join(__dirname, '..', 'public', 'source', 'heroes');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const TRANSLATIONS_DIR = path.join(DATA_DIR, 'translations');
const OUTPUT_PATH = path.join(DATA_DIR, 'abilities.json');

/**
 * 加载中文映射文件
 */
function loadTranslations() {
    let abilityNames = {};
    let heroNames = {};

    try {
        abilityNames = require(path.join(TRANSLATIONS_DIR, 'ability-names.json'));
    } catch (e) {
        console.warn('警告: 未找到技能中文映射文件，将跳过技能汉化');
    }

    try {
        heroNames = require(path.join(TRANSLATIONS_DIR, 'hero-names.json'));
    } catch (e) {
        console.warn('警告: 未找到英雄中文映射文件，将跳过英雄汉化');
    }

    return { abilityNames, heroNames };
}

/**
 * 解析 Valve KeyValue 格式
 * 使用基于 token 的解析器，避免逐行正则表达式导致的堆栈不同步问题
 * (修复键名后跟行内注释如 "key" // comment 导致的解析失败)
 */
function parseKeyValue(content) {
    // 1. 先移除所有注释（行内和整行）
    const cleanContent = content.replace(/\/\/.*$/gm, '');

    // 2. 使用正则提取所有 token：带引号的字符串 或 大括号
    const tokens = cleanContent.match(/"[^"]*"|{|}/g);
    if (!tokens) return {};

    // 3. 基于 token 迭代解析
    const stack = [{}];
    let lastKey = null;

    for (const token of tokens) {
        if (token === '{') {
            // 遇到 { 时，如果有等待的 key，创建新对象并压栈
            if (lastKey !== null) {
                const nextObj = {};
                stack[stack.length - 1][lastKey] = nextObj;
                stack.push(nextObj);
                lastKey = null;
            }
        } else if (token === '}') {
            // 遇到 } 时弹栈（保留至少一个根对象）
            if (stack.length > 1) stack.pop();
        } else {
            // 带引号的字符串：去掉首尾引号
            const val = token.slice(1, -1);
            if (lastKey === null) {
                // 还没有 key，这个 token 就是 key
                lastKey = val;
            } else {
                // 已有 key，这个 token 是 value
                stack[stack.length - 1][lastKey] = val;
                lastKey = null;
            }
        }
    }

    return stack[0];
}

/**
 * 从 AbilityValues 中提取伤害相关的值
 */
function extractDamageValues(ability) {
    const damageKeys = [];
    const damageValues = [];

    // 检查 AbilityDamage 字段
    if (ability.AbilityDamage && ability.AbilityDamage !== '0' && ability.AbilityDamage !== '0 0 0 0') {
        damageKeys.push('AbilityDamage');
        damageValues.push(ability.AbilityDamage.split(/\s+/).map(v => parseFloat(v) || 0));
    }

    // 检查 AbilityValues 中的伤害相关字段
    if (ability.AbilityValues && typeof ability.AbilityValues === 'object') {
        const damagePatterns = [/damage/i, /^dps$/i, /burn_amount/i, /explosion/i];

        for (const [key, val] of Object.entries(ability.AbilityValues)) {
            // 排除非直接伤害字段
            const keyLower = key.toLowerCase();
            if (keyLower.includes('reduction') ||
                keyLower.includes('tooltip') ||
                keyLower.includes('duration') ||
                keyLower.includes('bonus_damage') ||      // 攻击力加成
                keyLower.includes('bonus_attack_damage') || // 攻击力加成
                keyLower.includes('damage_pct') ||        // 伤害百分比加成
                keyLower.includes('damage_multiplier') || // 伤害倍率
                keyLower.includes('damage_amp')) {        // 伤害增幅
                continue;
            }

            const isDamageKey = damagePatterns.some(p => p.test(key));
            if (!isDamageKey) continue;

            let values = null;
            if (typeof val === 'string') {
                values = val.split(/\s+/).map(v => parseFloat(v) || 0);
            } else if (typeof val === 'object' && val.value) {
                values = val.value.split(/\s+/).map(v => parseFloat(v) || 0);
            }

            if (values && values.some(v => v > 0)) {
                damageKeys.push(key);
                damageValues.push(values);
            }
        }
    }

    return { damageKeys, damageValues };
}

/**
 * 解析单个英雄文件
 */
function parseHeroFile(filePath, heroName, translations) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseKeyValue(content);
    const abilities = parsed.DOTAAbilities || parsed;
    const heroAbilities = [];

    // 获取英雄汉化
    const heroInfo = translations.heroNames[heroName] || {};

    for (const [name, data] of Object.entries(abilities)) {
        if (name === 'Version' || typeof data !== 'object') continue;

        // 排除天赋修改器（special_bonus_*），这些是内部天赋系统标记
        if (name.startsWith('special_bonus_')) continue;

        const behavior = data.AbilityBehavior || '';
        // HIDDEN 技能除非有 INNATE_UI 或 SHOW_IN_GUIDES 标记，否则过滤掉
        if (behavior.includes('HIDDEN') && !behavior.includes('INNATE_UI') && !behavior.includes('SHOW_IN_GUIDES')) continue;

        const isUltimate = data.AbilityType === 'ABILITY_TYPE_ULTIMATE';
        const isPassive = behavior === 'DOTA_ABILITY_BEHAVIOR_PASSIVE';
        const isInnate = data.Innate === '1';

        const { damageKeys, damageValues } = extractDamageValues(data);

        // 获取技能汉化
        const abilityInfo = translations.abilityNames[name] || {};

        heroAbilities.push({
            internalName: name,
            // 汉化名称
            name: abilityInfo.en || null,
            nameZh: abilityInfo.zh || null,
            heroName: heroName,
            heroNameZh: heroInfo.zh || null,
            heroNameEn: heroInfo.en || null,
            // 技能类型
            damageType: data.AbilityUnitDamageType?.replace('DAMAGE_TYPE_', '') || null,
            behavior: behavior,
            targetTeam: data.AbilityUnitTargetTeam?.replace('DOTA_UNIT_TARGET_TEAM_', '') || null,
            isUltimate,
            isPassive,
            isInnate,
            // 基础属性
            cooldown: data.AbilityCooldown || data.AbilityValues?.AbilityCooldown?.value || null,
            manaCost: data.AbilityManaCost || null,
            castRange: data.AbilityCastRange || null,
            castPoint: data.AbilityCastPoint || null,
            channelTime: data.AbilityChannelTime || null,
            duration: data.AbilityDuration || null,
            // 伤害相关
            abilityDamage: data.AbilityDamage || null,
            damageKeys,
            damageValues,
            // 升级相关
            hasScepterUpgrade: data.HasScepterUpgrade === '1',
            hasShardUpgrade: data.HasShardUpgrade === '1',
            isGrantedByShard: data.IsGrantedByShard === '1',
            isGrantedByScepter: data.IsGrantedByScepter === '1',
            // 技能免疫相关
            spellImmunityType: data.SpellImmunityType?.replace('SPELL_IMMUNITY_', '') || null,
            spellDispellableType: data.SpellDispellableType?.replace('SPELL_DISPELLABLE_', '') || null,
            // 完整 AbilityValues
            abilityValues: data.AbilityValues || null
        });
    }

    return heroAbilities;
}

/**
 * 主函数
 */
async function main() {
    console.log('=== Dota2 技能数据生成工具 ===\n');

    // 检查源目录
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error('错误: 找不到源数据目录:', SOURCE_DIR);
        console.log('请先用 Source 2 Viewer 提取 VPK 中的 scripts/npc/heroes 目录');
        process.exit(1);
    }

    // 加载中文映射
    const translations = loadTranslations();
    console.log('技能汉化映射:', Object.keys(translations.abilityNames).length);
    console.log('英雄汉化映射:', Object.keys(translations.heroNames).length);

    // 解析所有英雄文件
    const heroFiles = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.txt'));
    console.log('英雄文件数:', heroFiles.length, '\n');

    const allAbilities = [];
    let matchedAbilityNames = 0;
    let matchedHeroNames = 0;

    for (const file of heroFiles) {
        const heroName = file.replace('npc_dota_hero_', '').replace('.txt', '');
        const filePath = path.join(SOURCE_DIR, file);

        try {
            const abilities = parseHeroFile(filePath, heroName, translations);
            for (const ability of abilities) {
                if (ability.nameZh) matchedAbilityNames++;
                if (ability.heroNameZh) matchedHeroNames++;
                allAbilities.push(ability);
            }
        } catch (err) {
            console.error(`解析失败: ${file}:`, err.message);
        }
    }

    console.log('=== 生成结果 ===');
    console.log('总技能数:', allAbilities.length);
    console.log('技能中文名匹配:', matchedAbilityNames, '/', allAbilities.length);
    console.log('英雄中文名匹配:', matchedHeroNames, '/', allAbilities.length);

    // 统计有伤害值的技能
    const withDamage = allAbilities.filter(a => a.damageValues.length > 0);
    console.log('有伤害值的技能:', withDamage.length);

    // 保存结果
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allAbilities, null, 2), 'utf-8');
    console.log('\n已保存到:', OUTPUT_PATH);

    const stats = fs.statSync(OUTPUT_PATH);
    console.log('文件大小:', (stats.size / 1024).toFixed(2), 'KB');

    // 验证
    const ravage = allAbilities.find(a => a.internalName === 'tidehunter_ravage');
    if (ravage) {
        console.log('\n=== 验证：潮汐毁灭 ===');
        console.log('name:', ravage.name);
        console.log('nameZh:', ravage.nameZh);
        console.log('heroNameZh:', ravage.heroNameZh);
        console.log('damageValues:', ravage.damageValues);
    }
}

main();
