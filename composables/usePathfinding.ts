/**
 * composables/usePathfinding.ts - A* 寻路系统
 * 
 * 支持不同单位类型的寻路选项：
 * - 碰撞半径（不同英雄不同）
 * - 飞行单位（无视地形）
 * - 幻化单位（穿树）
 */

import { ref, type Ref } from 'vue'
import { useCoordinates } from './useCoordinates'
import { MAP_CONSTANTS } from '@/types/map'
import type { Point, PathNode, PathfindingOptions, MapEntity } from '@/types/map'

const { NAV_CELL_SIZE, HERO_COLLISION_RADIUS } = MAP_CONSTANTS

/**
 * 二叉堆（最小堆）优先队列
 */
class MinHeap {
    private heap: { x: number; y: number; f: number }[] = []

    push(node: { x: number; y: number; f: number }) {
        this.heap.push(node)
        this.bubbleUp(this.heap.length - 1)
    }

    pop(): { x: number; y: number; f: number } | undefined {
        if (this.heap.length === 0) return undefined
        const min = this.heap[0]
        const last = this.heap.pop()!
        if (this.heap.length > 0) {
            this.heap[0] = last
            this.bubbleDown(0)
        }
        return min
    }

    get length() {
        return this.heap.length
    }

    private bubbleUp(idx: number) {
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2)
            if (this.heap[idx].f >= this.heap[parentIdx].f) break
                ;[this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]]
            idx = parentIdx
        }
    }

    private bubbleDown(idx: number) {
        const len = this.heap.length
        while (true) {
            const left = 2 * idx + 1
            const right = 2 * idx + 2
            let smallest = idx
            if (left < len && this.heap[left].f < this.heap[smallest].f) smallest = left
            if (right < len && this.heap[right].f < this.heap[smallest].f) smallest = right
            if (smallest === idx) break
                ;[this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]]
            idx = smallest
        }
    }
}

/**
 * 寻路 Composable
 */
