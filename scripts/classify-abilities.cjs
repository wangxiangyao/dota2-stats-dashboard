/**
 * 技能多维度分类脚本
 * 一个技能可以有多个 type 标签
 * 数据组织：
 * public/data/abilities/
 * ├── active.json   # 主动技能（带分类标签）
 * ├── passive.json  # 被动技能（带分类标签）
 * └── index.json    # 索引（统计信息、分类定义）
 */

const fs = require('fs');
const path = require('path');

const abilities = require('../public/data/heroesAbilities.json');

// 子技能后缀（需要过滤）
const SUB_ABILITY_SUFFIXES = [
  '_stop', '_end', '_cancel', '_release', '_toggle',
  '_untransform', '_early', '_self_cast',
  '_innate', '_ad'
];

// 召唤物技能前缀（需要过滤）
const SUMMON_ABILITY_PREFIXES = [
  'brewmaster_earth_', 'brewmaster_storm_', 'brewmaster_fire_',
  'lone_druid_spirit_bear_', 'visage_summon_familiars_'
];

// 无意义技能（断开连接类等）
const USELESS_ABILITIES = [
  'break_connection', 'tether_break', 'unlink', 'detach',
  'overcharge_break', 'spirit_breaker_charge_stop'
];

// 获取 behavior 字符串
function getBehaviorStr(ability) {
  const behavior = ability.behavior || '';
  return Array.isArray(behavior) ? behavior.join(',') : behavior;
}

// 判断是否是被动技能
function isPassiveAbility(ability) {
  const behaviorStr = getBehaviorStr(ability);
  return behaviorStr === 'Passive' || behaviorStr === 'Passive,Hidden';
}

// 基础过滤（去掉无意义技能）
function shouldKeepBase(ability) {
  const name = ability.internalName.toLowerCase();
  const behaviorStr = getBehaviorStr(ability);

  // 过滤子技能
  for (const suffix of SUB_ABILITY_SUFFIXES) {
    if (name.includes(suffix)) return false;
  }

  // 过滤空技能槽和属性加成
  if (name.includes('empty') || name.includes('attribute_bonus')) return false;

  // 过滤召唤物技能
  for (const prefix of SUMMON_ABILITY_PREFIXES) {
    if (name.includes(prefix)) return false;
  }

  // 过滤无名技能
  if (!ability.name || ability.name.trim() === '') return false;

  // 必须有某种释放行为
  if (!behaviorStr || behaviorStr.trim() === '') return false;

  // 过滤无意义技能
  for (const useless of USELESS_ABILITIES) {
    if (name.includes(useless)) return false;
  }

  // 对于 Hidden 技能（非被动），只有同时具有主动释放行为的才保留
  if (behaviorStr.includes('Hidden') && !isPassiveAbility(ability)) {
    const activeBehaviors = ['Unit Target', 'Point Target', 'No Target', 'AOE', 'Channeled'];
    if (!activeBehaviors.some(b => behaviorStr.includes(b))) {
      return false;
    }
  }

  return true;
}

// 去重
function deduplicate(abilities) {
  const seen = new Set();
  const unique = [];
  for (const ability of abilities) {
    if (!seen.has(ability.internalName)) {
      seen.add(ability.internalName);
      unique.push(ability);
    }
  }
  return unique;
}

// ============ 技能类型判断函数（简化为4种） ============

// 判断技能是否有伤害
function hasDamage(ability) {
  return ability.damageType !== null && ability.damageType !== undefined;
}

// 判断技能是否有眩晕
function hasStun(ability) {
  if (!ability.attributes) return false;
  return ability.attributes.some(attr =>
    attr.key === 'stun_duration' ||
    attr.key === 'stun_duration_tooltip' ||
    attr.key === 'bind_duration'
  );
}

// 判断技能是治疗/吸血类
function hasHeal(ability) {
  if (!ability.attributes) return false;
  return ability.attributes.some(attr =>
    attr.key.includes('heal') ||
    attr.key.includes('lifesteal') ||
    attr.key.includes('health_restore') ||
    attr.key.includes('regen')
  );
}

// ============ 技能分类（简化为4种：伤害/眩晕/治疗/其他） ============
function classifyAbility(ability) {
  const types = [];

  // 只保留4种核心分类
  if (hasDamage(ability)) types.push('damage');
  if (hasStun(ability)) types.push('stun');
  if (hasHeal(ability)) types.push('heal');

  // 如果没有任何标签，归为 other
  if (types.length === 0) types.push('other');

  return types;
}

// ============ 主流程 ============
console.log('原始技能数:', abilities.length);

// 1. 基础过滤
const baseFiltered = deduplicate(abilities.filter(shouldKeepBase));
console.log('基础过滤后:', baseFiltered.length);

// 2. 分离主动和被动，并添加分类标签
const passiveAbilities = [];
const activeAbilities = [];

for (const ability of baseFiltered) {
  const types = classifyAbility(ability);
  // 保留 is_ultimate 字段
  const abilityWithTypes = {
    ...ability,
    types,
    is_ultimate: ability.is_ultimate || false
  };

  if (isPassiveAbility(ability)) {
    passiveAbilities.push(abilityWithTypes);
  } else {
    activeAbilities.push(abilityWithTypes);
  }
}

console.log('\n--- 主动/被动分类 ---');
console.log('被动技能:', passiveAbilities.length);
console.log('主动技能:', activeAbilities.length);

// 3. 统计各类型数量
function getTypeStats(abilities) {
  const stats = {};
  for (const a of abilities) {
    for (const t of a.types) {
      stats[t] = (stats[t] || 0) + 1;
    }
  }
  return stats;
}

const activeStats = getTypeStats(activeAbilities);
const passiveStats = getTypeStats(passiveAbilities);

console.log('\n--- 主动技能类型统计 ---');
Object.entries(activeStats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`${type}: ${count}`);
});

console.log('\n--- 被动技能类型统计 ---');
Object.entries(passiveStats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`${type}: ${count}`);
});

// 4. 创建目录
const outputDir = path.join(__dirname, '../public/data/abilities');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 5. 保存文件
fs.writeFileSync(
  path.join(outputDir, 'active.json'),
  JSON.stringify(activeAbilities, null, 2),
  'utf-8'
);
console.log('\n✓ 已生成: abilities/active.json');

fs.writeFileSync(
  path.join(outputDir, 'passive.json'),
  JSON.stringify(passiveAbilities, null, 2),
  'utf-8'
);
console.log('✓ 已生成: abilities/passive.json');

// 6. 生成索引文件
const indexData = {
  updatedAt: new Date().toISOString(),
  totalAbilities: baseFiltered.length,
  active: {
    count: activeAbilities.length,
    types: activeStats
  },
  passive: {
    count: passiveAbilities.length,
    types: passiveStats
  },
  typeDefinitions: {
    damage: { label: '伤害', description: '直接造成伤害的技能' },
    stun: { label: '眩晕', description: '使目标无法移动和攻击' },
    heal: { label: '治疗', description: '恢复生命值或吸血' },
    other: { label: '其他', description: '其他难以归类的技能' }
  }
};

fs.writeFileSync(
  path.join(outputDir, 'index.json'),
  JSON.stringify(indexData, null, 2),
  'utf-8'
);
console.log('✓ 已生成: abilities/index.json');

// 7. 显示一些多标签技能示例
console.log('\n--- 多标签技能示例 ---');
const multiTagSkills = activeAbilities.filter(a => a.types.length >= 3).slice(0, 15);
multiTagSkills.forEach(a => {
  console.log(`  ${a.heroName}: ${a.name_zh || a.name} [${a.types.join(', ')}]`);
});
