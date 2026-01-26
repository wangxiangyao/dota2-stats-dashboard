// 生成野怪营地实体详情文件
// 整合：worlddata位置 + neutral-camp-types类型 + camp-spawns组合 + neutrals数据
const fs = require('fs');
const path = require('path');

// 加载数据
const worlddata = require('../public/data/world/worlddata.json');
const campTypes = require('../public/data/world/custom/neutral-camp-types.json');
const campSpawns = require('../public/data/world/custom/camp-spawns.json');
const neutrals = require('../public/data/world/neutrals.json');

function generateNeutralCamps() {
    // 获取所有野怪spawner
    const spawners = worlddata.entities.filter(e =>
        e.classname === 'npc_dota_neutral_spawner'
    );

    console.log(`找到 ${spawners.length} 个野怪spawner`);

    // 为每个spawner匹配类型和组合数据
    const camps = spawners.map((spawner, index) => {
        // 通过坐标匹配类型（与InteractiveMap.vue同样的逻辑）
        const campConfig = Object.values(campTypes.camps).find((c) =>
            Math.abs(c.x - spawner.origin[0]) < 100 &&
            Math.abs(c.y - spawner.origin[1]) < 100
        );

        if (!campConfig) {
            console.warn(`Spawner #${index} at (${spawner.origin[0]}, ${spawner.origin[1]}) 无匹配类型`);
            return null;
        }

        const campType = campConfig.type; // 'small', 'medium', 'large', 'ancient'
        const campId = campConfig.id; // 'good_1', 'evil_5' etc.
        const team = campId.startsWith('good') ? 'goodguys' : 'badguys';

        // 获取该类型的所有可能组合
        const typeData = campSpawns[campType];
        if (!typeData) {
            console.warn(`未找到营地类型数据: ${campType}`);
            return null;
        }

        return {
            id: campId,
            position: spawner.origin,
            team,
            campType,
            campTypeZh: typeData.nameZh,
            campTypeEn: typeData.nameEn,
            possibleSpawns: typeData.combinations,
            respawnTime: neutrals.respawnTime || 60,
            firstSpawn: neutrals.firstSpawn || 60,
            stackingWindow: neutrals.stackingWindow || '0:53-0:55',
            // 保留原始spawner数据，供拉野区域等使用
            spawner: {
                targetname: spawner.targetname,
                hammeruniqueid: spawner.hammeruniqueid
            }
        };
    }).filter(c => c !== null);

    // 统计
    const stats = {
        total: camps.length,
        byType: {
            small: camps.filter(c => c.campType === 'small').length,
            medium: camps.filter(c => c.campType === 'medium').length,
            large: camps.filter(c => c.campType === 'large').length,
            ancient: camps.filter(c => c.campType === 'ancient').length
        },
        byTeam: {
            goodguys: camps.filter(c => c.team === 'goodguys').length,
            badguys: camps.filter(c => c.team === 'badguys').length
        }
    };

    return {
        meta: {
            source: 'worlddata.json + neutral-camp-types.json + camp-spawns.json + neutrals.json',
            extractedAt: new Date().toISOString(),
            version: '7.38',
            notes: '野怪营地实体详情，关联位置、类型、可能的野怪组合'
        },
        statistics: stats,
        camps
    };
}

// 生成并保存
console.log('开始生成野怪营地实体详情...');
const result = generateNeutralCamps();

const outputPath = path.join(__dirname, '../public/data/world/entities/neutral-camps.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log('\n✅ neutral-camps.json 生成成功!');
console.log(`   输出路径: ${outputPath}`);
console.log(`\n统计信息:`);
console.log(`   总计: ${result.statistics.total} 个营地`);
console.log(`   小野: ${result.statistics.byType.small}`);
console.log(`   中野: ${result.statistics.byType.medium}`);
console.log(`   大野: ${result.statistics.byType.large}`);
console.log(`   远古野: ${result.statistics.byType.ancient}`);
console.log(`   天辉: ${result.statistics.byTeam.goodguys}`);
console.log(`   夜魇: ${result.statistics.byTeam.badguys}`);
