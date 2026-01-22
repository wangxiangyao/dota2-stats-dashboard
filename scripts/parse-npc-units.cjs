/**
 * 解析 npc_units.txt 提取兵线、野怪、建筑数据
 * 用于世界数据分析模块
 * 输出结构化 JSON 文件：creeps.json, neutrals.json, buildings.json
 */
const fs = require('fs');
const path = require('path');

// Valve KeyValue 格式解析器
function parseValveKV(content) {
    const result = {};
    const lines = content.split(/\r?\n/);
    const stack = [result];
    let currentKey = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // 移除行内注释
        const commentIdx = line.indexOf('//');
        if (commentIdx !== -1) {
            line = line.substring(0, commentIdx);
        }
        line = line.trim();

        // 跳过空行
        if (!line) continue;

        // 处理 { 
        if (line === '{') {
            if (currentKey) {
                const newObj = {};
                stack[stack.length - 1][currentKey] = newObj;
                stack.push(newObj);
                currentKey = null;
            }
            continue;
        }

        // 处理 }
        if (line === '}') {
            stack.pop();
            continue;
        }

        // 解析键值对，支持 "key" "value" 和 "key" { 两种格式
        const kvMatch = line.match(/^"([^"]+)"\s*"([^"]*)"/);
        if (kvMatch) {
            stack[stack.length - 1][kvMatch[1]] = kvMatch[2];
            continue;
        }

        // 解析单独的键（后面跟 {）
        const keyMatch = line.match(/^"([^"]+)"\s*$/);
        if (keyMatch) {
            currentKey = keyMatch[1];
            continue;
        }
    }

    return result;
}

// 提取单个单位数据
function extractUnit(value, key) {
    return {
        hp: parseInt(value.StatusHealth) || 0,
        hpRegen: parseFloat(value.StatusHealthRegen) || 0,
        armor: parseInt(value.ArmorPhysical) || 0,
        magicResist: parseInt(value.MagicalResistance) || 0,
        attackMin: parseInt(value.AttackDamageMin) || 0,
        attackMax: parseInt(value.AttackDamageMax) || 0,
        attackRate: parseFloat(value.AttackRate) || 1,
        attackRange: parseInt(value.AttackRange) || 0,
        moveSpeed: parseInt(value.MovementSpeed) || 0,
        goldMin: parseInt(value.BountyGoldMin) || 0,
        goldMax: parseInt(value.BountyGoldMax) || 0,
        xp: parseInt(value.BountyXP) || 0,
        level: parseInt(value.Level) || 1
    };
}

// 生成兵线数据（包含增长公式 - 来自 Liquipedia）
function generateCreepsData(data) {
    const meleeKey = 'npc_dota_creep_goodguys_melee';
    const rangedKey = 'npc_dota_creep_goodguys_ranged';
    const flagbearerKey = 'npc_dota_creep_goodguys_flagbearer';
    const siegeKey = 'npc_dota_goodguys_siege';
    const superMeleeKey = 'npc_dota_creep_goodguys_melee_upgraded';
    const superRangedKey = 'npc_dota_creep_goodguys_ranged_upgraded';

    return {
        meta: {
            source: 'npc_units.txt + Liquipedia',
            extractedAt: new Date().toISOString(),
            notes: '每 7.5 分钟升级一次（第1次在7:30），最多30次升级（225分钟封顶）'
        },
        upgradeInterval: 450,
        maxUpgrades: 30,
        spawnInterval: 30,
        firstWaveTime: 0,
        types: {
            melee: {
                nameZh: '近战小兵',
                nameEn: 'Melee Creep',
                base: data[meleeKey] ? extractUnit(data[meleeKey], meleeKey) : null,
                perUpgrade: { hp: 12, attack: 1, gold: 1, xp: 0 },
                spawnPerWave: 3
            },
            ranged: {
                nameZh: '远程小兵',
                nameEn: 'Ranged Creep',
                base: data[rangedKey] ? extractUnit(data[rangedKey], rangedKey) : null,
                perUpgrade: { hp: 12, attack: 2, gold: 3, xp: 8 },
                spawnPerWave: 1
            },
            flagbearer: {
                nameZh: '旗手小兵',
                nameEn: 'Flagbearer Creep',
                base: data[flagbearerKey] ? extractUnit(data[flagbearerKey], flagbearerKey) : null,
                perUpgrade: { hp: 0, attack: 0, gold: 0, xp: 0 },
                aura: {
                    name: 'Inspiration Aura',
                    nameZh: '鼓舞光环',
                    hpRegen: 2,
                    baseMagicResist: 40,
                    magicResistPerUpgrade: 4,
                    maxMagicResistUpgrades: 15
                },
                spawnPerWave: 1,
                notes: '旗手不受属性升级影响，光环魔抗每7.5分钟+4%（最多15次）'
            },
            siege: {
                nameZh: '攻城车',
                nameEn: 'Siege Creep',
                base: data[siegeKey] ? extractUnit(data[siegeKey], siegeKey) : null,
                perUpgrade: { hp: 0, attack: 0, gold: 0, xp: 0 },
                upgradeOnBarracks: { attack: 16 },
                spawnSchedule: { firstSpawn: 300, interval: 300, doubleAt: 2100 },
                notes: '5:00首次出现，每5分钟一波；35:00后每波2辆；摧毁对应路远程兵营后+16攻击'
            }
        },
        super: {
            melee: {
                nameZh: '超级近战兵',
                nameEn: 'Super Melee Creep',
                base: data[superMeleeKey] ? extractUnit(data[superMeleeKey], superMeleeKey) : null,
                perUpgrade: { hp: 19, attack: 2, gold: 1.5, xp: 0 }
            },
            ranged: {
                nameZh: '超级远程兵',
                nameEn: 'Super Ranged Creep',
                base: data[superRangedKey] ? extractUnit(data[superRangedKey], superRangedKey) : null,
                perUpgrade: { hp: 18, attack: 3, gold: 6, xp: 0 }
            }
        },
        mega: {
            melee: {
                nameZh: '百万近战兵',
                nameEn: 'Mega Melee Creep',
                notes: '属性与超级兵相同，仅金币随时间增长',
                perUpgrade: { gold: 1.5 }
            },
            ranged: {
                nameZh: '百万远程兵',
                nameEn: 'Mega Ranged Creep',
                notes: '属性与超级兵相同，仅金币随时间增长',
                perUpgrade: { gold: 6 }
            }
        },
        waveComposition: {
            default: { melee: 3, ranged: 1, flagbearer: 1, siege: 0 },
            withSiege: { melee: 3, ranged: 1, flagbearer: 1, siege: 1 },
            after35min: { melee: 3, ranged: 1, flagbearer: 1, siege: 2 }
        }
    };
}

