/**
 * 从 Dota2 原始数据生成物品数据
 * 
 * 输入:
 *   - public/source/items.txt (从 VPK 提取的原始物品数据)
 *   - public/data/translations/item-names.json (物品中文名映射，可选)
 * 
 * 输出:
 *   - public/data/items/items.json (最终的物品数据)
 * 
 * 使用方法:
 *   1. 用 Source 2 Viewer 从 Dota2 VPK 提取 scripts/npc/items.txt
 *   2. 将提取的文件放到 public/source/items.txt
 *   3. 运行 node scripts/parse-items.cjs
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const SOURCE_FILE = path.join(__dirname, '..', 'public', 'source', 'items.txt');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const TRANSLATIONS_DIR = path.join(DATA_DIR, 'translations');
const OUTPUT_PATH = path.join(DATA_DIR, 'items', 'items.json');

/**
 * 加载中文映射文件
 */
function loadTranslations() {
    let itemNames = {};

    try {
        // 从 items/translations/item-names.json 读取翻译
        const itemTranslationsPath = path.join(DATA_DIR, 'items', 'translations', 'item-names.json');
        itemNames = require(itemTranslationsPath);
    } catch (e) {
        console.warn('警告: 未找到物品中文映射文件，将跳过物品汉化');
    }

    return { itemNames };
}

/**
 * 解析 Valve KeyValue 格式
 */
function parseKeyValue(content) {
    // 移除注释
    const cleanContent = content.replace(/\/\/.*$/gm, '');

    // 提取 token
    const tokens = cleanContent.match(/"[^"]*"|{|}/g);
    if (!tokens) return {};

    const stack = [{}];
    let lastKey = null;

    for (const token of tokens) {
        if (token === '{') {
            if (lastKey !== null) {
                const nextObj = {};
                stack[stack.length - 1][lastKey] = nextObj;
                stack.push(nextObj);
                lastKey = null;
            }
        } else if (token === '}') {
            if (stack.length > 1) stack.pop();
        } else {
            const val = token.slice(1, -1);
            if (lastKey === null) {
                lastKey = val;
            } else {
                stack[stack.length - 1][lastKey] = val;
                lastKey = null;
            }
        }
    }

    return stack[0];
}

/**
 * 判断是否为合成卷轴
 */
function isRecipeItem(name, data) {
    return name.startsWith('item_recipe_') || data.ItemRecipe === '1';
}

/**
 * 判断是否为废弃/不可购买物品
 */
function isObsoleteItem(data) {
    return data.IsObsolete === '1' || data.ItemPurchasable === '0';
}

/**
 * 判断是否为中立物品
 */
function isNeutralItem(data) {
    // 中立物品通常 cost = 0 且有特殊标记
    const cost = parseInt(data.ItemCost) || 0;
    const quality = data.ItemQuality || '';
    // 判断逻辑：cost=0 且不是消耗品/特殊物品，通常是中立物品
    // 更准确的判断可能需要检查 ItemIsNeutralDrop
    return cost === 0 && !['consumable', 'artifact'].includes(quality);
}

/**
 * 提取物品属性值
 */
function extractAttributes(data) {
    const attrs = {};
    const abilityValues = data.AbilityValues;

    if (abilityValues && typeof abilityValues === 'object') {
        for (const [key, val] of Object.entries(abilityValues)) {
            if (typeof val === 'string') {
                // 尝试解析数字
                const num = parseFloat(val);
                attrs[key] = isNaN(num) ? val : num;
            } else if (typeof val === 'object' && val.value) {
                const num = parseFloat(val.value);
                attrs[key] = isNaN(num) ? val.value : num;
            }
        }
    }

    return attrs;
}

/**
 * 提取合成材料
 */
function extractComponents(data) {
    const reqs = data.ItemRequirements;
    if (!reqs || typeof reqs !== 'object') return null;

    // ItemRequirements 格式: { "01": "item_xxx;item_yyy", ... }
    const components = [];
    for (const reqStr of Object.values(reqs)) {
        if (typeof reqStr === 'string') {
            const items = reqStr.split(';').map(s => s.trim().replace('*', ''));
            components.push(...items);
        }
    }
    return components.length > 0 ? components : null;
}

/**
 * 解析物品数据（第一遍：收集所有物品和卷轴）
 */
