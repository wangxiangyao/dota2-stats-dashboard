/**
 * composables/useUnit.ts - Unit 系统核心
 * 
 * 管理地图上的单位（英雄、小兵等），提供创建、删除、选中等功能
 */

import { ref, computed, type Ref } from 'vue'
import type { Point, Team } from '@/types/map'
import type {
    Unit,
    Hero,
    CombatStats,
    VisionStats,
    PathPlan,
    Waypoint,
    CreateHeroOptions
} from '@/types/unit'
import {
    DEFAULT_HERO_COMBAT,
    DEFAULT_HERO_VISION,
    createEmptyPathPlan
} from '@/types/unit'

// 生成唯一 ID
let unitIdCounter = 0
function generateUnitId(): string {
    return `unit_${++unitIdCounter}_${Date.now()}`
}

// ===== 模块级别状态（单例） =====
const units = ref<Map<string, Unit>>(new Map())
const selectedUnitId = ref<string | null>(null)
const isPlanning = ref(false)

// 选中的单位（计算属性）
const selectedUnit = computed<Unit | null>(() => {
    if (!selectedUnitId.value) return null
    return units.value.get(selectedUnitId.value) || null
})

/**
 * Unit 系统 Composable（单例模式）
 */
export function useUnit() {

    /**
     * 创建英雄单位
     */
    function createHero(options: CreateHeroOptions): Hero {
        const id = generateUnitId()
        const colorIndex = units.value.size  // 使用当前单位数量作为颜色索引
        const hero: Hero = {
            id,
            name: options.name || (options.team === 'radiant' ? '天辉英雄' : '夜魇英雄'),
            unitType: 'hero',
            heroName: options.name || 'default_hero',
            level: 1,
            position: { ...options.position },
            team: options.team,
            isAlive: true,
            collisionRadius: 24,
            colorIndex,
            combat: { ...DEFAULT_HERO_COMBAT },
            vision: { ...DEFAULT_HERO_VISION },
            pathPlan: createEmptyPathPlan()
        }

        units.value.set(id, hero)
        return hero
    }

    /**
     * 获取单位
     */
    function getUnit(id: string): Unit | undefined {
        return units.value.get(id)
    }

    /**
     * 删除单位
     */
    function removeUnit(id: string): boolean {
        if (selectedUnitId.value === id) {
            selectedUnitId.value = null
        }
        return units.value.delete(id)
    }

    /**
     * 选中单位
     */
    function selectUnit(id: string | null): void {
        selectedUnitId.value = id
    }

    /**
     * 检测点击是否命中某个单位
     */
    function hitTest(point: Point, hitRadius: number = 30): Unit | null {
        for (const unit of units.value.values()) {
            if (!unit.isAlive) continue
            const dx = unit.position.x - point.x
            const dy = unit.position.y - point.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance <= hitRadius) {
                return unit
            }
        }
        return null
    }

    // ===== 路径规划 =====

    /**
     * 为选中单位添加路径点
     */
    function addWaypoint(position: Point): Waypoint | null {
        const unit = selectedUnit.value
        if (!unit) return null

        const waypointId = unit.pathPlan.waypoints.length + 1
        const waypoint: Waypoint = {
            id: waypointId,
            position: { ...position }
        }

        unit.pathPlan.waypoints.push(waypoint)
        return waypoint
    }

    /**
     * 删除选中单位的最后一个路径点
     */
    function removeLastWaypoint(): Waypoint | null {
        const unit = selectedUnit.value
        if (!unit || unit.pathPlan.waypoints.length === 0) return null

        return unit.pathPlan.waypoints.pop() || null
    }

    /**
     * 清空选中单位的所有路径点
     */
    function clearWaypoints(): void {
        const unit = selectedUnit.value
        if (!unit) return

        unit.pathPlan.waypoints = []
        unit.pathPlan.currentPath = []
        unit.pathPlan.currentPathIndex = 0
        unit.pathPlan.isMoving = false
    }

    /**
     * 设置完整路径（由 A* 计算）
     */
    function setCurrentPath(unitId: string, path: Point[]): void {
        const unit = units.value.get(unitId)
        if (!unit) return

        unit.pathPlan.currentPath = path
        unit.pathPlan.currentPathIndex = 0
    }

    /**
     * 开始移动
     */
    function startMoving(unitId: string): void {
        const unit = units.value.get(unitId)
        if (!unit) return

        if (unit.pathPlan.currentPath.length > 0) {
            unit.pathPlan.isMoving = true
            unit.pathPlan.currentPathIndex = 0
        }
    }

    /**
     * 停止移动
     */
    function stopMoving(unitId: string): void {
        const unit = units.value.get(unitId)
        if (!unit) return

        unit.pathPlan.isMoving = false
    }

    /**
     * 更新单位位置（每帧调用）
     * @param deltaTime 时间增量（秒）
     */
    function updateUnits(deltaTime: number): void {
        for (const unit of units.value.values()) {
            if (!unit.isAlive || !unit.pathPlan.isMoving) continue

            const path = unit.pathPlan.currentPath
            const index = unit.pathPlan.currentPathIndex

            if (index >= path.length) {
                // 已到达终点
                unit.pathPlan.isMoving = false
                unit.pathPlan.waypoints = []
                unit.pathPlan.currentPath = []
                continue
            }

            const target = path[index]
            const dx = target.x - unit.position.x
            const dy = target.y - unit.position.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            // 如果已经在目标点上，直接跳到下一个
            if (distance < 1) {
                unit.pathPlan.currentPathIndex++
                // 检查是否到达了某个 waypoint，如果是则删除它
                checkAndRemoveReachedWaypoint(unit)
                continue
            }

            // 计算本帧移动距离
            const moveDistance = unit.combat.moveSpeed * deltaTime

            if (distance <= moveDistance) {
                // 到达当前目标点，移动到下一个
                unit.position.x = target.x
                unit.position.y = target.y
                unit.pathPlan.currentPathIndex++
                // 检查是否到达了某个 waypoint，如果是则删除它
                checkAndRemoveReachedWaypoint(unit)
            } else {
                // 朝目标点移动
                const ratio = moveDistance / distance
                unit.position.x += dx * ratio
                unit.position.y += dy * ratio
            }
        }
    }

    /**
     * 检查并删除已到达的 waypoint
     */
    function checkAndRemoveReachedWaypoint(unit: Unit): void {
        if (unit.pathPlan.waypoints.length === 0) return

        const threshold = 50 // 到达阈值（世界坐标距离）
        const firstWaypoint = unit.pathPlan.waypoints[0]

        const dx = firstWaypoint.position.x - unit.position.x
        const dy = firstWaypoint.position.y - unit.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < threshold) {
            // 到达了第一个 waypoint，删除它
            unit.pathPlan.waypoints.shift()
        }
    }

    /**
     * 获取所有单位列表
     */
    function getAllUnits(): Unit[] {
        return Array.from(units.value.values())
    }

    /**
     * 获取指定阵营的单位
     */
    function getTeamUnits(team: Team): Unit[] {
        return Array.from(units.value.values()).filter(u => u.team === team)
    }

    return {
        // 状态
        units,
        selectedUnitId,
        selectedUnit,
        isPlanning,

        // 单位管理
        createHero,
        getUnit,
        removeUnit,
        selectUnit,
        hitTest,
        getAllUnits,
        getTeamUnits,

        // 路径规划
        addWaypoint,
        removeLastWaypoint,
        clearWaypoints,
        setCurrentPath,
        startMoving,
        stopMoving,
        updateUnits
    }
}

// 导出类型
export type UseUnitReturn = ReturnType<typeof useUnit>
