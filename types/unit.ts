/**
 * types/unit.ts - Unit 系统类型定义
 * 
 * 定义地图上可交互单位的类型，支持英雄、小兵等
 */

import type { Point, Team } from './map'

// ===== 颜色系统 =====

/**
 * 单位颜色（10色，精选色彩，避免阵营色）
 */
export const UNIT_COLORS = [
    '#3498DB', // 天蓝
    '#9B59B6', // 紫色
    '#F39C12', // 金橙
    '#1ABC9C', // 青绿
    '#E74C3C', // 砖红（非夜魇红）
    '#2ECC71', // 翠绿（非天辉绿）
    '#E91E63', // 玫红
    '#00BCD4', // 青色
    '#FF9800', // 橙色
    '#673AB7', // 深紫
] as const

/**
 * 阵营颜色
 */
export const TEAM_RING_COLORS = {
    radiant: '#32CD32', // 天辉绿
    dire: '#DC143C',    // 夜魇红
} as const

/**
 * 获取单位颜色
 */
export function getUnitColor(colorIndex: number): string {
    return UNIT_COLORS[colorIndex % UNIT_COLORS.length]
}

// ===== 战斗属性 =====

/**
 * 战斗属性（完整版）
 */
export interface CombatStats {
    // 生命
    maxHp: number
    currentHp: number
    hpRegen: number

    // 法力（可选，小兵没有）
    maxMana?: number
    currentMana?: number

    // 攻击
    attackDamageMin: number
    attackDamageMax: number
    attackRate: number          // 攻击间隔（秒）
    attackRange: number         // 攻击距离
    acquisitionRange: number    // 索敌范围

    // 防御
    armor: number
    magicResist: number

    // 移动
    moveSpeed: number
}

/**
 * 攻击状态
 */
export interface AttackState {
    target: string | null          // 攻击目标 ID
    lastAttackTime: number         // 上次攻击时间（游戏秒）
    attackAnimProgress: number     // 攻击动画进度 0~1
}

/**
 * 默认英雄战斗属性
 */
export const DEFAULT_HERO_COMBAT: CombatStats = {
    maxHp: 600,
    currentHp: 600,
    hpRegen: 1,
    maxMana: 300,
    currentMana: 300,
    attackDamageMin: 45,
    attackDamageMax: 55,
    attackRate: 1.7,
    attackRange: 150,
    acquisitionRange: 600,
    armor: 2,
    magicResist: 25,
    moveSpeed: 300
}

// ===== 视野属性 =====

/**
 * 视野属性
 */
export interface VisionStats {
    dayVision: number
    nightVision: number
}

/**
 * 默认英雄视野
 */
export const DEFAULT_HERO_VISION: VisionStats = {
    dayVision: 1800,
    nightVision: 800
}

// ===== 路径规划 =====

/**
 * 路径点
 */
export interface Waypoint {
    id: number
    position: Point
    arrivalTime?: number      // 预计到达时间（秒）
    legDistance?: number      // 从上一点到此点的距离
}

/**
 * 路径规划状态
 */
export interface PathPlan {
    waypoints: Waypoint[]       // 用户设置的路径点
    currentPath: Point[]        // A* 计算的完整路径
    currentPathIndex: number    // 当前移动到的路径点索引
    isMoving: boolean           // 是否正在移动
}

/**
 * 创建空路径规划
 */
export function createEmptyPathPlan(): PathPlan {
    return {
        waypoints: [],
        currentPath: [],
        currentPathIndex: 0,
        isMoving: false
    }
}

// ===== 基础 Unit =====

/**
 * 单位类型
 */
export type UnitType = 'hero' | 'creep'

/**
 * 基础单位接口
 */
export interface Unit {
    id: string
    name: string
    unitType: UnitType
    position: Point
    team: Team
    isAlive: boolean
    collisionRadius: number
    colorIndex: number          // 颜色索引（用于区分不同单位）

    // 能力
    combat: CombatStats
    vision: VisionStats
    pathPlan: PathPlan
}

// ===== Hero 类型 =====

/**
 * 英雄单位
 */
export interface Hero extends Unit {
    unitType: 'hero'
    heroName: string            // 英雄名称（用于显示）
    level: number
}

/**
 * 创建默认英雄配置
 */
export interface CreateHeroOptions {
    team: Team
    position: Point
    name?: string
}

// ===== Creep 类型 =====

/**
 * 小兵类型
 */
export type CreepType = 'melee' | 'ranged' | 'siege' | 'flagbearer'

/**
 * 小兵行为状态
 */
export type CreepBehaviorState =
    | 'idle'       // 无目标
    | 'lane_move'  // 沿路径移动
    | 'chase'      // 强制追击（Type1 仇恨）
    | 'attack'     // 攻击目标
    | 'seek_last'  // 移动到目标最后可见位置
    | 'return'     // 返回记忆点
    | 'dead'       // 死亡

/**
 * 兵线类型
 */
export type Lane = 'top' | 'mid' | 'bot'

/**
 * 小兵单位
 */
export interface Creep extends Unit {
    unitType: 'creep'
    creepType: CreepType
    waveNumber: number
    lane: Lane

    // 路径
    lanePathIndex: number              // 当前目标路径点索引
    rememberedPosition: Point | null   // 离开路径时的记忆点

    // 仇恨
    aggroTarget: string | null         // 仇恨目标 ID
    lastAggroCooldown: number          // 上次 Type1 仇恨触发时间
    chaseStartTime: number | null      // 强制追击开始时间
    targetLastSeenAt: Point | null     // 目标最后可见位置

    // 行为
    behaviorState: CreepBehaviorState

    // 碰撞避让
    collisionWaitTime: number          // 碰撞等待计时器（秒）

    // 攻击
    attackState: AttackState
}

// ===== 选中状态 =====

/**
 * 选中的单位信息
 */
export interface SelectedUnit {
    unit: Unit
    showPath: boolean         // 是否显示路径
    isPlanning: boolean       // 是否正在规划路径
}
