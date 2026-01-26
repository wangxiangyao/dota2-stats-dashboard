/**
 * types/map.ts - 地图系统类型定义
 * 
 * 核心类型，支持未来的 Unit 系统扩展
 */

// ===== 基础类型 =====
export interface Point {
    x: number
    y: number
}

export type Team = 'radiant' | 'dire'
export type TeamView = 'radiant' | 'dire' | 'both'

// ===== Unit 系统基础接口 =====

/**
 * 基础单位接口
 * 所有地图上的实体都实现此接口
 */
export interface Unit {
    id: string
    position: Point
    team: Team
    isAlive: boolean
}

/**
 * 视野提供者接口
 * 眼位、塔、英雄等都实现此接口
 */
export interface VisionProvider extends Unit {
    getVisionRadius(isDay: boolean): number
    getVisionRange?(): Set<string>  // 返回可见的网格 key
}

/**
 * 可渲染对象接口
 */
export interface Renderable {
    render(ctx: CanvasRenderingContext2D): void
    zIndex: number
}

/**
 * 可选择对象接口
 */
export interface Selectable extends Unit {
    hitTest(point: Point): boolean
    getPopupInfo(): EntityInfo
}

/**
 * 可移动单位接口
 */
export interface MovableUnit extends Unit {
    moveSpeed: number
    collisionRadius: number
}

// ===== 实体类型 =====

/**
 * 地图实体（从 JSON 加载）
 */
export interface MapEntity {
    x: number
    y: number
    z?: number
    name?: string
    team?: number
    // 其他可选属性
    [key: string]: any
}

/**
 * 实体类型枚举
 */
export type EntityType = 'camp' | 'tower' | 'fountain' | 'fort' | 'outpost' | 'rune' | 'ward' | 'hero' | 'creep'

/**
 * 选中的实体信息
 */
export interface SelectedEntity {
    type: EntityType
    data: MapEntity
    campType?: CampType
    campNote?: string
    index?: number
}

/**
 * 实体弹窗信息
 */
export interface EntityInfo {
    title: string
    subtitle?: string
    properties: { label: string; value: string }[]
}

// ===== 眼位系统 =====

export type WardType = 'observer' | 'sentry'

/**
 * 眼位数据结构
 */
export interface Ward extends VisionProvider {
    type: WardType
    worldX: number
    worldY: number
    gridX: number
    gridY: number
    placedAt: number  // 放置时的游戏时间
}

// ===== 野怪营地 =====

export type CampType = 'small' | 'medium' | 'large' | 'ancient' | null

/**
 * 营地类型配置
 */
export interface CampTypeConfig {
    id: number
    x: number
    y: number
    type: CampType
    note: string
}

/**
 * 野怪属性
 */
export interface CreepStats {
    id: string
    hp: number
    goldMin: number
    goldMax: number
    xp: number
    level: number
}

// ===== 建筑 =====

export type BuildingType = 'tower' | 'barracks' | 'ancient' | 'fountain' | 'outpost'
export type TowerTier = 'tier1' | 'tier2' | 'tier3' | 'tier4'

/**
 * 建筑接口
 */
export interface Building extends VisionProvider, Selectable {
    buildingType: BuildingType
    tier?: TowerTier
}

// ===== 寻路系统 =====

/**
 * A* 寻路节点
 */
export interface PathNode {
    x: number
    y: number
    g: number  // 起点到当前节点的代价
    h: number  // 当前节点到终点的启发式估计
    f: number  // g + h
    parent: PathNode | null
}

/**
 * 寻路选项（支持不同单位类型）
 */
export interface PathfindingOptions {
    collisionRadius?: number   // 碰撞半径（默认 24）
    flyingUnit?: boolean       // 飞行单位
    phaseUnit?: boolean        // 幻化单位（穿树）
    ignoreTrees?: boolean      // 忽略树木
}

// ===== UI 相关 =====

/**
 * 右键菜单项
 */
export interface ContextMenuItem {
    label: string
    icon: string
    action: () => void
    disabled?: boolean
}

/**
 * 右键菜单状态
 */
export interface ContextMenuState {
    visible: boolean
    x: number
    y: number
    items: ContextMenuItem[]
    worldPoint?: Point
}

// ===== 图标系统 =====

export interface IconConfig {
    col: number
    row: number
    subCol: number
    subRow: number
    size: number
    note: string
    bgColor?: number[]  // [r, g, b] 背景色，用于去除透明
}

export interface IconsData {
    meta: { spriteSheet: string; cellSize: number }
    icons: Record<string, IconConfig>
}

// ===== 视野系统 =====

/**
 * 防御塔视野配置
 */
export interface TowerVisionConfig {
    day: number
    night: number
}

/**
 * 建筑视野缓存
 */
export interface BuildingVisionCache {
    radiant: { day: Set<string> | null; night: Set<string> | null }
    dire: { day: Set<string> | null; night: Set<string> | null }
}

// ===== 常量 =====

export const MAP_CONSTANTS = {
    VERSION: '7.40b',

    // 世界坐标范围
    WORLD_MIN: -9600,
    WORLD_MAX: 9600,
    WORLD_SIZE: 19200,

    // 网格大小
    NAV_CELL_SIZE: 8,
    VISION_GRID_SIZE: 64,

    // 碰撞
    HERO_COLLISION_RADIUS: 24,
    TREE_COLLISION_RADIUS: 64,

    // 阵营颜色
    TEAM_COLORS: {
        radiant: '#32cd32',
        dire: '#dc143c'
    } as const,

    // 眼位参数
    OBSERVER_VISION_RADIUS_DAY: 1600,
    OBSERVER_VISION_RADIUS_NIGHT: 1600,
    SENTRY_VISION_RADIUS: 150,
    SENTRY_TRUE_SIGHT_RADIUS: 1050,
    OBSERVER_DURATION: 360,

    // 建筑视野
    TOWER_VISION: {
        tier1: { day: 1900, night: 600 },
        tier2: { day: 1900, night: 1100 },
        tier3: { day: 1900, night: 1100 },
        tier4: { day: 1900, night: 1100 }
    } as const,

    ANCIENT_VISION_RADIUS: 2600
} as const
