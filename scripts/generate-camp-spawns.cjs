// 基于Liquipedia营地组成 + neutrals.json生成准确的营地数据
const fs = require('fs');
const path = require('path');

const neutralsPath = path.join(__dirname, '../public/data/world/neutrals.json');
const neutrals = JSON.parse(fs.readFileSync(neutralsPath, 'utf8'));

// Liquipedia验证的营地组合
const campCompositions = {
    small: {
        kobold: {
            nameZh: '狗头人营地',
            nameEn: 'Kobold Camp',
            units: ['kobold', 'kobold', 'kobold', 'kobold_tunneler', 'kobold_taskmaster']
        },
        hill_troll: {
            nameZh: '山地巨魔营地',
            nameEn: 'Hill Troll Camp',
            units: ['forest_troll_berserker', 'forest_troll_berserker', 'forest_troll_high_priest']
        },
        hill_troll_kobold: {
            nameZh: '山地巨魔狗头人营地',
            nameEn: 'Hill Troll and Kobold Camp',
            units: ['forest_troll_berserker', 'forest_troll_berserker', 'kobold_taskmaster']
        },
        vhoul: {
            nameZh: '虚无刺客营地',
            nameEn: 'Vhoul Assassin Camp',
            units: ['gnoll_assassin', 'gnoll_assassin', 'gnoll_assassin']
        },
        ghost: {
            nameZh: '幽灵营地',
            nameEn: 'Ghost Camp',
            units: ['fel_beast', 'fel_beast', 'ghost']
        },
        harpy: {
            nameZh: '鹰身女妖营地',
            nameEn: 'Harpy Camp',
            units: ['harpy_scout', 'harpy_scout', 'harpy_storm']
        },
        pollywog: {
            nameZh: '蝌蚪营地',
            nameEn: 'Pollywog Camp',
            units: ['tadpole', 'tadpole', 'tadpole']
        }
    },
    medium: {
        centaur: {
            nameZh: '半人马营地',
            nameEn: 'Centaur Camp',
            units: ['centaur_outrunner', 'centaur_khan']
        },
        wolf: {
            nameZh: '狼群营地',
            nameEn: 'Wolf Camp',
            units: ['giant_wolf', 'giant_wolf', 'alpha_wolf']
        },
        satyr: {
            nameZh: '萨特营地',
            nameEn: 'Satyr Camp',
            units: ['satyr_trickster', 'satyr_trickster', 'satyr_soulstealer', 'satyr_soulstealer']
        },
        ogre: {
            nameZh: '食人魔营地',
            nameEn: 'Ogre Camp',
            units: ['ogre_mauler', 'ogre_mauler', 'ogre_magi']
        },
        golem: {
            nameZh: '泥土傀儡营地',
            nameEn: 'Golem Camp',
            units: ['mud_golem', 'mud_golem']
        },
        froglet: {
            nameZh: '小蛙营地',
            nameEn: 'Froglet Camp',
            units: ['froglet', 'froglet', 'froglet_mage']
        }
    },
    large: {
        large_centaur: {
            nameZh: '大半人马营地',
            nameEn: 'Large Centaur Camp',
            units: ['centaur_outrunner', 'centaur_khan', 'centaur_khan']
        },
        large_satyr: {
            nameZh: '大萨特营地',
            nameEn: 'Large Satyr Camp',
            units: ['satyr_trickster', 'satyr_soulstealer', 'satyr_hellcaller']
        },
        hellbear: {
            nameZh: '地狱熊营地',
            nameEn: 'Hellbear Camp',
            units: ['polar_furbolg_champion', 'polar_furbolg_ursa_warrior']
        },
        wildwing: {
            nameZh: '野性之心营地',
            nameEn: 'Wildwing Camp',
            units: ['wildkin', 'wildkin', 'enraged_wildkin']
        },
        troll: {
            nameZh: '黑暗巨魔营地',
            nameEn: 'Troll Camp',
            units: ['dark_troll', 'dark_troll', 'dark_troll_warlord']
        },
        warpine: {
            nameZh: '扭曲树人营地',
            nameEn: 'Warpine Camp',
            units: ['warpine_raider', 'warpine_raider']
        },
        frog: {
            nameZh: '蛙营地',
            nameEn: 'Frog Camp',
            units: ['grown_frog', 'grown_frog', 'grown_frog_mage']
        }
    },
    ancient: {
        dragon: {
            nameZh: '黑龙营地',
            nameEn: 'Dragon Camp',
            units: ['black_drake', 'black_drake', 'black_dragon']
        },
        large_golem: {
            nameZh: '大石像鬼营地',
            nameEn: 'Large Golem Camp',
            units: ['rock_golem', 'rock_golem', 'granite_golem']
        },
        thunderhide: {
            nameZh: '雷皮兽营地',
            nameEn: 'Thunderhide Camp',
            units: ['big_thunder_lizard', 'small_thunder_lizard', 'small_thunder_lizard']
        },
        frostbitten: {
            nameZh: '冰霜营地',
            nameEn: 'Frostbitten Camp',
            units: ['ice_shaman', 'frostbitten_golem', 'frostbitten_golem']
        },
        prowler: {
            nameZh: '潜行者营地',
            nameEn: 'Prowler Camp',
            units: ['prowler_shaman', 'prowler_acolyte', 'prowler_acolyte']
        },
        ancient_frog: {
            nameZh: '远古蛙营地',
            nameEn: 'Ancient Frog Camp',
            units: ['ancient_frog', 'ancient_frog', 'ancient_frog_mage']
        }
    }
};

