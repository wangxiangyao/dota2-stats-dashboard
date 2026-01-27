/**
 * composables/useLaneWave.ts - 兵线波次管理
 * 
 * 管理小兵波次的生成和刷新
 */

import { ref, computed, shallowRef } from 'vue'
import type { Point, Team } from '@/types/map'
import type { Creep, CreepType, Lane, CreepBehaviorState } from '@/types/unit'
import { getCreepStatsAtTime, createEmptyAttackState } from '@/utils/combat'

// ===== 刷新规则常量 =====

/** 波次间隔（秒） */
export const WAVE_INTERVAL = 30

/** 旗手开始刷新时间 */
export const FLAGBEARER_START_TIME = 120  // 2:00

/** 旗手刷新间隔 */
export const FLAGBEARER_INTERVAL = 60  // 每分钟

/** 攻城车开始刷新时间 */
export const SIEGE_START_TIME = 300  // 5:00

/** 攻城车刷新间隔 */
export const SIEGE_INTERVAL = 300  // 每 5 分钟

/** 波次构成随时间变化 */
export const WAVE_COMPOSITION_UPGRADES = [
    { time: 0, melee: 3, ranged: 1 },
    { time: 900, melee: 4, ranged: 1 },    // 15:00
    { time: 1800, melee: 5, ranged: 1 },   // 30:00
    { time: 2100, melee: 5, ranged: 1, siege: 2 },  // 35:00
    { time: 2400, melee: 5, ranged: 2, siege: 2 },  // 40:00
    { time: 2700, melee: 6, ranged: 2, siege: 2 },  // 45:00
]

// ===== 类型定义 =====

export interface LanePathsData {
    radiant: Record<Lane, { spawner: Point; waypoints: Point[] }>
    dire: Record<Lane, { spawner: Point; waypoints: Point[] }>
}

export interface WaveInfo {
    waveNumber: number
    spawnTime: number
    composition: { type: CreepType; count: number }[]
}

// ===== 辅助函数 =====

let creepIdCounter = 0

function generateCreepId(): string {
    return `creep_${++creepIdCounter}`
}

/**
 * 获取指定时间的波次构成
 */
export function getWaveComposition(gameSeconds: number): { melee: number; ranged: number; siege: number } {
    let composition = { melee: 3, ranged: 1, siege: 0 }

    for (const upgrade of WAVE_COMPOSITION_UPGRADES) {
        if (gameSeconds >= upgrade.time) {
            composition = {
                melee: upgrade.melee,
                ranged: upgrade.ranged,
                siege: upgrade.siege || 0
            }
        }
    }

    return composition
}

/**
 * 判断是否应该刷旗手
 */
export function shouldSpawnFlagbearer(gameSeconds: number): boolean {
    if (gameSeconds < FLAGBEARER_START_TIME) return false
    return Math.floor((gameSeconds - FLAGBEARER_START_TIME) / FLAGBEARER_INTERVAL) % 2 === 0
}

/**
 * 判断是否应该刷攻城车
 */
export function shouldSpawnSiege(gameSeconds: number): boolean {
    if (gameSeconds < SIEGE_START_TIME) return false
    const waveNumber = Math.floor(gameSeconds / WAVE_INTERVAL)
    // 第 11 波开始，每 10 波刷一次
    return waveNumber >= 10 && (waveNumber - 10) % 10 === 0
}

/**
 * 创建小兵实例
 */
export function createCreep(
    team: Team,
    lane: Lane,
    creepType: CreepType,
    waveNumber: number,
    spawnPosition: Point,
    gameSeconds: number
): Creep {
    const combat = getCreepStatsAtTime(creepType, gameSeconds)

    return {
        id: generateCreepId(),
        name: getCreepName(creepType),
        unitType: 'creep',
        position: {
            x: spawnPosition.x,
            y: spawnPosition.y
        },
        team,
        isAlive: true,
        // 碰撞半径：近战兵 64，远程兵 40，攻城车 80
        // 碰撞检测是边缘到中心，不是边缘到边缘
        collisionRadius: creepType === 'siege' ? 80 : (creepType === 'ranged' ? 40 : 64),
        colorIndex: 0,  // 小兵不使用颜色系统

        combat,
        vision: {
            dayVision: 750,
            nightVision: 750
        },
        pathPlan: {
            waypoints: [],
            currentPath: [],
            currentPathIndex: 0,
            isMoving: false
        },

        // Creep 特有
        creepType,
        waveNumber,
        lane,
        lanePathIndex: 1,  // 从 waypoints[1] 开始（跳过第一个点，因为 spawner 比 waypoints[0] 更靠前）
        rememberedPosition: null,
        aggroTarget: null,
        lastAggroCooldown: -999,
        chaseStartTime: null,
        targetLastSeenAt: null,
        behaviorState: 'lane_move' as CreepBehaviorState,
        collisionWaitTime: 0,
        attackState: createEmptyAttackState()
    }
}

function getCreepName(type: CreepType): string {
    const names: Record<CreepType, string> = {
        melee: '近战兵',
        ranged: '远程兵',
        siege: '攻城车',
        flagbearer: '旗手'
    }
    return names[type]
}

// ===== Composable =====

