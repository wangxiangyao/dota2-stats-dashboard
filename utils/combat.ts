/**
 * utils/combat.ts - 战斗系统工具函数
 * 
 * 包含伤害计算、小兵属性模板等
 */

import type { CombatStats, CreepType, AttackState } from '@/types/unit'

// ===== 常量参数（来自 Liquipedia）=====

/** 仇恨 CD（秒） */
export const AGGRO_COOLDOWN = 3

/** 强制追击时长（秒） */
export const CHASE_DURATION = 2.3

/** 仇恨触发范围 */
export const AGGRO_TRIGGER_RANGE = 500

/** 小兵视野 */
export const CREEP_VISION = 750

/** 5分钟前特殊规则 */
export const EARLY_GAME_AGGRO_IMMUNITY_END = 300  // 5 分钟

/** T1 塔范围内可触发仇恨 */
export const T1_TOWER_AGGRO_RANGE = 1500

// ===== 小兵基础属性模板 =====

export const CREEP_TEMPLATES: Record<CreepType, CombatStats> = {
    melee: {
        maxHp: 550,
        currentHp: 550,
        hpRegen: 0.5,
        attackDamageMin: 19,
        attackDamageMax: 23,
        attackRate: 1.0,
        attackRange: 100,
        acquisitionRange: 500,
        armor: 2,
        magicResist: 0,
        moveSpeed: 325
    },
    ranged: {
        maxHp: 300,
        currentHp: 300,
        hpRegen: 2,
        attackDamageMin: 21,
        attackDamageMax: 26,
        attackRate: 1.0,
        attackRange: 500,
        acquisitionRange: 600,
        armor: 0,
        magicResist: 0,
        moveSpeed: 325
    },
    siege: {
        maxHp: 1300,
        currentHp: 1300,
        hpRegen: 0,
        attackDamageMin: 35,
        attackDamageMax: 46,
        attackRate: 2.7,
        attackRange: 690,
        acquisitionRange: 800,
        armor: 0,
        magicResist: 80,
        moveSpeed: 325
    },
    flagbearer: {
        maxHp: 550,
        currentHp: 550,
        hpRegen: 0.5,
        attackDamageMin: 19,
        attackDamageMax: 23,
        attackRate: 1.0,
        attackRange: 100,
        acquisitionRange: 500,
        armor: 2,
        magicResist: 25,  // 旗手有额外魔抗
        moveSpeed: 325
    }
}

// ===== 升级公式 =====

/** 每 7.5 分钟的升级（最多 30 次） */
export const CREEP_UPGRADE_INTERVAL = 450  // 7.5 分钟
export const CREEP_MAX_UPGRADES = 30

export const CREEP_UPGRADE_PER_CYCLE: Record<CreepType, { hp: number; attack: number }> = {
    melee: { hp: 12, attack: 1 },
    ranged: { hp: 12, attack: 2 },
    siege: { hp: 0, attack: 0 },  // 攻城车不升级
    flagbearer: { hp: 12, attack: 1 }  // 同近战
}

/**
 * 计算小兵在指定游戏时间的属性
 */
export function getCreepStatsAtTime(creepType: CreepType, gameSeconds: number): CombatStats {
    const base = { ...CREEP_TEMPLATES[creepType] }
    const upgrade = CREEP_UPGRADE_PER_CYCLE[creepType]

    // 计算升级次数
    const upgrades = Math.min(
        Math.floor(gameSeconds / CREEP_UPGRADE_INTERVAL),
        CREEP_MAX_UPGRADES
    )

    // 应用升级
    base.maxHp += upgrade.hp * upgrades
    base.currentHp = base.maxHp
    base.attackDamageMin += upgrade.attack * upgrades
    base.attackDamageMax += upgrade.attack * upgrades

    return base
}

// ===== 伤害计算 =====

/**
 * 物理伤害减免（护甲公式）
 * @returns 伤害倍率 (0~2)
 */
export function armorReduction(armor: number): number {
    if (armor >= 0) {
        return 1 - (0.06 * armor) / (1 + 0.06 * armor)
    }
    return 2 - Math.pow(0.94, -armor)
}

/**
 * 计算随机攻击伤害
 */
export function rollAttackDamage(combat: CombatStats): number {
    return combat.attackDamageMin + Math.random() * (combat.attackDamageMax - combat.attackDamageMin)
}

/**
 * 计算实际物理伤害
 */
export function calculatePhysicalDamage(attackerCombat: CombatStats, targetCombat: CombatStats): number {
    const baseDamage = rollAttackDamage(attackerCombat)
    return Math.floor(baseDamage * armorReduction(targetCombat.armor))
}

// ===== 攻击状态 =====

/**
 * 创建空攻击状态
 */
export function createEmptyAttackState(): AttackState {
    return {
        target: null,
        lastAttackTime: -999,  // 确保第一次攻击可以立即触发
        attackAnimProgress: 0
    }
}

/**
 * 检查是否可以攻击（基于攻击间隔）
 */
export function canAttack(attackState: AttackState, combat: CombatStats, gameSeconds: number): boolean {
    return gameSeconds - attackState.lastAttackTime >= combat.attackRate
}

// ===== 距离计算 =====

/**
 * 计算两点距离
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 检查目标是否在攻击范围内
 * Dota 2 攻击距离判定：边缘到边缘的距离
 * 实际可攻击 = 中心距离 - 攻击者碰撞半径 - 目标碰撞半径 <= attackRange
 */
export function isInAttackRange(
    attackerX: number, attackerY: number,
    targetX: number, targetY: number,
    attackRange: number,
    attackerRadius: number = 0,
    targetRadius: number = 0
): boolean {
    const centerDistance = getDistance(attackerX, attackerY, targetX, targetY)
    const edgeDistance = centerDistance - attackerRadius - targetRadius
    return edgeDistance <= attackRange
}

/**
 * 检查目标是否在索敌范围内
 */
export function isInAcquisitionRange(
    attackerX: number, attackerY: number,
    targetX: number, targetY: number,
    acquisitionRange: number
): boolean {
    return getDistance(attackerX, attackerY, targetX, targetY) <= acquisitionRange
}