// 野怪营地配置（来自 Liquipedia）
const NEUTRAL_CAMPS = {
    small: {
        nameZh: '小野',
        nameEn: 'Small Camp',
        creeps: ['kobold', 'kobold_tunneler', 'kobold_taskmaster', 'forest_troll_berserker', 'forest_troll_high_priest', 'gnoll_assassin', 'harpy_scout', 'harpy_storm']
    },
    medium: {
        nameZh: '中野',
        nameEn: 'Medium Camp',
        creeps: ['centaur_outrunner', 'centaur_khan', 'satyr_trickster', 'satyr_soulstealer', 'ogre_mauler', 'ogre_magi', 'mud_golem', 'giant_wolf', 'alpha_wolf', 'ghost', 'fel_beast']
    },
    large: {
        nameZh: '大野',
        nameEn: 'Large Camp',
        creeps: ['satyr_hellcaller', 'centaur_khan', 'polar_furbolg_champion', 'polar_furbolg_ursa_warrior', 'wildkin', 'enraged_wildkin', 'dark_troll', 'dark_troll_warlord', 'warpine_raider']
    },
    ancient: {
        nameZh: '远古野',
        nameEn: 'Ancient Camp',
        creeps: ['jungle_stalker', 'elder_jungle_stalker', 'prowler_acolyte', 'prowler_shaman', 'rock_golem', 'granite_golem', 'ice_shaman', 'frostbitten_golem', 'big_thunder_lizard', 'small_thunder_lizard', 'black_drake', 'black_dragon', 'tadpole', 'froglet', 'grown_frog', 'ancient_frog', 'froglet_mage', 'grown_frog_mage', 'ancient_frog_mage']
    }
};

// 生成野怪数据
function generateNeutralsData(data) {
    const neutrals = {};
    const excludePatterns = ['diretide', 'halloween', 'mutation', 'seasonal', 'aghsfort', 'enraged'];
    const shouldExclude = (key) => excludePatterns.some(p => key.toLowerCase().includes(p));

    // 提取所有野怪
    for (const [key, value] of Object.entries(data)) {
        if (key.includes('neutral') && typeof value === 'object' && !shouldExclude(key)) {
            const shortName = key.replace('npc_dota_neutral_', '');
            neutrals[shortName] = {
                id: key,
                ...extractUnit(value, key)
            };
        }
    }

    // 按营地分组
    const camps = {};
    for (const [campType, campInfo] of Object.entries(NEUTRAL_CAMPS)) {
        camps[campType] = {
            ...campInfo,
            creeps: {}
        };
        for (const creepName of campInfo.creeps) {
            if (neutrals[creepName]) {
                camps[campType].creeps[creepName] = neutrals[creepName];
            }
        }
    }

    return {
        meta: {
            source: 'npc_units.txt',
            extractedAt: new Date().toISOString()
        },
        respawnTime: 60,
        firstSpawn: 60,
        stackingWindow: '0:53-0:55',
        camps,
        all: neutrals
    };
}

