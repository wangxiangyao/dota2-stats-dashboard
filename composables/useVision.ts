/**
 * composables/useVision.ts - 视野系统
 * 
 * 可扩展的视野系统，支持：
 * - 眼位视野
 * - 建筑视野（塔、基地）
 * - 未来：英雄视野、小兵视野
 * 
 * 核心设计：VisionProvider 接口，任何能提供视野的实体都实现它
 */

import { ref, computed, type Ref } from 'vue'
import { VisionSimulation, xy2key, key2pt } from '@/utils/vision'
import { MAP_CONSTANTS } from '@/types/map'
import type { Point, Team, TeamView, Ward, WardType, MapEntity, VisionProvider, BuildingVisionCache } from '@/types/map'

const {
    VERSION,
    WORLD_MIN,
    WORLD_MAX,
    VISION_GRID_SIZE,
    OBSERVER_VISION_RADIUS_DAY,
    OBSERVER_VISION_RADIUS_NIGHT,
    SENTRY_VISION_RADIUS,
    SENTRY_TRUE_SIGHT_RADIUS,
    OBSERVER_DURATION,
    TOWER_VISION,
    ANCIENT_VISION_RADIUS
} = MAP_CONSTANTS

/**
 * 视野系统 Composable
 */
export function useVision(
    towers: Ref<MapEntity[]>,
    ancients: Ref<MapEntity[]>
) {
    // 视野模拟器
    let visionSimulator: VisionSimulation | null = null
    const visionReady = ref(false)

    // 眼位管理
    const wards = ref<Ward[]>([])
    let wardIdCounter = 0

    // 当前操作阵营
    const currentTeam = ref<Team>('radiant')

    // 视野视角
    const currentView = ref<TeamView>('both')

    // 日夜状态（外部传入）
    const isDaytime = ref(true)

    // 游戏时间（外部传入）
    const gameTime = ref(0)

    // 合并视野缓存
    const combinedVision = ref<Set<string>>(new Set())

    // 建筑视野缓存
    let buildingVisionCache: BuildingVisionCache = {
        radiant: { day: null, night: null },
        dire: { day: null, night: null }
    }

    // 迷雾缓存标记
    const needsFogCacheUpdate = ref(true)

    // 选中的眼位
    const selectedWardId = ref<string | null>(null)

    // 选中的防御塔
    const selectedTower = ref<MapEntity | null>(null)
    const selectedTowerVision = ref<Set<string>>(new Set())

    /**
     * 初始化视野模拟器
     */
    async function initialize(): Promise<void> {
        if (visionSimulator) return

        const worlddata = {
            worldMinX: WORLD_MIN,
            worldMinY: WORLD_MIN,
            worldMaxX: WORLD_MAX,
            worldMaxY: WORLD_MAX
        }

        // @ts-ignore - VisionSimulation 是 JS 模块，opts 参数是可选的
        visionSimulator = new VisionSimulation(worlddata, { gridCellSize: VISION_GRID_SIZE })

        try {
            await visionSimulator.initialize(`/data/map/${VERSION}/vision_data.json`)

            // 加载禁眼区多边形数据
            try {
                const noWardsResponse = await fetch(`/data/map/${VERSION}/entities/trigger_no_wards.json`)
                const noWardsData = await noWardsResponse.json()
                visionSimulator.setNoWardPolygons(noWardsData)
            } catch (err) {
                console.warn('禁眼区数据加载失败:', err)
            }

            visionReady.value = true
            console.log('视野模拟器初始化完成')

            // 初始化建筑视野
            updateCombinedVision()
        } catch (err) {
            console.error('视野模拟器初始化失败:', err)
            visionReady.value = false
        }
    }

    /**
     * 放置眼位
     */
    function placeWard(worldX: number, worldY: number, type: WardType): boolean {
        if (!visionSimulator || !visionReady.value) return false

        const gridPt = visionSimulator.WorldXYtoGridXY(worldX, worldY)
        const key = `${gridPt.x},${gridPt.y}`

        // 调试：检查禁眼区数据
        console.log('放眼调试:', {
            worldX, worldY,
            gridX: gridPt.x, gridY: gridPt.y,
            key,
            noWardPolygonsCount: (visionSimulator.noWardPolygons || []).length,
            isInNoWards: visionSimulator.isInNoWardZone(gridPt.x, gridPt.y),
            gridnavCount: Object.keys(visionSimulator.gridnav || {}).length,
            isInGridnav: !!(visionSimulator.gridnav && visionSimulator.gridnav[key]),
            isValidXY: visionSimulator.isValidXY(gridPt.x, gridPt.y, true, true, true)
        })

        // 检查是否可以放眼
        if (!visionSimulator.isValidXY(gridPt.x, gridPt.y, true, true, true)) {
            console.log('无法在此位置放眼 - 被禁眼区或不可行走区域阻止')
            return false
        }

        const ward: Ward = {
            id: `ward_${wardIdCounter++}`,
            position: { x: worldX, y: worldY },
            team: currentTeam.value,
            isAlive: true,
            type,
            worldX,
            worldY,
            gridX: gridPt.x,
            gridY: gridPt.y,
            placedAt: gameTime.value,
            getVisionRadius: (isDay: boolean) => {
                if (type === 'sentry') return SENTRY_VISION_RADIUS
                return isDay ? OBSERVER_VISION_RADIUS_DAY : OBSERVER_VISION_RADIUS_NIGHT
            }
        }

        wards.value.push(ward)
        updateCombinedVision()
        return true
    }

    /**
     * 移除眼位
     */
    function removeWard(wardId: string): void {
        const idx = wards.value.findIndex(w => w.id === wardId)
        if (idx !== -1) {
            wards.value.splice(idx, 1)
            updateCombinedVision()
        }
    }

    /**
     * 清除所有眼位
     */
    function clearAllWards(): void {
        wards.value = []
        combinedVision.value.clear()
        needsFogCacheUpdate.value = true
    }

    /**
     * 移动眼位到新位置
     */
    function moveWard(wardId: string, worldX: number, worldY: number): boolean {
        if (!visionSimulator) return false

        const ward = wards.value.find(w => w.id === wardId)
        if (!ward) return false

        const gridPt = visionSimulator.WorldXYtoGridXY(worldX, worldY)

        // 检查目标位置是否有效（不在禁眼区、树上、不可行走区域）
        if (!visionSimulator.isValidXY(gridPt.x, gridPt.y, true, true, true)) {
            console.log('无法移动眼位到此位置 - 被禁眼区、树木或不可行走区域阻止')
            return false
        }

        // 更新眼位坐标
        ward.worldX = worldX
        ward.worldY = worldY
        ward.gridX = gridPt.x
        ward.gridY = gridPt.y
        ward.position = { x: worldX, y: worldY }

        // 重新计算视野
        updateCombinedVision()
        needsFogCacheUpdate.value = true

        return true
    }

    /**
     * 计算建筑视野（按阵营）
     */
    function computeBuildingVision(team: Team, isDay: boolean): Set<string> {
        if (!visionSimulator) return new Set()

        const result = new Set<string>()

        // 计算防御塔视野
        for (const tower of towers.value) {
            const teamnumber = Number((tower as any).teamnumber || tower.team)
            const isRadiant = teamnumber === 2
            if ((team === 'radiant' && !isRadiant) || (team === 'dire' && isRadiant)) continue

            const name = (tower as any).MapUnitName || tower.name || ''
            const TOWER_COLLISION_RADIUS = 144
            let visionRadius: number
            if (name.includes('tower1')) {
                // 一塔视野：只有夜晚时加上碰撞半径
                const baseVision = isDay ? TOWER_VISION.tier1.day : TOWER_VISION.tier1.night
                visionRadius = isDay ? baseVision : baseVision + TOWER_COLLISION_RADIUS
            } else {
                visionRadius = isDay ? TOWER_VISION.tier2.day : TOWER_VISION.tier2.night
            }

            const gridRadius = Math.ceil(visionRadius / VISION_GRID_SIZE)
            const gridPt = visionSimulator.WorldXYtoGridXY(tower.x, tower.y)

            visionSimulator.updateVisibility(gridPt.x, gridPt.y, gridRadius)

            for (const key in visionSimulator.lights) {
                result.add(key)
            }
        }

        // 计算基地视野
        for (const ancient of ancients.value) {
            const teamnumber = Number((ancient as any).teamnumber || ancient.team)
            const isRadiant = teamnumber === 2
            if ((team === 'radiant' && !isRadiant) || (team === 'dire' && isRadiant)) continue

            const gridRadius = Math.ceil(ANCIENT_VISION_RADIUS / VISION_GRID_SIZE)
            const gridPt = visionSimulator.WorldXYtoGridXY(ancient.x, ancient.y)

            visionSimulator.updateVisibility(gridPt.x, gridPt.y, gridRadius)

            for (const key in visionSimulator.lights) {
                result.add(key)
            }
        }

        return result
    }

    /**
     * 获取建筑视野（使用缓存）
     */
    function getBuildingVision(): Set<string> {
        const isDay = isDaytime.value
        const view = currentView.value
        const result = new Set<string>()

        const addTeamVision = (team: Team) => {
            const cache = buildingVisionCache[team]
            let teamVision: Set<string> | null

            if (isDay) {
                if (!cache.day) cache.day = computeBuildingVision(team, true)
                teamVision = cache.day
            } else {
                if (!cache.night) cache.night = computeBuildingVision(team, false)
                teamVision = cache.night
            }

            for (const key of teamVision) {
                result.add(key)
            }
        }

        if (view === 'both' || view === 'radiant') {
            addTeamVision('radiant')
        }
        if (view === 'both' || view === 'dire') {
            addTeamVision('dire')
        }

        return result
    }

    /**
     * 更新合并视野
     */
    function updateCombinedVision(): void {
        if (!visionSimulator || !visionReady.value) return

        combinedVision.value.clear()

        // 添加建筑视野
        const buildingVision = getBuildingVision()
        for (const key of buildingVision) {
            combinedVision.value.add(key)
        }

        // 计算眼位视野
        const now = gameTime.value
        const view = currentView.value

        // 过滤过期眼位
        const activeWards = wards.value.filter(w => {
            if (w.type === 'sentry') return true
            return (now - w.placedAt) < OBSERVER_DURATION
        })

        if (activeWards.length !== wards.value.length) {
            wards.value = activeWards
        }

        for (const ward of activeWards) {
            if (ward.type !== 'observer') continue

            // 根据阵营视角过滤
            if (view !== 'both' && ward.team !== view) continue

            const visionRadius = ward.getVisionRadius(isDaytime.value)
            const gridRadius = Math.ceil(visionRadius / VISION_GRID_SIZE)

            visionSimulator.updateVisibility(ward.gridX, ward.gridY, gridRadius)

            for (const key in visionSimulator.lights) {
                combinedVision.value.add(key)
            }
        }

        needsFogCacheUpdate.value = true
    }

    /**
     * 检查眼位是否即将过期
     */
    function isWardExpiring(ward: Ward): boolean {
        if (ward.type === 'sentry') return false
        const remaining = OBSERVER_DURATION - (gameTime.value - ward.placedAt)
        return remaining > 0 && remaining < 30
    }

    /**
     * 眼位命中检测
     */
    function hitTestWard(worldPoint: Point): Ward | null {
        const hitRadius = 100
        for (const ward of wards.value) {
            const dx = worldPoint.x - ward.worldX
            const dy = worldPoint.y - ward.worldY
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                return ward
            }
        }
        return null
    }

    /**
     * 获取眼位显示半径（画布像素）
     */
    function getWardDisplayRadius(ward: Ward, canvasSize: number): number {
        const worldSize = WORLD_MAX - WORLD_MIN
        if (ward.type === 'sentry') {
            return SENTRY_TRUE_SIGHT_RADIUS / (worldSize / canvasSize)
        }
        const visionRadius = ward.getVisionRadius(isDaytime.value)
        return visionRadius / (worldSize / canvasSize)
    }

    /**
     * 设置游戏时间（外部调用）
     */
    function setGameTime(time: number): void {
        gameTime.value = time
    }

    /**
     * 设置日夜状态（外部调用）
     */
    function setDaytime(isDay: boolean): void {
        if (isDaytime.value === isDay) return // 避免重复计算

        isDaytime.value = isDay

        // 日夜变化时清除建筑视野缓存并重新计算
        clearBuildingVisionCache()
        updateCombinedVision()
    }

    /**
     * 清除建筑视野缓存（日夜切换时调用）
     */
    function clearBuildingVisionCache(): void {
        buildingVisionCache = {
            radiant: { day: null, night: null },
            dire: { day: null, night: null }
        }
    }

    return {
        // 状态
        visionReady,
        wards,
        currentTeam,
        currentView,
        combinedVision,
        needsFogCacheUpdate,
        selectedWardId,
        selectedTower,
        selectedTowerVision,

        // 方法
        initialize,
        placeWard,
        removeWard,
        clearAllWards,
        moveWard,
        updateCombinedVision,
        isWardExpiring,
        hitTestWard,
        getWardDisplayRadius,
        setGameTime,
        setDaytime,
        clearBuildingVisionCache,

        // 常量
        OBSERVER_DURATION,
        SENTRY_TRUE_SIGHT_RADIUS
    }
}
