/**
 * composables/useCombatLoop.ts - 战斗模拟主循环
 * 
 * 与时间进度条同步，管理战斗更新
 */

import { ref, computed, watch } from 'vue'
import type { Unit, Creep } from '@/types/unit'
import { updateCreepBehavior, applyCollisionSeparation, type LanePathData } from '@/utils/creepAI'
import { useLaneWave, type LanePathsData } from './useLaneWave'
import type { Point } from '@/types/map'

export interface CombatLoopOptions {
    /** 是否启用战斗模拟 */
    enabled?: boolean
    /** 时间倍速 */
    timeScale?: number
    /** 寻路函数（从 usePathfinding 获取） */
    findPath?: (start: Point, end: Point, options?: { collisionRadius?: number }) => Point[]
}

export function useCombatLoop(options: CombatLoopOptions = {}) {
    // 波次管理
    const laneWave = useLaneWave()

    // 状态
    const isRunning = ref(false)
    const isPaused = ref(true)
    const gameSeconds = ref(0)
    const lastUpdateTime = ref(0)

    // 英雄列表（外部提供）
    const heroes = ref<Unit[]>([])

    // 所有单位
    const allUnits = computed<Unit[]>(() => [
        ...heroes.value,
        ...laneWave.creeps.value
    ])

    // 统计
    const stats = computed(() => ({
        totalCreeps: laneWave.creepCount.value,
        radiantCreeps: laneWave.creeps.value.filter(c => c.team === 'radiant' && c.isAlive).length,
        direCreeps: laneWave.creeps.value.filter(c => c.team === 'dire' && c.isAlive).length,
        waveNumber: Math.floor(gameSeconds.value / 30)
    }))

    /**
     * 初始化
     */
    async function initialize(): Promise<void> {
        await laneWave.loadLanePaths()
    }

    /**
     * 设置游戏时间（用于时间条拖动或同步）
     */
    function setGameTime(seconds: number): void {
        const timeDiff = Math.abs(seconds - gameSeconds.value)

        // 如果时间差很小，只更新时间（正常帧更新）
        if (timeDiff < 1) {
            gameSeconds.value = seconds
            // 检查是否需要刷新新波次
            laneWave.updateWaves(seconds)
            return
        }

        // 时间跳跃（时间条拖动），需要重置状态
        laneWave.reset()
        gameSeconds.value = seconds

        // 重新生成到当前时间的所有波次
        laneWave.updateWaves(seconds)
    }

    /**
     * 更新一帧
     */
    function update(deltaSeconds: number): void {
        if (!laneWave.lanePaths.value) return

        const timeScale = options.timeScale ?? 1
        const scaledDelta = deltaSeconds * timeScale

        // 更新游戏时间
        gameSeconds.value += scaledDelta

        // 检查是否需要刷新新波次
        laneWave.updateWaves(gameSeconds.value)

        // 更新所有小兵行为
        const paths = laneWave.lanePaths.value
        for (const creep of laneWave.creeps.value) {
            if (!creep.isAlive) continue

            const lanePath: LanePathData = {
                spawner: paths[creep.team][creep.lane].spawner,
                waypoints: paths[creep.team][creep.lane].waypoints
            }

            updateCreepBehavior({
                creep,
                gameSeconds: gameSeconds.value,
                deltaSeconds: scaledDelta,
                allUnits: allUnits.value,
                lanePath,
                onDamage: handleDamage,
                findPath: options.findPath
            })
        }

        // 应用碰撞分离（防止小兵重叠）
        applyCollisionSeparation(laneWave.creeps.value, allUnits.value)

        // 清理死亡单位
        laneWave.removeDeadCreeps()
    }

    /**
     * 处理伤害
     */
    function handleDamage(targetId: string, damage: number): void {
        const target = allUnits.value.find(u => u.id === targetId)
        if (!target) return

        target.combat.currentHp -= damage

        if (target.combat.currentHp <= 0) {
            target.combat.currentHp = 0
            target.isAlive = false

            // 如果是小兵，更新行为状态
            if (target.unitType === 'creep') {
                (target as Creep).behaviorState = 'dead'
            }
        }
    }

    /**
     * 开始/恢复模拟
     */
    function play(): void {
        isPaused.value = false
        isRunning.value = true
        lastUpdateTime.value = performance.now()
    }

    /**
     * 暂停模拟
     */
    function pause(): void {
        isPaused.value = true
    }

    /**
     * 切换播放/暂停
     */
    function toggle(): void {
        if (isPaused.value) {
            play()
        } else {
            pause()
        }
    }

    /**
     * 重置模拟
     */
    function reset(): void {
        isPaused.value = true
        isRunning.value = false
        gameSeconds.value = 0
        laneWave.reset()
    }

    /**
     * 主循环 tick（由外部调用，通常是 requestAnimationFrame）
     */
    function tick(): void {
        if (isPaused.value) return

        const now = performance.now()
        const deltaMs = now - lastUpdateTime.value
        lastUpdateTime.value = now

        // 限制最大 delta 防止跳帧
        const deltaSeconds = Math.min(deltaMs / 1000, 0.1)

        update(deltaSeconds)
    }

    /**
     * 设置英雄列表
     */
    function setHeroes(heroList: Unit[]): void {
        heroes.value = heroList
    }

    /**
     * 获取路径数据（用于渲染）
     */
    function getLanePaths(): LanePathsData | null {
        return laneWave.lanePaths.value
    }

    return {
        // 状态
        isRunning,
        isPaused,
        gameSeconds,
        allUnits,
        creeps: laneWave.creeps,
        stats,

        // 方法
        initialize,
        setGameTime,
        update,
        tick,
        play,
        pause,
        toggle,
        reset,
        setHeroes,
        getLanePaths
    }
}
