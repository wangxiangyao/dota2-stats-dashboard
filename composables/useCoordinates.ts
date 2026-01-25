/**
 * composables/useCoordinates.ts - 坐标转换工具
 * 
 * 处理世界坐标、画布坐标、导航网格坐标之间的转换
 */

import { MAP_CONSTANTS } from '@/types/map'
import type { Point } from '@/types/map'

const { WORLD_MIN, WORLD_MAX, WORLD_SIZE, NAV_CELL_SIZE } = MAP_CONSTANTS

/**
 * 创建坐标转换工具
 * @param navWidth 导航图宽度（像素）
 * @param navHeight 导航图高度（像素）
 */
export function useCoordinates(navWidth: number = 2401, navHeight: number = 2401) {

    /**
     * 世界坐标 -> 画布坐标（Y轴翻转）
     * 公式参考 dota-map-coordinates: grid_to_image (gX, gridHeight - gY - 1)
     */
    function worldToCanvas(worldX: number, worldY: number): Point {
        const canvasSize = navWidth
        const x = ((worldX - WORLD_MIN) / WORLD_SIZE) * canvasSize
        const y = ((WORLD_MAX - worldY) / WORLD_SIZE) * canvasSize  // Y轴翻转
        return { x, y }
    }

    /**
     * 画布坐标 -> 世界坐标
     */
    function canvasToWorld(canvasX: number, canvasY: number): Point {
        const canvasSize = navWidth
        const x = (canvasX / canvasSize) * WORLD_SIZE + WORLD_MIN
        const y = WORLD_MAX - (canvasY / canvasSize) * WORLD_SIZE  // Y轴翻转
        return { x, y }
    }

    /**
     * 世界坐标 -> 导航图像素坐标
     */
    function worldToNav(worldX: number, worldY: number): Point {
        const gX = Math.round((worldX - WORLD_MIN) / NAV_CELL_SIZE)
        const gY = Math.round((worldY - WORLD_MIN) / NAV_CELL_SIZE)
        const x = gX
        const y = navHeight - gY - 1  // Y轴翻转
        return {
            x: Math.max(0, Math.min(navWidth - 1, x)),
            y: Math.max(0, Math.min(navHeight - 1, y))
        }
    }

    /**
     * 导航图像素坐标 -> 世界坐标
     */
    function navToWorld(navX: number, navY: number): Point {
        const gX = navX
        const gY = navHeight - navY - 1  // Y轴翻转
        const x = gX * NAV_CELL_SIZE + WORLD_MIN
        const y = gY * NAV_CELL_SIZE + WORLD_MIN
        return { x, y }
    }

    /**
     * 世界坐标 -> 视野网格坐标
     */
    function worldToVisionGrid(worldX: number, worldY: number, gridSize: number = 64): Point {
        const gX = Math.floor((worldX - WORLD_MIN) / gridSize)
        const gY = Math.floor((worldY - WORLD_MIN) / gridSize)
        return { x: gX, y: gY }
    }

    /**
     * 视野网格坐标 -> 世界坐标（格子中心）
     */
    function visionGridToWorld(gridX: number, gridY: number, gridSize: number = 64): Point {
        const x = gridX * gridSize + WORLD_MIN + gridSize / 2
        const y = gridY * gridSize + WORLD_MIN + gridSize / 2
        return { x, y }
    }

    /**
     * 计算两点之间的距离（游戏单位）
     */
    function distance(p1: Point, p2: Point): number {
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    /**
     * 检查点是否在世界范围内
     */
    function isInWorld(worldX: number, worldY: number): boolean {
        return worldX >= WORLD_MIN && worldX <= WORLD_MAX &&
            worldY >= WORLD_MIN && worldY <= WORLD_MAX
    }

    /**
     * 将世界坐标限制在地图范围内
     */
    function clampToWorld(worldX: number, worldY: number): Point {
        return {
            x: Math.max(WORLD_MIN, Math.min(WORLD_MAX, worldX)),
            y: Math.max(WORLD_MIN, Math.min(WORLD_MAX, worldY))
        }
    }

    return {
        worldToCanvas,
        canvasToWorld,
        worldToNav,
        navToWorld,
        worldToVisionGrid,
        visionGridToWorld,
        distance,
        isInWorld,
        clampToWorld
    }
}
