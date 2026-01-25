#!/usr/bin/env node
/**
 * pull-map-data.cjs - 从 dota-map-coordinates 项目拉取地图数据
 * 
 * 用法:
 *   node scripts/pull-map-data.cjs
 *   node scripts/pull-map-data.cjs --version 7.40b
 * 
 * 配置:
 *   在 scripts/config.json 中设置 dota-map-coordinates 项目路径
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG_PATH = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
    mapCoordinatesPath: 'D:\\02_projects\\Dota\\dota-map-coordinates',
    defaultVersion: '7.40b'
};

// 需要拉取的文件（只拉取实际使用的）
const FILES_TO_PULL = {
    // 从 data/<version>/processed/ 拉取的 JSON 文件
    processed: [
        'vision_data.json'    // 视野系统数据（高度、树木、阻挡点）
    ],
    // 从 data/<version>/parsed/ 拉取的 JSON 文件
    parsed: [
        'worlddata.json'      // 世界边界数据
    ],
    // 从 data/<version>/parsed/entities/ 拉取的实体 JSON 文件
    entities: [
        'ent_dota_tree.json',               // 树木
        'npc_dota_tower.json',              // 防御塔
        'npc_dota_neutral_spawner.json',    // 野怪点
        'trigger_no_wards.json',            // 禁眼区
        'ent_dota_fountain.json',           // 泉水
        'npc_dota_fort.json',               // 基地
        'npc_dota_watch_tower.json',        // 前哨
        'dota_item_rune_spawner_powerup.json',  // 神力符
        'dota_item_rune_spawner_bounty.json',   // 赏金符
        '_index.json'                       // 实体索引
    ],
    // 从 data/<version>/img/ 拉取的图片文件
    images: [
        'elevation.png',       // 地势图
        'gridnav.png',         // 导航网格
        'minimap_accurate.png' // 精确小地图
    ]
};

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...config };
    }
    // 创建默认配置文件
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    console.log(`已创建默认配置文件: ${CONFIG_PATH}`);
    return DEFAULT_CONFIG;
}

function copyFile(src, dst) {
    const dstDir = path.dirname(dst);
    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
    }
    fs.copyFileSync(src, dst);
}

function main() {
    const args = process.argv.slice(2);
    const versionIndex = args.indexOf('--version');

    const config = loadConfig();
    const version = versionIndex !== -1 ? args[versionIndex + 1] : config.defaultVersion;

    console.log('='.repeat(60));
    console.log('从 dota-map-coordinates 拉取地图数据');
    console.log('='.repeat(60));
    console.log();
    console.log(`源项目: ${config.mapCoordinatesPath}`);
    console.log(`版本: ${version}`);
    console.log();

    // 验证源项目存在
    if (!fs.existsSync(config.mapCoordinatesPath)) {
        console.error(`错误: 源项目不存在: ${config.mapCoordinatesPath}`);
        console.error('请在 scripts/config.json 中配置正确的 mapCoordinatesPath');
        process.exit(1);
    }

    const projectRoot = path.join(__dirname, '..');
    const targetDataDir = path.join(projectRoot, 'public', 'data', 'map', version);
    const targetEntitiesDir = path.join(targetDataDir, 'entities');
    const targetImgDir = path.join(projectRoot, 'public', 'images', 'map', version);

    // 源目录
    const srcDataDir = path.join(config.mapCoordinatesPath, 'data', version);
    const srcParsedDir = path.join(srcDataDir, 'parsed');
    const srcProcessedDir = path.join(srcDataDir, 'processed');
    const srcEntitiesDir = path.join(srcParsedDir, 'entities');
    const srcImgDir = path.join(srcDataDir, 'img');  // 注意：现在在 data/<version>/img/

    // 拉取 JSON 数据文件
    console.log('拉取 JSON 数据文件...');

    // 从 processed 目录拉取
    for (const file of FILES_TO_PULL.processed) {
        const srcPath = path.join(srcProcessedDir, file);
        const dstPath = path.join(targetDataDir, file);

        if (fs.existsSync(srcPath)) {
            copyFile(srcPath, dstPath);
            console.log(`  ✓ ${file}`);
        } else {
            console.log(`  ✗ ${file} (不存在)`);
        }
    }

    // 从 parsed 目录拉取
    for (const file of FILES_TO_PULL.parsed) {
        const srcPath = path.join(srcParsedDir, file);
        const dstPath = path.join(targetDataDir, file);

        if (fs.existsSync(srcPath)) {
            copyFile(srcPath, dstPath);
            console.log(`  ✓ ${file}`);
        } else {
            console.log(`  ✗ ${file} (不存在)`);
        }
    }

    // 从 entities 目录拉取
    console.log();
    console.log('拉取实体数据...');
    for (const file of FILES_TO_PULL.entities) {
        const srcPath = path.join(srcEntitiesDir, file);
        const dstPath = path.join(targetEntitiesDir, file);

        if (fs.existsSync(srcPath)) {
            copyFile(srcPath, dstPath);
            console.log(`  ✓ entities/${file}`);
        } else {
            console.log(`  ✗ entities/${file} (不存在)`);
        }
    }

    // 拉取图片文件
    console.log();
    console.log('拉取图片文件...');

    for (const file of FILES_TO_PULL.images) {
        const srcPath = path.join(srcImgDir, file);
        const dstPath = path.join(targetImgDir, file);

        if (fs.existsSync(srcPath)) {
            copyFile(srcPath, dstPath);
            console.log(`  ✓ ${file}`);
        } else {
            console.log(`  ✗ ${file} (不存在)`);
        }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('完成！');
    console.log(`JSON 数据: ${targetDataDir}`);
    console.log(`实体数据: ${targetEntitiesDir}`);
    console.log(`图片文件: ${targetImgDir}`);
    console.log('='.repeat(60));
}

main();
