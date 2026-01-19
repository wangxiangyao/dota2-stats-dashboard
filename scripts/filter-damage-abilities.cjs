/**
 * 从 abilities.json 筛选出主动伤害类技能
 * 
 * 输入: public/data/abilities.json
 * 输出: public/data/damage-abilities.json
 * 
 * 使用方法: node scripts/filter-damage-abilities.cjs
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'abilities.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'damage-abilities.json');

// 加载技能数据
const abilities = require(INPUT_PATH);

// ============ 过滤规则 ============

// 需要排除的 damageKeys（非直接伤害）
const excludeDamageKeys = [
    'incoming_damage',              // 幻象承受伤害
    'illusion_incoming_damage',
    'illusion_damage_incoming',
    'images_take_damage_percent',
    'images_do_damage_percent',
    'illusion_flat_damage',
    'illusion_outgoing_damage',
    'damage_block',                 // 伤害格挡
    'damage_block_base',
    'damage_block_loss',
    'damage_block_threshold',
    'damage_reflect_pct',           // 伤害反弹
    'damage_reflection_pct',
    'reward_damage',                // 决斗奖励
    'wolf_damage',                  // 召唤物攻击力
    'boar_base_damage',
    'familiar_attack_damage',
    'attack_damage',                // 召唤物攻击力
    'eidelon_base_damage',
    'eidolon_damage_spread',
    'treant_damage',
    'enchant_damage',               // 魅惑伤害
    'gods_strength_damage',         // 属性加成
    'totem_damage_percentage',      // 伤害百分比加成
    'damage_grace_period',          // 戏命师阈值
    'damage_threshold',
    'cooldown_on_take_damage',      // 非伤害字段
    'radius_explosion',             // 非伤害字段
];

// 需要排除的技能名关键字（幻象/召唤/增益类）
const excludeNamePatterns = [
    'phantasm',                     // 混沌之军
    'mirror_image',                 // 镜像
    'conjure_image',                // 惑幻
    'doppelwalk',                   // 神行百变
    'summon_wolves',                // 召狼
    'call_of_the_wild',             // 野性呼唤
    'demonic_conversion',           // 恶魂召唤
    'summon_familiars',             // 召唤佣兽
    'haunt',                        // 鬼影重重（排除 haunting）
    'reality',                      // 如影随形
    'disruption',                   // 崩裂禁锢
    'demonic_purge',                // 散播
    'enchant',                      // 魅惑
    'stone_gaze',                   // 石化凝视
    'living_armor',                 // 活体护甲
    'gods_strength',                // 神之力量
    'flesh_heap',                   // 肉盾
    'spiked_carapace',              // 尖刺外壳
    'dark_portrait',                // 暗绘
    'parting_shot',                 // muerta
    'shrink_ray',                   // 缩小射线
    'monkey_king_tree_dance',       // 丛林之舞
    'duel',                         // 决斗
    'terrorize',                    // 哈哈镜
    'bedlam',                       // 敦伦车
    'ink_over',                     // 墨客
    'sprout',                       // 发芽（先知，要保留自然之怒）
    'call_of_the_wild_boar',        // 野性呼唤
    'call_of_the_wild_hawk',
    'summon_spirit_bear',           // 召唤熊灵
    'entangling_claws',             // 抓取
];

// 手动排除的技能（特殊情况）
const excludeAbilities = [
    'ember_spirit_activate_fire_remnant',  // 残焰和激活残焰是同一个技能
    // 祈求者非伤害技能排除
    'invoker_ghost_walk',                  // 幽灵漫步（隐身）
    'invoker_alacrity',                    // 灵动迅捷（增益）
    'invoker_forge_spirit',                // 熔炉精灵（召唤）
    'invoker_invoke',                      // 元素祈唤
    'invoker_quas', 'invoker_wex', 'invoker_exort',  // 三球
    // 祈求者OMG模式技能排除
    'invoker_cold_snap_ad', 'invoker_ghost_walk_ad', 'invoker_tornado_ad', 'invoker_emp_ad',
    'invoker_alacrity_ad', 'invoker_sun_strike_ad', 'invoker_chaos_meteor_ad',
    'invoker_ice_wall_ad', 'invoker_deafening_blast_ad', 'invoker_forge_spirit_ad',
    'forged_spirit_melting_strike',        // 熔炉精灵攻击技能
    // 用户排查确认排除
    'skeleton_king_bone_guard',            // 冥魂大帝 - 白骨护卫
    'clinkz_wind_walk',                    // 克林克兹 - 骨隐步
    'clinkz_tar_bomb',                     // 克林克兹 - 焦油炸弹
    'mirana_solar_flare',                  // 米拉娜 - 太阳金辉
    'visage_stone_form_self_cast',         // 维萨吉 - 石像形态
    'furion_arboreal_might',               // 先知 - 丛林之力（增益技能）
    'furion_hedgerow',                     // 先知 - 树篱
    'dark_troll_warlord_raise_dead',       // 野怪 - 亡灵复生
    'techies_remote_mines',                // 工程师 - 遥控炸弹（已删除的旧版技能）
    'brewmaster_storm_cyclone',            // 酒仙 - 风暴元素技能
    'brewmaster_fire_pull',                // 酒仙 - 火焰元素技能
    'brewmaster_storm_dispel_magic',       // 酒仙 - 风暴元素驱散
    'brewmaster_earth_hurl_boulder',       // 酒仙 - 大地元素投石
];

// 强制包含的技能（用户确认为伤害技能）
const forceIncludeAbilities = [
    'tusk_walrus_punch',          // 海象神拳
    'omniknight_purification',    // 洗礼
    'elder_titan_earth_splitter', // 裂地沟壑
    'luna_eclipse',               // 月蚀
    'pugna_life_drain',           // 生命汲取
    'grimstroke_spirit_walk',     // 墨涌
    'lich_frost_shield',          // 冰霜魔盾
    'dazzle_shadow_wave',         // 暗影波/治疗波
    'marci_companion_run',        // 回身踢
    'nyx_assassin_vendetta',      // 复仇
    'abaddon_aphotic_shield',     // 无光之盾
    // 新增
    'mars_gods_rebuke',           // 马尔斯 - 神之谴戒
    'dark_willow_bedlam',         // 邪影芳灵 - 作祷
    'furion_sprout',              // 先知 - 发芽
    'furion_wrath_of_nature',     // 先知 - 自然之怒
    // 用户排查确认加入
    'brewmaster_thunder_clap',    // 酒仙 - 雷霆一击
    'brewmaster_cinder_brew',     // 酒仙 - 余烬佳酿
    // 祈求者伤害技能
    'invoker_cold_snap',          // 急速冷却
    'invoker_tornado',            // 强袭飓风
    'invoker_emp',                // 电磁脉冲
    'invoker_chaos_meteor',       // 混沌陨石
    'invoker_sun_strike',         // 阳炎冲击
    'invoker_ice_wall',           // 寒冰之墙
    'invoker_deafening_blast',    // 超震声波
];

// ============ 过滤逻辑 ============

/**
 * 判断技能是否有有效的伤害值
 */
