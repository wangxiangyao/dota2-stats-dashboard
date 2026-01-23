#!/usr/bin/env node
/**
 * split-mapdata.cjs - 将 mapdata.json 按实体类型拆分为独立文件
 * 
 * 用法:
 *   node scripts/split-mapdata.cjs
 *   node scripts/split-mapdata.cjs --version 7.40b
 * 
 * 输出:
 *   public/data/world/entities/
 *     ├── trees.json              # ent_dota_tree
 *     ├── neutral-spawners.json   # npc_dota_neutral_spawner
 *     ├── towers.json             # npc_dota_tower
 *     ├── forts.json              # npc_dota_fort
 *     ├── fountains.json          # ent_dota_fountain
 *     └── outposts.json           # npc_dota_watch_tower
 *   public/data/world/custom/
 *     └── neutral-camp-types.json # 野怪营地类型模板（需手动编辑）
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG_PATH = path.join(__dirname, 'config.json');
const DEFAULT_VERSION = '7.40b';

// 实体类型映射
const ENTITY_MAPPING = {
    'ent_dota_tree': 'trees.json',
    'npc_dota_neutral_spawner': 'neutral-spawners.json',
    'npc_dota_tower': 'towers.json',
    'npc_dota_fort': 'forts.json',
    'ent_dota_fountain': 'fountains.json',
    'npc_dota_watch_tower': 'outposts.json',
    // 新增实体类型
    'npc_dota_healer': 'shrines.json',                      // 经验神龛
    'dota_item_rune_spawner_bounty': 'runes-bounty.json',   // 赏金符
    'dota_item_rune_spawner_powerup': 'runes-power.json',   // 能量符
    'npc_dota_roshan_spawner': 'roshan.json',               // 肉山
    'npc_dota_barracks': 'barracks.json',                   // 兵营
    'ent_dota_shop': 'shops.json'                           // 商店
};

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
    return { defaultVersion: DEFAULT_VERSION };
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function main() {
    const args = process.argv.slice(2);
    const versionIndex = args.indexOf('--version');
    const config = loadConfig();
    const version = versionIndex !== -1 ? args[versionIndex + 1] : config.defaultVersion;

    console.log('='.repeat(60));
    console.log('拆分 mapdata.json 为独立实体文件');
    console.log('='.repeat(60));
    console.log();

    const projectRoot = path.join(__dirname, '..');
    const sourceFile = path.join(projectRoot, 'public', 'data', 'map', version, 'mapdata.json');
    const entitiesDir = path.join(projectRoot, 'public', 'data', 'world', 'entities');
    const customDir = path.join(projectRoot, 'public', 'data', 'world', 'custom');

    // 检查源文件
    if (!fs.existsSync(sourceFile)) {
        console.error(`错误: 源文件不存在: ${sourceFile}`);
        console.error('请先运行 pull-map-data.cjs 拉取数据');
        process.exit(1);
    }

    // 读取 mapdata.json
    console.log(`读取: ${sourceFile}`);
    const mapdata = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
    const data = mapdata.data || mapdata;

    // 创建输出目录
    ensureDir(entitiesDir);
    ensureDir(customDir);

    // 拆分并保存各实体类型
    console.log();
    console.log('拆分实体数据...');

    for (const [entityType, fileName] of Object.entries(ENTITY_MAPPING)) {
        const entities = data[entityType];
        if (entities && entities.length > 0) {
            const outputPath = path.join(entitiesDir, fileName);
            writeJson(outputPath, {
                meta: {
                    source: 'mapdata.json',
                    entityType: entityType,
                    version: version,
                    extractedAt: new Date().toISOString()
                },
                data: entities
            });
            console.log(`  ✓ ${fileName} (${entities.length} 个)`);
        } else {
            console.log(`  ✗ ${fileName} (无数据)`);
        }
    }

    // 生成野怪营地类型模板
    console.log();
    console.log('生成野怪营地类型模板...');

    const spawners = data['npc_dota_neutral_spawner'] || [];
    const campTypesPath = path.join(customDir, 'neutral-camp-types.json');

    // 检查是否已存在（避免覆盖手动编辑的数据）
    if (fs.existsSync(campTypesPath)) {
        console.log(`  ~ neutral-camp-types.json (已存在，跳过)`);
    } else {
        const campTypes = {
            meta: {
                description: '野怪营地类型标注（需手动编辑）',
                types: ['small', 'medium', 'large', 'ancient'],
                version: version,
                createdAt: new Date().toISOString()
            },
            camps: spawners.map((s, i) => ({
                id: i + 1,
                x: s.x,
                y: s.y,
                type: null,  // 需手动填写: 'small' | 'medium' | 'large' | 'ancient'
                note: ''     // 可选备注
            }))
        };
        writeJson(campTypesPath, campTypes);
        console.log(`  ✓ neutral-camp-types.json (${spawners.length} 个营地待标注)`);
    }

    console.log();
    console.log('='.repeat(60));
    console.log('完成！');
    console.log(`实体数据: ${entitiesDir}`);
    console.log(`自定义数据: ${customDir}`);
    console.log('='.repeat(60));
    console.log();
    console.log('下一步: 编辑 neutral-camp-types.json，为每个营地填写 type 字段');
}

main();