export function usePathfinding(
    navData: Ref<Uint8ClampedArray | null>,
    navWidth: Ref<number>,
    navHeight: Ref<number>,
    treeIndex: Ref<Map<string, MapEntity>>,
    destroyedTrees: Ref<Set<string>>,
    showTrees: Ref<boolean>
) {
    const coords = useCoordinates(navWidth.value, navHeight.value)

    /**
     * 欧几里得距离启发式
     */
    function heuristic(ax: number, ay: number, bx: number, by: number): number {
        return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
    }

    /**
     * 检查单个像素是否可通行（纯地形）
     */
    function isPixelWalkable(navX: number, navY: number): boolean {
        if (!navData.value) return false
        if (navX < 0 || navX >= navWidth.value || navY < 0 || navY >= navHeight.value) return false

        const idx = (navY * navWidth.value + navX) * 4
        return navData.value[idx] > 128
    }

    /**
     * 检查一个位置是否可行走
     * @param navX 导航图 X 坐标
     * @param navY 导航图 Y 坐标
     * @param options 寻路选项
     */
    function isWalkable(navX: number, navY: number, options: PathfindingOptions = {}): boolean {
        if (!navData.value) return false

        const {
            collisionRadius = HERO_COLLISION_RADIUS,
            flyingUnit = false,
            phaseUnit = false,
            ignoreTrees = false
        } = options

        // 飞行单位只检查边界
        if (flyingUnit) {
            return navX >= 0 && navX < navWidth.value && navY >= 0 && navY < navHeight.value
        }

        const collisionCells = Math.ceil(collisionRadius / NAV_CELL_SIZE)

        // 检查碰撞半径范围内的所有像素
        for (let dx = -collisionCells; dx <= collisionCells; dx++) {
            for (let dy = -collisionCells; dy <= collisionCells; dy++) {
                // 只检查圆形范围内的像素
                if (dx * dx + dy * dy <= collisionCells * collisionCells) {
                    if (!isPixelWalkable(navX + dx, navY + dy)) {
                        return false
                    }
                }
            }
        }

        // 检查树木障碍（除非是幻化单位或忽略树木）
        if (!phaseUnit && !ignoreTrees && showTrees.value && treeIndex.value.size > 0) {
            const worldPos = coords.navToWorld(navX, navY)
            const treeGX = Math.floor((worldPos.x - (-9600)) / 64)
            const treeGY = Math.floor((worldPos.y - (-9600)) / 64)

            // 搜索周围 3x3 范围的树木格子
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = `${treeGX + dx},${treeGY + dy}`
                    if (treeIndex.value.has(key) && !destroyedTrees.value.has(key)) {
                        const tree = treeIndex.value.get(key)!
                        // 英雄碰撞半径 + 树木碰撞半径(64)
                        const collisionDist = collisionRadius + 64
                        if (Math.abs(worldPos.x - tree.x) < collisionDist && Math.abs(worldPos.y - tree.y) < collisionDist) {
                            return false
                        }
                    }
                }
            }
        }

        return true
    }

    /**
     * A* 寻路
     * @param start 起点（世界坐标）
     * @param end 终点（世界坐标）
     * @param options 寻路选项
     * @returns 路径点数组（世界坐标）
     */
    function findPath(start: Point, end: Point, options: PathfindingOptions = {}): Point[] {
        const startNav = coords.worldToNav(start.x, start.y)
        const endNav = coords.worldToNav(end.x, end.y)

        // 检查起终点可行走性
        if (!isWalkable(startNav.x, startNav.y, options)) {
            console.warn('起点不可行走')
            return []
        }
        if (!isWalkable(endNav.x, endNav.y, options)) {
            console.warn('终点不可行走')
            return []
        }

        // A* 算法
        const openSet = new MinHeap()
        const closedSet = new Set<string>()
        const gScore = new Map<string, number>()
        const cameFrom = new Map<string, { x: number; y: number }>()

        const startKey = `${startNav.x},${startNav.y}`
        gScore.set(startKey, 0)
        openSet.push({
            x: startNav.x,
            y: startNav.y,
            f: heuristic(startNav.x, startNav.y, endNav.x, endNav.y)
        })

        // 8 方向（含对角线）
        const directions = [
            { dx: 1, dy: 0, cost: 1 },
            { dx: -1, dy: 0, cost: 1 },
            { dx: 0, dy: 1, cost: 1 },
            { dx: 0, dy: -1, cost: 1 },
            { dx: 1, dy: 1, cost: 1.414 },
            { dx: 1, dy: -1, cost: 1.414 },
            { dx: -1, dy: 1, cost: 1.414 },
            { dx: -1, dy: -1, cost: 1.414 }
        ]

        let iterations = 0
        const maxIterations = 100000

        while (openSet.length > 0 && iterations++ < maxIterations) {
            const current = openSet.pop()!
            const currentKey = `${current.x},${current.y}`

            // 到达终点
            if (current.x === endNav.x && current.y === endNav.y) {
                // 重建路径
                const path: Point[] = []
                let curr: { x: number; y: number } | undefined = { x: current.x, y: current.y }
                while (curr) {
                    const worldPos = coords.navToWorld(curr.x, curr.y)
                    path.unshift(worldPos)
                    curr = cameFrom.get(`${curr.x},${curr.y}`)
                }
                return path
            }

            closedSet.add(currentKey)

            // 遍历邻居
            for (const { dx, dy, cost } of directions) {
                const nx = current.x + dx
                const ny = current.y + dy
                const neighborKey = `${nx},${ny}`

                if (closedSet.has(neighborKey)) continue
                if (!isWalkable(nx, ny, options)) continue

                const tentativeG = (gScore.get(currentKey) || 0) + cost

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)!) {
                    cameFrom.set(neighborKey, { x: current.x, y: current.y })
                    gScore.set(neighborKey, tentativeG)
                    const f = tentativeG + heuristic(nx, ny, endNav.x, endNav.y)
                    openSet.push({ x: nx, y: ny, f })
                }
            }
        }

        console.warn('未找到路径')
        return []
    }

    /**
     * 计算路径长度（游戏单位）
     */
    function getPathLength(path: Point[]): number {
        if (path.length < 2) return 0
        let total = 0
        for (let i = 1; i < path.length; i++) {
            total += coords.distance(path[i - 1], path[i])
        }
        return Math.round(total)
    }

    /**
     * 计算移动时间（秒）
     */
    function getTravelTime(path: Point[], moveSpeed: number): number {
        const length = getPathLength(path)
        if (length === 0 || moveSpeed <= 0) return 0
        return length / moveSpeed
    }

    return {
        isPixelWalkable,
        isWalkable,
        findPath,
        getPathLength,
        getTravelTime
    }
}