function parseItems(content, translations) {
    const parsed = parseKeyValue(content);
    const items = parsed.DOTAAbilities || parsed;
    const actualItems = [];
    const recipes = []; // 卷轴信息：{ result, components, cost }

    for (const [name, data] of Object.entries(items)) {
        // 跳过非物品条目
        if (name === 'Version' || typeof data !== 'object') continue;
        if (!name.startsWith('item_')) continue;

        const isRecipe = isRecipeItem(name, data);
        const isObsolete = isObsoleteItem(data);

        // 收集卷轴信息
        if (isRecipe) {
            const result = data.ItemResult; // 合成后的物品名
            const components = extractComponents(data);
            const cost = parseInt(data.ItemCost) || 0;
            if (result) {
                recipes.push({ result, components, cost });
            }
            continue; // 跳过卷轴，不加入物品列表
        }

        // 跳过废弃物品
        if (isObsolete) continue;

        // 获取物品汉化（翻译文件的键名不含 item_ 前缀）
        const itemKey = name.replace('item_', '');
        const itemInfo = translations.itemNames[itemKey] || {};

        const cost = parseInt(data.ItemCost) || 0;
        const cooldown = parseFloat(data.AbilityCooldown) || 0;
        const manaCost = parseInt(data.AbilityManaCost) || 0;

        actualItems.push({
            // 基本信息
            name: name,
            displayName: itemInfo.zh || itemInfo.en || name.replace('item_', '').replace(/_/g, ' '),
            nameEn: itemInfo.en || null,
            nameZh: itemInfo.zh || null,

            // 搜索别名
            aliases: itemInfo.aliases || null,
            pinyinAliases: itemInfo.pinyinAliases || null,

            // 核心属性
            cost,
            cooldown,
            manaCost,

            // 分类
            quality: data.ItemQuality || null,
            shopTags: data.ItemShopTags ? data.ItemShopTags.split(';') : [],
            isObsolete: false,
            secretShop: data.SecretShop === '1',

            // 物品属性
            attributes: extractAttributes(data),

            // 配方信息（后续从卷轴中关联）
            components: null,
            recipeCost: 0,

            // 原始行为数据
            behavior: data.AbilityBehavior || null,
            castRange: parseInt(data.AbilityCastRange) || null,

            // 预留特征字段
            traits: {}
        });
    }

    // 关联配方信息到物品
    for (const recipe of recipes) {
        const item = actualItems.find(i => i.name === recipe.result);
        if (item) {
            item.components = recipe.components;
            item.recipeCost = recipe.cost;
        }
    }

    return { actualItems, recipes };
}

/**
 * 主函数
 */
async function main() {
    console.log('=== Dota2 物品数据生成工具 ===\n');

    // 检查源文件
    if (!fs.existsSync(SOURCE_FILE)) {
        console.error('错误: 找不到源数据文件:', SOURCE_FILE);
        console.log('请先用 Source 2 Viewer 提取 VPK 中的 scripts/npc/items.txt');
        process.exit(1);
    }

    // 加载中文映射
    const translations = loadTranslations();
    console.log('物品汉化映射:', Object.keys(translations.itemNames).length);

    // 解析物品数据
    const content = fs.readFileSync(SOURCE_FILE, 'utf-8');
    const { actualItems, recipes } = parseItems(content, translations);

    console.log('\n=== 生成结果 ===');
    console.log('实际物品:', actualItems.length);
    console.log('合成卷轴:', recipes.length);

    // 统计
    const withCost = actualItems.filter(i => i.cost > 0);
    const withComponents = actualItems.filter(i => i.components !== null);
    const neutralItems = actualItems.filter(i => i.cost === 0);
    console.log('有价格的物品:', withCost.length);
    console.log('有配方的物品:', withComponents.length);
    console.log('中立/特殊物品:', neutralItems.length);

    // 确保输出目录存在
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存结果
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(actualItems, null, 2), 'utf-8');
    console.log('\n已保存到:', OUTPUT_PATH);

    const stats = fs.statSync(OUTPUT_PATH);
    console.log('文件大小:', (stats.size / 1024).toFixed(2), 'KB');

    // 验证 - 检查一个有配方的物品
    const arcaneBlink = actualItems.find(i => i.name === 'item_arcane_blink');
    if (arcaneBlink) {
        console.log('\n=== 验证：奥术闪烁 ===');
        console.log('name:', arcaneBlink.name);
        console.log('cost:', arcaneBlink.cost);
        console.log('components:', arcaneBlink.components);
        console.log('recipeCost:', arcaneBlink.recipeCost);
    }

    // 验证基础物品
    const blink = actualItems.find(i => i.name === 'item_blink');
    if (blink) {
        console.log('\n=== 验证：跳刀（基础物品）===');
        console.log('name:', blink.name);
        console.log('cost:', blink.cost);
        console.log('components:', blink.components);
        console.log('recipeCost:', blink.recipeCost);
    }
}

main();

