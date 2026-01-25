/**
 * composables/useMapData.ts - 地图数据加载
 * 
 * 负责加载和管理地图相关数据：
 * - 导航网格图像 (gridnav.png)
 * - 地图底图 (minimap_accurate.png)
 * - 实体数据 (entities/*.json)
 * - 视野数据 (vision_data.json)
 */

import { ref, computed } from 'vue'
import { MAP_CONSTANTS } from '@/types/map'
import type { MapEntity, CampTypeConfig, IconsData } from '@/types/map'

const { VERSION } = MAP_CONSTANTS

/**
 * 地图数据状态
 */
export interface MapDataState {
    loading: boolean
    error: string | null

    // 导航数据
    navData: Uint8ClampedArray | null
    navWidth: number
    navHeight: number

    // 地图底图
    mapImage: HTMLImageElement | null

    // 实体数据（新格式：分文件）
    entities: {
        trees: MapEntity[]
        towers: MapEntity[]
        neutralSpawners: MapEntity[]
        fountains: MapEntity[]
        ancients: MapEntity[]  // npc_dota_fort
        outposts: MapEntity[]  // npc_dota_watch_tower
        powerupRunes: MapEntity[]
        bountyRunes: MapEntity[]
    }

    // 辅助数据
    campTypes: CampTypeConfig[]
    neutralsData: any
    buildingsData: any
    iconsConfig: IconsData | null
    spriteSheet: HTMLImageElement | null
}