export function useLaneWave() {
    // 所有小兵
    const creeps = shallowRef<Creep[]>([])

    // 路径数据
    const lanePaths = ref<LanePathsData | null>(null)

    // 上次刷新的波次
    const lastSpawnedWave = ref(-1)

    // 当前游戏时间
    const currentGameTime = ref(0)

    // 统计
    const creepCount = computed(() => creeps.value.filter(c => c.isAlive).length)

    /**
     * 加载路径数据
     */
    async function loadLanePaths(): Promise<void> {
        const response = await fetch('/data/world/lane-paths.json')
        lanePaths.value = await response.json()
    }

    /**
     * 生成一波小兵
     */
    function spawnWave(waveNumber: number, gameSeconds: number): Creep[] {
        if (!lanePaths.value) return []

        const newCreeps: Creep[] = []
        const composition = getWaveComposition(gameSeconds)
        const hasFlagbearer = shouldSpawnFlagbearer(gameSeconds)
        const hasSiege = shouldSpawnSiege(gameSeconds)

        // 为每条路、每个阵营生成
        for (const team of ['radiant', 'dire'] as Team[]) {
            for (const lane of ['top', 'mid', 'bot'] as Lane[]) {
                const pathData = lanePaths.value[team][lane]
                const spawnPos = pathData.spawner  // 小兵在 spawner 出生

                // 计算行进方向（从 spawner 到 waypoints[1]，这是小兵的实际第一个目标）
                const targetWaypoint = pathData.waypoints[1] || pathData.waypoints[0]
                let dirX = 0, dirY = -1  // 默认向上
                if (targetWaypoint) {
                    const dx = targetWaypoint.x - spawnPos.x
                    const dy = targetWaypoint.y - spawnPos.y
                    const len = Math.sqrt(dx * dx + dy * dy)
                    if (len > 0) {
                        dirX = dx / len
                        dirY = dy / len
                    }
                }

                const spacing = 50  // 小兵间距
                let orderIndex = 0  // 第几个小兵

                // 近战兵（在前）
                const meleeCount = hasFlagbearer ? composition.melee - 1 : composition.melee
                for (let i = 0; i < meleeCount; i++) {
                    const offset = orderIndex * spacing
                    const pos = {
                        x: spawnPos.x - dirX * offset,  // 向后偏移
                        y: spawnPos.y - dirY * offset
                    }
                    newCreeps.push(createCreep(team, lane, 'melee', waveNumber, pos, gameSeconds))
                    orderIndex++
                }

                // 旗手（在近战兵后面）
                if (hasFlagbearer) {
                    const offset = orderIndex * spacing
                    const pos = {
                        x: spawnPos.x - dirX * offset,
                        y: spawnPos.y - dirY * offset
                    }
                    newCreeps.push(createCreep(team, lane, 'flagbearer', waveNumber, pos, gameSeconds))
                    orderIndex++
                }

                // 远程兵（在后）
                for (let i = 0; i < composition.ranged; i++) {
                    const offset = orderIndex * spacing
                    const pos = {
                        x: spawnPos.x - dirX * offset,
                        y: spawnPos.y - dirY * offset
                    }
                    newCreeps.push(createCreep(team, lane, 'ranged', waveNumber, pos, gameSeconds))
                    orderIndex++
                }

                // 攻城车（最后）
                if (hasSiege) {
                    const siegeCount = composition.siege || 1
                    for (let i = 0; i < siegeCount; i++) {
                        const offset = orderIndex * spacing
                        const pos = {
                            x: spawnPos.x - dirX * offset,
                            y: spawnPos.y - dirY * offset
                        }
                        newCreeps.push(createCreep(team, lane, 'siege', waveNumber, pos, gameSeconds))
                        orderIndex++
                    }
                }
            }
        }

        // 添加到全局列表
        creeps.value = [...creeps.value, ...newCreeps]

        return newCreeps
    }

    /**
     * 更新波次（根据游戏时间自动刷新）
     */
    function updateWaves(gameSeconds: number): Creep[] {
        currentGameTime.value = gameSeconds

        // 计算当前应该刷到第几波
        const currentWaveNumber = Math.floor(gameSeconds / WAVE_INTERVAL)

        // 检查是否需要刷新新波次
        const newCreeps: Creep[] = []
        while (lastSpawnedWave.value < currentWaveNumber) {
            lastSpawnedWave.value++
            const waveSpawnTime = lastSpawnedWave.value * WAVE_INTERVAL
            const spawned = spawnWave(lastSpawnedWave.value, waveSpawnTime)
            newCreeps.push(...spawned)
        }

        return newCreeps
    }

    /**
     * 移除死亡小兵
     */
    function removeDeadCreeps(): void {
        creeps.value = creeps.value.filter(c => c.isAlive)
    }

    /**
     * 重置所有小兵
     */
    function reset(): void {
        creeps.value = []
        lastSpawnedWave.value = -1
        currentGameTime.value = 0
        creepIdCounter = 0
    }

    /**
     * 获取指定路线的小兵
     */
    function getCreepsByLane(team: Team, lane: Lane): Creep[] {
        return creeps.value.filter(c => c.team === team && c.lane === lane && c.isAlive)
    }

    return {
        creeps,
        lanePaths,
        creepCount,
        currentGameTime,

        loadLanePaths,
        spawnWave,
        updateWaves,
        removeDeadCreeps,
        reset,
        getCreepsByLane
    }
}
