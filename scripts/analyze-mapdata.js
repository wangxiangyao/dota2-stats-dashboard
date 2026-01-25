/**
 * 分析 mapdata.json 并输出到文件
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../public/data/map/7.40b/mapdata.json');
const json = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const data = json.data;

let output = '# mapdata.json 实体分析报告\n\n';

output += '## 实体总览\n\n';
output += '| 实体类型 | 数量 |\n';
output += '|----------|------|\n';

Object.keys(data).forEach(key => {
    const val = data[key];
    const count = Array.isArray(val) ? val.length : Object.keys(val).length;
    output += `| ${key} | ${count} |\n`;
});

output += '\n---\n\n';

// 肉山
output += '## npc_dota_roshan_spawner (肉山刷新点)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_roshan_spawner, null, 2) + '\n```\n\n';

// 前哨
output += '## npc_dota_watch_tower (前哨)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_watch_tower, null, 2) + '\n```\n\n';

// 神符
const runeKeys = Object.keys(data).filter(k => k.includes('rune'));
runeKeys.forEach(key => {
    output += `## ${key}\n\n`;
    output += '```json\n' + JSON.stringify(data[key], null, 2) + '\n```\n\n';
});

// 莲花池/治疗者
output += '## npc_dota_healer (治疗者/莲花池?)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_healer, null, 2) + '\n```\n\n';

// 泉水
output += '## ent_dota_fountain (泉水)\n\n';
output += '```json\n' + JSON.stringify(data.ent_dota_fountain, null, 2) + '\n```\n\n';

// 防御塔
output += '## npc_dota_tower (防御塔)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_tower, null, 2) + '\n```\n\n';

// 基地
output += '## npc_dota_fort (基地遗迹)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_fort, null, 2) + '\n```\n\n';

// 商店
output += '## ent_dota_shop (商店)\n\n';
output += '```json\n' + JSON.stringify(data.ent_dota_shop, null, 2) + '\n```\n\n';

// 兵营
output += '## npc_dota_barracks (兵营)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_barracks, null, 2) + '\n```\n\n';

// 野怪营地
output += '## npc_dota_neutral_spawner (野怪刷新点)\n\n';
output += '```json\n' + JSON.stringify(data.npc_dota_neutral_spawner, null, 2) + '\n```\n\n';

// 保存
const outputPath = path.join(__dirname, 'mapdata-analysis.md');
fs.writeFileSync(outputPath, output);
console.log('分析报告已保存到:', outputPath);