// 生成建筑数据
function generateBuildingsData(data) {
    // 提取塔数据
    const extractTower = (tier, lane = null) => {
        const keys = [
            `npc_dota_goodguys_tower${tier}${lane ? '_' + lane : ''}`,
            `npc_dota_badguys_tower${tier}${lane ? '_' + lane : ''}`
        ];
        for (const key of keys) {
            if (data[key]) {
                return extractUnit(data[key], key);
            }
        }
        return null;
    };

    return {
        meta: {
            source: 'npc_units.txt + Liquipedia',
            extractedAt: new Date().toISOString()
        },
        towers: {
            tier1: {
                nameZh: '一塔',
                nameEn: 'Tier 1 Tower',
                stats: extractTower(1, 'mid'),
                goldBounty: { killer: 150, team: 100 }
            },
            tier2: {
                nameZh: '二塔',
                nameEn: 'Tier 2 Tower',
                stats: extractTower(2, 'mid'),
                goldBounty: { killer: 125, team: 200 }
            },
            tier3: {
                nameZh: '高地塔',
                nameEn: 'Tier 3 Tower',
                stats: extractTower(3, 'mid'),
                goldBounty: { killer: 125, team: 200 }
            },
            tier4: {
                nameZh: '门塔',
                nameEn: 'Tier 4 Tower',
                stats: extractTower(4),
                goldBounty: { killer: 125, team: 200 },
                count: 2
            }
        },
        barracks: {
            melee: {
                nameZh: '近战兵营',
                nameEn: 'Melee Barracks',
                hp: 2200,
                hpRegen: 5,
                armor: 15,
                goldBounty: { killer: 225, team: 100 }
            },
            ranged: {
                nameZh: '远程兵营',
                nameEn: 'Ranged Barracks',
                hp: 1300,
                hpRegen: 5,
                armor: 10,
                goldBounty: { killer: 225, team: 100 },
                notes: '摧毁后敌方攻城车+16攻击'
            }
        },
        ancient: {
            nameZh: '遗迹',
            nameEn: 'Ancient',
            stats: data['npc_dota_goodguys_fort'] ? extractUnit(data['npc_dota_goodguys_fort'], 'npc_dota_goodguys_fort') : null
        },
        fountain: {
            nameZh: '泉水',
            nameEn: 'Fountain',
            stats: data['dota_fountain'] ? extractUnit(data['dota_fountain'], 'dota_fountain') : null,
            notes: 'True Strike，对英雄造成25%当前生命值伤害（最低80点）'
        },
        roshan: {
            nameZh: '肉山',
            nameEn: 'Roshan',
            stats: data['npc_dota_roshan'] ? extractUnit(data['npc_dota_roshan'], 'npc_dota_roshan') : null,
            respawn: { min: 480, max: 660 },
            drops: {
                first: ['aegis'],
                second: ['aegis', 'cheese'],
                thirdPlus: ['aegis', 'cheese', 'refresher_shard|aghs_shard']
            },
            goldBounty: { killer: '200-290', team: 135 },
            xpBounty: '400 + 20×击杀次数'
        },
        mechanics: {
            backdoorProtection: {
                nameZh: '后门保护',
                hpRegen: { tier1: 0, tier2Plus: 90, ancient: 180 },
                damageReduction: 0.5,
                notes: 'T1塔无后门保护；需兵线接近才会解除'
            },
            towerArmor: {
                bonusPerHero: 3,
                startAt: 3,
                notes: '附近每多1个敌方英雄（超过2个），塔+3护甲'
            },
            glyph: {
                nameZh: '防御符文',
                duration: 6,
                cooldown: 300,
                notes: '初始可用，T1塔被摧毁后刷新；使建筑和兵线无敌6秒'
            }
        }
    };
}

// 主函数
async function main() {
    const inputPath = path.join(__dirname, '../public/source/npc_units.txt');
    const outputDir = path.join(__dirname, '../public/data/world');

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('正在读取 npc_units.txt...');
    const content = fs.readFileSync(inputPath, 'utf-8');

    console.log('正在解析 Valve KeyValue 格式...');
    const parsed = parseValveKV(content);
    const data = parsed.DOTAUnits || parsed;

    // 生成兵线数据
    console.log('生成兵线数据...');
    const creepsData = generateCreepsData(data);
    const creepsPath = path.join(outputDir, 'creeps.json');
    fs.writeFileSync(creepsPath, JSON.stringify(creepsData, null, 2), 'utf-8');

    // 生成野怪数据
    console.log('生成野怪数据...');
    const neutralsData = generateNeutralsData(data);
    const neutralsPath = path.join(outputDir, 'neutrals.json');
    fs.writeFileSync(neutralsPath, JSON.stringify(neutralsData, null, 2), 'utf-8');

    // 生成建筑数据
    console.log('生成建筑数据...');
    const buildingsData = generateBuildingsData(data);
    const buildingsPath = path.join(outputDir, 'buildings.json');
    fs.writeFileSync(buildingsPath, JSON.stringify(buildingsData, null, 2), 'utf-8');

    console.log(`\n提取完成！`);
    console.log(`- creeps.json: 兵线数据（含增长公式）`);
    console.log(`- neutrals.json: 野怪数据（按营地分组）`);
    console.log(`- buildings.json: 建筑数据（含肉山）`);
    console.log(`\n输出目录: ${outputDir}`);
}

main().catch(console.error);