// 计算营地的总金钱和经验
function calculateCampStats(units, neutralData) {
    let goldMin = 0;
    let goldMax = 0;
    let xp = 0;

    const unitDetails = [];

    for (const unitId of units) {
        const unit = neutralData[unitId];
        if (!unit) {
            console.warn(`Warning: Unit ${unitId} not found in neutrals.json`);
            continue;
        }

        goldMin += unit.goldMin;
        goldMax += unit.goldMax;
        xp += unit.xp;
        unitDetails.push({
            id: unitId,
            gold: `${unit.goldMin}-${unit.goldMax}`,
            xp: unit.xp
        });
    }

    return {
        goldMin,
        goldMax,
        xp,
        unitDetails
    };
}

// 生成最终数据
function generateCampSpawns() {
    const result = {
        meta: {
            source: 'Liquipedia (verified 2026-01-26) + npc_units.txt',
            extractedAt: new Date().toISOString(),
            notes: '野怪营地组合及准确的金钱/经验数值'
        }
    };

    // 处理所有营地类型
    for (const [size, camps] of Object.entries(campCompositions)) {
        result[size] = {
            nameZh: { small: '小野', medium: '中野', large: '大野', ancient: '远古野' }[size],
            nameEn: { small: 'Small Camp', medium: 'Medium Camp', large: 'Large Camp', ancient: 'Ancient Camp' }[size],
            combinations: []
        };

        for (const [campId, campData] of Object.entries(camps)) {
            // 从neutrals.json获取准确数据
            const allCreeps = {
                ...neutrals.camps.small.creeps,
                ...neutrals.camps.medium.creeps,
                ...neutrals.camps.large.creeps,
                ...neutrals.camps.ancient.creeps
            };

            const stats = calculateCampStats(campData.units, allCreeps);

            result[size].combinations.push({
                id: campId,
                name: campData.nameZh,
                nameEn: campData.nameEn,
                units: campData.units,
                totalGold: {
                    min: stats.goldMin,
                    max: stats.goldMax,
                    avg: Math.round((stats.goldMin + stats.goldMax) / 2)
                },
                totalXP: stats.xp,
                unitDetails: stats.unitDetails
            });
        }
    }

    return result;
}

// 生成并保存
const campSpawns = generateCampSpawns();
const outputPath = path.join(__dirname, '../public/data/world/custom/camp-spawns.json');
fs.writeFileSync(outputPath, JSON.stringify(campSpawns, null, 2));

console.log('✅ camp-spawns.json generated successfully!');
console.log(`   Output: ${outputPath}`);