export function useMapData() {
    // 状态
    const loading = ref(true)
    const error = ref<string | null>(null)

    // 导航数据
    const navData = ref<Uint8ClampedArray | null>(null)
    const navWidth = ref(0)
    const navHeight = ref(0)

    // 地图底图
    const mapImage = ref<HTMLImageElement | null>(null)

    // 实体数据
    const trees = ref<MapEntity[]>([])
    const towers = ref<MapEntity[]>([])
    const neutralSpawners = ref<MapEntity[]>([])
    const fountains = ref<MapEntity[]>([])
    const ancients = ref<MapEntity[]>([])
    const outposts = ref<MapEntity[]>([])
    const powerupRunes = ref<MapEntity[]>([])
    const bountyRunes = ref<MapEntity[]>([])

    // 辅助数据
    const campTypes = ref<CampTypeConfig[]>([])
    const neutralsData = ref<any>(null)
    const buildingsData = ref<any>(null)
    const iconsConfig = ref<IconsData | null>(null)
    const spriteSheet = ref<HTMLImageElement | null>(null)

    // 树木索引（用于寻路和砍树）
    const treeIndex = ref<Map<string, MapEntity>>(new Map())
    const destroyedTrees = ref<Set<string>>(new Set())

    /**
     * 加载导航网格图像
     */
    async function loadNavGrid(): Promise<void> {
        return new Promise((resolve, reject) => {
            const navImg = new Image()
            navImg.crossOrigin = 'anonymous'

            navImg.onload = () => {
                navWidth.value = navImg.width
                navHeight.value = navImg.height

                const canvas = document.createElement('canvas')
                canvas.width = navImg.width
                canvas.height = navImg.height
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(navImg, 0, 0)
                navData.value = ctx.getImageData(0, 0, navImg.width, navImg.height).data

                console.log(`导航网格加载完成: ${navImg.width}x${navImg.height}`)
                resolve()
            }

            navImg.onerror = () => reject(new Error('导航网格图像加载失败'))
            navImg.src = `/images/map/${VERSION}/gridnav.png`
        })
    }

    /**
     * 加载地图底图
     */
    async function loadMapImage(): Promise<void> {
        return new Promise((resolve) => {
            mapImage.value = new Image()
            mapImage.value.crossOrigin = 'anonymous'
            mapImage.value.onload = () => resolve()
            mapImage.value.onerror = () => resolve()  // 底图加载失败不阻塞
            mapImage.value.src = `/images/map/${VERSION}/minimap_accurate.png`
        })
    }

    /**
     * 加载实体数据（新格式：从 entities/*.json 加载）
     */
    async function loadEntities(): Promise<void> {
        const baseUrl = `/data/map/${VERSION}`

        // 并行加载实体文件（核心数据）
        const [
            treesData,
            towersData,
            spawnersData,
            fountainsData,
            ancientsData,
            outpostsData,
            powerupData,
            bountyData,
            iconsDataRes,
            // 新增：营地类型和建筑数据
            campTypesData,
            buildingsDataRes,
            neutralsDataRes
        ] = await Promise.all([
            fetch(`${baseUrl}/entities/ent_dota_tree.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/npc_dota_tower.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/npc_dota_neutral_spawner.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/ent_dota_fountain.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/npc_dota_fort.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/npc_dota_watch_tower.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/dota_item_rune_spawner_powerup.json`).then(r => r.ok ? r.json() : []),
            fetch(`${baseUrl}/entities/dota_item_rune_spawner_bounty.json`).then(r => r.ok ? r.json() : []),
            // 图标配置
            fetch('/data/world/icons-config.json').then(r => r.ok ? r.json() : null),
            // 营地类型（手工标注）
            fetch('/data/world/custom/neutral-camp-types.json').then(r => r.ok ? r.json() : null),
            // 建筑数据（防御塔属性等）
            fetch('/data/world/buildings.json').then(r => r.ok ? r.json() : null),
            // 野怪数据
            fetch('/data/world/neutrals.json').then(r => r.ok ? r.json() : null)
        ])

        trees.value = treesData
        towers.value = towersData
        neutralSpawners.value = spawnersData
        fountains.value = fountainsData
        ancients.value = ancientsData
        outposts.value = outpostsData
        powerupRunes.value = powerupData
        bountyRunes.value = bountyData
        iconsConfig.value = iconsDataRes

        // 营地类型配置（从手工标注数据）
        if (campTypesData?.camps) {
            campTypes.value = campTypesData.camps
        }

        // 建筑数据
        buildingsData.value = buildingsDataRes
        neutralsData.value = neutralsDataRes

        // 构建树木索引
        buildTreeIndex(trees.value)

        // 加载雪碧图
        if (iconsConfig.value?.meta?.spriteSheet) {
            await loadSpriteSheet(iconsConfig.value.meta.spriteSheet)
        }

        console.log(`实体数据加载完成: ${trees.value.length} 树木, ${towers.value.length} 防御塔, ${campTypes.value.length} 营地类型`)
    }

    /**
     * 构建树木索引
     */
    function buildTreeIndex(treeList: MapEntity[]) {
        treeIndex.value.clear()
        for (const tree of treeList) {
            // 使用 64 单位网格索引
            const gX = Math.floor((tree.x - (-9600)) / 64)
            const gY = Math.floor((tree.y - (-9600)) / 64)
            const key = `${gX},${gY}`
            treeIndex.value.set(key, tree)
        }
    }

    /**
     * 加载雪碧图
     */
    async function loadSpriteSheet(url: string): Promise<void> {
        return new Promise((resolve) => {
            spriteSheet.value = new Image()
            spriteSheet.value.onload = () => resolve()
            spriteSheet.value.onerror = () => resolve()
            spriteSheet.value.src = url
        })
    }

    /**
     * 初始化：加载所有数据
     */
    async function initialize(): Promise<void> {
        loading.value = true
        error.value = null

        try {
            await Promise.all([
                loadNavGrid(),
                loadMapImage(),
                loadEntities()
            ])

            loading.value = false
            console.log('地图数据初始化完成')
        } catch (err) {
            error.value = err instanceof Error ? err.message : '加载失败'
            loading.value = false
            throw err
        }
    }

    /**
     * 砍树
     */
    function destroyTree(key: string) {
        destroyedTrees.value.add(key)
    }

    /**
     * 重置树木
     */
    function resetTrees() {
        destroyedTrees.value.clear()
    }

    /**
     * 检查树木是否存活
     */
    function isTreeAlive(key: string): boolean {
        return treeIndex.value.has(key) && !destroyedTrees.value.has(key)
    }

    return {
        // 状态
        loading,
        error,

        // 导航数据
        navData,
        navWidth,
        navHeight,

        // 地图底图
        mapImage,

        // 实体数据
        trees,
        towers,
        neutralSpawners,
        fountains,
        ancients,
        outposts,
        powerupRunes,
        bountyRunes,

        // 辅助数据
        campTypes,
        neutralsData,
        buildingsData,
        iconsConfig,
        spriteSheet,

        // 树木管理
        treeIndex,
        destroyedTrees,
        destroyTree,
        resetTrees,
        isTreeAlive,

        // 方法
        initialize
    }
}
