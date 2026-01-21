/**
 * 从 abilities_schinese.txt 中提取物品翻译和搜索别名
 * 生成 item-names.json，参照 ability-names.json 的结构
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const SOURCE_FILE = path.join(__dirname, '../public/source/abilities_schinese.txt');
const ITEMS_FILE = path.join(__dirname, '../public/data/items/items.json');
const OUTPUT_DIR = path.join(__dirname, '../public/data/items/translations');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'item-names.json');

// 读取翻译源文件
const sourceContent = fs.readFileSync(SOURCE_FILE, 'utf-8');

// 读取物品列表
const items = JSON.parse(fs.readFileSync(ITEMS_FILE, 'utf-8'));

// 解析翻译文件，提取物品翻译
// 格式: "DOTA_Tooltip_Ability_item_xxx"    "中文名"
const translations = {};

// 匹配物品翻译的正则表达式
const itemTranslationRegex = /"DOTA_Tooltip_Ability_(item_[a-z0-9_]+)"\s+"([^"]+)"/g;

let match;
while ((match = itemTranslationRegex.exec(sourceContent)) !== null) {
    const key = match[1]; // item_xxx
    const zhName = match[2];

    // 只保留基础物品名称翻译，跳过描述、配方等
    if (!key.includes('_Description') &&
        !key.includes('_Note') &&
        !key.includes('_Lore') &&
        !key.includes('_bonus_') &&
        !key.includes('_special_')) {
        translations[key] = zhName;
    }
}

console.log(`从翻译文件中提取了 ${Object.keys(translations).length} 个物品翻译条目`);

// 解析搜索别名
// 格式: "DOTA_SearchAlias_Ability_item_xxx"    "别名1;别名2;..."
const searchAliases = {};
const searchAliasRegex = /"DOTA_SearchAlias_Ability_(item_[a-z0-9_]+)"\s+"([^"]+)"/g;

while ((match = searchAliasRegex.exec(sourceContent)) !== null) {
    const key = match[1]; // item_xxx
    const aliases = match[2]; // "别名1;别名2;..."
    searchAliases[key] = aliases;
}

console.log(`从翻译文件中提取了 ${Object.keys(searchAliases).length} 个搜索别名条目`);

// 构建输出结构
const itemNamesJson = {};

for (const item of items) {
    const itemName = item.name; // item_blink
    const displayName = item.displayName;

    // 查找中文翻译
    const zhName = translations[itemName];

    if (zhName) {
        // 去掉 item_ 前缀作为键名
        const keyName = itemName.replace('item_', '');

        // 处理搜索别名：分离拼音和中文
        const aliasStr = searchAliases[itemName] || '';
        const allAliases = aliasStr.split(';').filter(a => a.trim());

        // 分离中文和拼音别名
        const zhAliases = allAliases.filter(a => /[\u4e00-\u9fa5]/.test(a));
        const pinyinAliases = allAliases.filter(a => !/[\u4e00-\u9fa5]/.test(a));

        itemNamesJson[keyName] = {
            zh: zhName,
            en: displayName ? displayName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : keyName.replace(/_/g, ' '),
            aliases: zhAliases.length > 0 ? zhAliases : null,
            pinyinAliases: pinyinAliases.length > 0 ? pinyinAliases : null
        };
    }
}

console.log(`成功匹配 ${Object.keys(itemNamesJson).length} / ${items.length} 个物品的翻译`);

// 统计有别名的物品
const withAliases = Object.values(itemNamesJson).filter(v => v.aliases && v.aliases.length > 0).length;
console.log(`有中文别名的物品: ${withAliases}`);

// 列出未匹配的物品
const unmatchedItems = items.filter(item => !translations[item.name]);
if (unmatchedItems.length > 0) {
    console.log('\n未匹配翻译的物品:');
    unmatchedItems.forEach(item => {
        console.log(`  - ${item.name}`);
    });
}

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 写入输出文件
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(itemNamesJson, null, 2), 'utf-8');

console.log(`\n物品翻译已保存到: ${OUTPUT_FILE}`);