function hasValidDamage(ability) {
    if (!ability.damageValues || ability.damageValues.length === 0) return false;

    // 检查 damageKeys 是否都在排除列表中
    const validKeys = ability.damageKeys.filter(k =>
        !excludeDamageKeys.some(ex => k.toLowerCase().includes(ex.toLowerCase()))
    );

    if (validKeys.length === 0) return false;

    // 检查是否有大于 0 的伤害值
    return ability.damageValues.some(arr => arr.some(v => v > 0));
}

/**
 * 判断技能是否可作用于敌方
 */
function canTargetEnemy(ability) {
    const team = ability.targetTeam || '';
    const behavior = ability.behavior || '';

    // 显式指向敌人
    if (team.includes('ENEMY') || team === 'BOTH' || team === 'CUSTOM') return true;

    // NO_TARGET / POINT / AOE 类型技能通常可作用于敌人
    if (behavior.includes('NO_TARGET') || behavior.includes('POINT') || behavior.includes('AOE')) return true;

    return false;
}

/**
 * 判断技能名是否在排除列表中
 */
function isExcludedByName(ability) {
    const name = ability.internalName.toLowerCase();

    // 检查手动排除列表
    if (excludeAbilities.includes(ability.internalName)) return true;

    // 检查关键字排除
    return excludeNamePatterns.some(pattern => {
        // haunt 需要特殊处理，避免排除 haunting
        if (pattern === 'haunt') {
            return name.includes('_haunt') || name.endsWith('haunt');
        }
        return name.includes(pattern);
    });
}

// ============ 主逻辑 ============

console.log('=== 主动伤害类技能筛选 ===\n');

const damageAbilities = abilities.filter(a => {
    // 0. 白名单中的技能直接包含（跳过所有过滤）
    if (forceIncludeAbilities.includes(a.internalName)) return true;

    // 1. 排除被动技能
    if (a.isPassive) return false;

    // 2. 排除先天技能
    if (a.isInnate) return false;

    // 3. 排除神杖/魔晶技能
    if (a.isGrantedByScepter || a.isGrantedByShard) return false;

    // 4. 排除特定技能名
    if (isExcludedByName(a)) return false;

    // 5. 检查是否有有效伤害值
    if (!hasValidDamage(a)) return false;

    // 6. 检查是否可作用于敌方
    if (!canTargetEnemy(a)) return false;

    return true;
});

// 按英雄分组统计
const byHero = {};
damageAbilities.forEach(a => {
    if (!byHero[a.heroName]) byHero[a.heroName] = [];
    byHero[a.heroName].push(a);
});

console.log('筛选结果:');
console.log('  - 原始技能数:', abilities.length);
console.log('  - 主动伤害技能数:', damageAbilities.length);
console.log('  - 涉及英雄数:', Object.keys(byHero).length);

// 保存结果
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(damageAbilities, null, 2), 'utf-8');
console.log('\n已保存到:', OUTPUT_PATH);

// 显示部分结果用于验证
console.log('\n=== 验证（部分英雄）===');
const sampleHeroes = ['antimage', 'lina', 'tidehunter', 'brewmaster', 'night_stalker'];
sampleHeroes.forEach(hero => {
    const skills = byHero[hero] || [];
    console.log(`\n${hero}:`, skills.map(s => s.nameZh || s.internalName).join(', ') || '(无)');
});
