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
    // 从 data/<version>/ 根目录拉取的 JSON 文件
    root: [
        'vision_data.json'   // 视野系统数据（高度、树木、阻挡点）
    ],
    // 从 data/<version>/parsed/ 拉取的 JSON 文件
    parsed: [
        'mapdata.json',      // 地图实体数据（树木坐标、建筑等）
        'worlddata.json'     // 世界边界数据
    ],
    // 从 img/<version>/ 拉取的图片文件
    images: [
        'elevation.png',       // 地势图
        'gridnav.png',         // 导航网格（可行走检测）
        'minimap_accurate.png' // 精确风格化小地图（底图）
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
    const targetImgDir = path.join(projectRoot, 'public', 'images', 'map', version);

    // 拉取 JSON 数据文件
    console.log('拉取 JSON 数据文件...');
    const srcDataDir = path.join(config.mapCoordinatesPath, 'data', version);
    const srcParsedDir = path.join(srcDataDir, 'parsed');

    // 从根目录拉取
    for (const file of FILES_TO_PULL.root) {
        const srcPath = path.join(srcDataDir, file);
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

    // 拉取图片文件
    console.log();
    console.log('拉取图片文件...');
    const srcImgDir = path.join(config.mapCoordinatesPath, 'img', version);

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
    console.log(`图片文件: ${targetImgDir}`);
    console.log('='.repeat(60));
}

main();
