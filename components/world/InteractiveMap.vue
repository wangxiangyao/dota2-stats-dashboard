<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { VisionSimulation, xy2key, key2pt } from '@/utils/vision'

// ===== 类型定义 =====
interface Point {
  x: number
  y: number
}

interface PathNode {
  x: number
  y: number
  g: number
  h: number
  f: number
  parent: PathNode | null
}

interface MapEntity {
  x: number
  y: number
  z?: number
  name?: string
  team?: number
}

interface MapData {
  npc_dota_neutral_spawner?: MapEntity[]
  npc_dota_watch_tower?: MapEntity[]
  ent_dota_fountain?: MapEntity[]
  ent_dota_tree?: MapEntity[]
  npc_dota_tower?: MapEntity[]
  npc_dota_fort?: MapEntity[]
  dota_item_rune_spawner_powerup?: MapEntity[]
  dota_item_rune_spawner_bounty?: MapEntity[]
}

// 营地类型配置
interface CampTypeConfig {
  id: number
  x: number
  y: number
  type: 'small' | 'medium' | 'large' | 'ancient' | null
  note: string
}

// 野怪属性
interface CreepStats {
  id: string
  hp: number
  goldMin: number
  goldMax: number
  xp: number
  level: number
}

// 选中的实体
type EntityType = 'camp' | 'tower' | 'fountain' | 'fort' | 'outpost'
interface SelectedEntity {
  type: EntityType
  data: MapEntity
  campType?: 'small' | 'medium' | 'large' | 'ancient' | null
  campNote?: string
  index?: number
}

// ===== 常量定义（官方参数） =====
const MAP_VERSION = '7.40b'

// 世界坐标范围（来自 worlddata.json）
const WORLD_MIN = -9600
const WORLD_MAX = 9600
const WORLD_SIZE = WORLD_MAX - WORLD_MIN // 19200

// 导航网格采样粒度（与 generate_images.py 一致）
const NAV_CELL_SIZE = 8

// 英雄碰撞半径（大多数英雄是 24 单位）
const HERO_COLLISION_RADIUS = 24
// 碰撞半径对应的导航图像素数（向上取整）
const COLLISION_CELLS = Math.ceil(HERO_COLLISION_RADIUS / NAV_CELL_SIZE)  // = 3

// ===== 颜色常量 =====
// 阵营颜色（统一应用到防御塔、基地、眼等）
const TEAM_COLORS = {
  radiant: '#32cd32',  // 天辉：鲜艳绿色（lime green）
  dire: '#dc143c'      // 夜魇：猩红色（crimson）
}
// 树木颜色（青绿色/翠绿色，与阵营的鲜绿区分）
const TREE_COLOR = 'rgba(50, 160, 140, 0.8)'  // 青绿色
const TREE_DESTROYED_COLOR = 'rgba(90, 90, 95, 0.5)'

// ===== 状态 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 导航数据（从 gridnav.png 读取，纯地形不含树木）
const navData = ref<Uint8ClampedArray | null>(null)
const navWidth = ref(0)
const navHeight = ref(0)

// 地图底图
const mapImage = ref<HTMLImageElement | null>(null)

// 交互状态
const startPoint = ref<Point | null>(null)
const endPoint = ref<Point | null>(null)
const path = ref<Point[]>([])
const isSettingStart = ref(true)

// 移速输入
const moveSpeed = ref(300)

// 图层控制
const showNavGrid = ref(true)
const showTrees = ref(true)
const showNeutralCamps = ref(true)
const showBuildings = ref(true)
const showTowers = ref(true)
const showRunes = ref(true)

// 缩放和拖拽
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

// 地图实体数据
const mapEntities = ref<MapData | null>(null)

// 树木索引（用于寻路和砍树）
const treeIndex = ref<Map<string, MapEntity>>(new Map())
const destroyedTrees = ref<Set<string>>(new Set())

// 离屏canvas缓存（性能优化）
let navGridCache: HTMLCanvasElement | null = null
let treeLayerCache: HTMLCanvasElement | null = null
let needsTreeCacheUpdate = true
let fogOfWarCache: HTMLCanvasElement | null = null
let needsFogCacheUpdate = true

// 详情面板状态
const selectedEntity = ref<SelectedEntity | null>(null)
const popupPosition = ref<{ x: number, y: number } | null>(null)
const campTypes = ref<CampTypeConfig[]>([])
const neutralsData = ref<any>(null)
const buildingsData = ref<any>(null)

// 图标配置和雪碧图
interface IconConfig {
  col: number
  row: number
  subCol: number
  subRow: number
  size: number
  note: string
}
interface IconsData {
  meta: { spriteSheet: string, cellSize: number }
  icons: Record<string, IconConfig>
}
const iconsConfig = ref<IconsData | null>(null)
const spriteSheet = ref<HTMLImageElement | null>(null)

// ===== 右键菜单系统 =====
interface ContextMenuItem {
  label: string
  icon: string
  action: () => void
  disabled?: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  worldPoint?: Point  // 右键点击的世界坐标
}

const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: []
})

// ===== 游戏时间系统 =====
const gameTime = ref(0)  // 秒，0 ~ 3600
const isPlaying = ref(false)
const playSpeed = ref(1)  // 1x, 2x, 4x

// 日夜状态（每 5 分钟切换）
const isDaytime = computed(() => Math.floor(gameTime.value / 300) % 2 === 0)

// 野怪死亡时间记录（营地索引 -> 死亡时的游戏时间）
const campDeathTime = ref<Map<number, number>>(new Map())

// ===== 眼位系统 =====
// 阵营类型
type Team = 'radiant' | 'dire'

// 眼位类型
type WardType = 'observer' | 'sentry'

// 眼位数据结构
interface Ward {
  id: number
  type: WardType
  team: Team  // 所属阵营
  worldX: number
  worldY: number
  gridX: number
  gridY: number
  placedAt: number  // 放置时的游戏时间
}

// 眼位列表
const wards = ref<Ward[]>([])
let wardIdCounter = 0

// 当前放置模式
const currentWardMode = ref<WardType | null>(null)

// 当前操作阵营
const currentTeam = ref<Team>('radiant')

// 视野控制
const showFogOfWar = ref(true)
const showVisionCircles = ref(true)

// 眼位选中和拖拽状态
const selectedWardId = ref<number | null>(null)
const isDraggingWard = ref(false)

// 视野模拟器实例
let visionSimulator: VisionSimulation | null = null
let visionReady = ref(false)

// 视野缓存（每次眼位变化时重新计算）
const combinedVision = ref<Set<string>>(new Set())

// 眼位视野半径（游戏单位）
const OBSERVER_VISION_RADIUS_DAY = 1600
const OBSERVER_VISION_RADIUS_NIGHT = 1600
const SENTRY_VISION_RADIUS = 150  // 真眼不提供视野，只反隐
const SENTRY_TRUE_SIGHT_RADIUS = 900

// 眼位持续时间（秒）
const OBSERVER_DURATION = 360  // 6 分钟
const SENTRY_DURATION = Infinity  // 永久（直到被摧毁）

// 防御塔视野半径（游戏单位）
const TOWER_VISION = {
  tier1: { day: 1900, night: 600 },
  tier2: { day: 1900, night: 1100 },
  tier3: { day: 1900, night: 1100 },
  tier4: { day: 1900, night: 1100 }
}

// 基地视野半径（游戏单位，日夜相同）
const ANCIENT_VISION_RADIUS = 2600

// 视野网格大小（与 map_data.png 一致，generate_images.py 中 GRID_CELL_SIZE = 8）
const VISION_GRID_SIZE = 64  // 视野计算使用 64 单位网格（301×301），渲染时缩放到画布

// ===== 计算属性 =====
// 路径长度（游戏单位）
const pathLength = computed(() => {
  if (path.value.length < 2) return 0
  let total = 0
  for (let i = 1; i < path.value.length; i++) {
    const dx = path.value[i].x - path.value[i - 1].x
    const dy = path.value[i].y - path.value[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return Math.round(total)
})

// 移动时间（秒）
const travelTime = computed(() => {
  if (pathLength.value === 0 || moveSpeed.value <= 0) return 0
  return pathLength.value / moveSpeed.value
})

// 格式化时间
const formattedTime = computed(() => {
  const seconds = travelTime.value
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return `${mins} 分 ${secs} 秒`
})

// 格式化游戏时间（秒 -> mm:ss）
const formatGameTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 播放/暂停游戏时间
let animationFrameId: number | null = null
let lastFrameTime = 0

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    lastFrameTime = performance.now()
    animationFrameId = requestAnimationFrame(updateGameTime)
  } else if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

const updateGameTime = (currentTime: number) => {
  if (!isPlaying.value) return
  
  const deltaTime = (currentTime - lastFrameTime) / 1000  // 秒
  lastFrameTime = currentTime
  
  gameTime.value = Math.min(3600, gameTime.value + deltaTime * playSpeed.value)
  
  if (gameTime.value >= 3600) {
    isPlaying.value = false
    return
  }
  
  draw()
  animationFrameId = requestAnimationFrame(updateGameTime)
}

// ===== 详情面板辅助函数 =====
// 获取营地类型名称
const getCampTypeName = (type: string | null | undefined): string => {
  const names: Record<string, string> = {
    small: '小野',
    medium: '中野',
    large: '大野',
    ancient: '远古'
  }
  return type ? names[type] || type : '未标注'
}

// 获取营地金币范围
const getCampGoldRange = (type: string): string => {
  const campData = neutralsData.value?.camps?.[type]
  if (!campData?.creeps) return '-'
  
  let minGold = 0, maxGold = 0
  for (const creep of Object.values(campData.creeps) as any[]) {
    minGold += creep.goldMin || 0
    maxGold += creep.goldMax || 0
  }
  return `${minGold}-${maxGold}`
}

// 获取营地经验范围
const getCampXpRange = (type: string): string => {
  const campData = neutralsData.value?.camps?.[type]
  if (!campData?.creeps) return '-'
  
  let totalXp = 0
  for (const creep of Object.values(campData.creeps) as any[]) {
    totalXp += creep.xp || 0
  }
  return totalXp.toString()
}

// 获取塔等级
const getTowerTier = (name: string | undefined): string => {
  if (!name) return '未知'
  if (name.includes('tower1')) return '一塔'
  if (name.includes('tower2')) return '二塔'
  if (name.includes('tower3')) return '高地塔'
  if (name.includes('tower4')) return '门塔'
  return '未知'
}

// ===== 眼位系统函数 =====

// 初始化视野模拟器
const initVisionSimulator = async () => {
  if (visionSimulator) return
  
  const worlddata = {
    worldMinX: WORLD_MIN,
    worldMinY: WORLD_MIN,
    worldMaxX: WORLD_MAX,
    worldMaxY: WORLD_MAX
  }
  
  visionSimulator = new VisionSimulation(worlddata, { gridCellSize: VISION_GRID_SIZE })
  
  try {
    await visionSimulator.initialize(`/data/map/${MAP_VERSION}/vision_data.json`)
    visionReady.value = true
    console.log('视野模拟器初始化完成')
    // 初始化建筑视野（防御塔、基地）
    updateCombinedVision()
    draw()
  } catch (err) {
    console.error('视野模拟器初始化失败:', err)
    visionReady.value = false
  }
}

// 放置眼位
const placeWard = (worldX: number, worldY: number, type: WardType) => {
  if (!visionSimulator || !visionReady.value) return false
  
  const gridPt = visionSimulator.WorldXYtoGridXY(worldX, worldY)
  
  // 检查是否可以放眼（不能放在不可行走区域和禁眼区）
  if (!visionSimulator.isValidXY(gridPt.x, gridPt.y, true, true, true)) {
    console.log('无法在此位置放眼')
    return false
  }
  
  const ward: Ward = {
    id: wardIdCounter++,
    type,
    team: currentTeam.value,
    worldX,
    worldY,
    gridX: gridPt.x,
    gridY: gridPt.y,
    placedAt: gameTime.value
  }
  
  wards.value.push(ward)
  updateCombinedVision()
  return true
}

// 移除眼位
const removeWard = (wardId: number) => {
  const idx = wards.value.findIndex(w => w.id === wardId)
  if (idx !== -1) {
    wards.value.splice(idx, 1)
    updateCombinedVision()
  }
}

// 清除所有眼位
const clearAllWards = () => {
  wards.value = []
  combinedVision.value.clear()
}

// 建筑视野缓存（日/夜分别缓存）
let buildingVisionCacheDay: Set<string> | null = null
let buildingVisionCacheNight: Set<string> | null = null

// 计算并缓存建筑视野（性能优化：抑制 console.log）
const computeBuildingVision = (isDay: boolean): Set<string> => {
  if (!visionSimulator) return new Set()
  
  const result = new Set<string>()
  
  // 临时禁用 console.log 以避免建筑视野计算时的大量日志输出
  const originalLog = console.log
  console.log = () => {}
  
  try {
    // 计算防御塔视野
    const towers = mapEntities.value?.npc_dota_tower || []
    for (const tower of towers) {
      const name = tower.name || ''
      let visionRadius: number
      if (name.includes('_tower1_')) {
        visionRadius = isDay ? TOWER_VISION.tier1.day : TOWER_VISION.tier1.night
      } else {
        visionRadius = isDay ? TOWER_VISION.tier2.day : TOWER_VISION.tier2.night
      }
      
      const gridRadius = Math.ceil(visionRadius / VISION_GRID_SIZE)
      const gridPt = visionSimulator.WorldXYtoGridXY(tower.x, tower.y)
      
      // 调用视野计算（lights 每次会被清空并重新填充）
      visionSimulator.updateVisibility(gridPt.x, gridPt.y, gridRadius)
      
      // 立即收集本次计算的结果
      for (const key in visionSimulator.lights) {
        result.add(key)
      }
    }
    
    // 计算基地视野
    const ancients = mapEntities.value?.npc_dota_fort || []
    for (const ancient of ancients) {
      const gridRadius = Math.ceil(ANCIENT_VISION_RADIUS / VISION_GRID_SIZE)
      const gridPt = visionSimulator.WorldXYtoGridXY(ancient.x, ancient.y)
      
      visionSimulator.updateVisibility(gridPt.x, gridPt.y, gridRadius)
      
      for (const key in visionSimulator.lights) {
        result.add(key)
      }
    }
  } finally {
    // 恢复 console.log
    console.log = originalLog
  }
  
  console.log(`建筑视野计算完成 (${isDay ? '日间' : '夜间'}): ${result.size} 个视野点`)
  return result
}

// 获取建筑视野（使用缓存）
const getBuildingVision = (): Set<string> => {
  if (isDaytime.value) {
    if (!buildingVisionCacheDay) {
      buildingVisionCacheDay = computeBuildingVision(true)
    }
    return buildingVisionCacheDay
  } else {
    if (!buildingVisionCacheNight) {
      buildingVisionCacheNight = computeBuildingVision(false)
    }
    return buildingVisionCacheNight
  }
}

// 更新合并视野（眼位 + 缓存的建筑视野）
const updateCombinedVision = () => {
  if (!visionSimulator || !visionReady.value) return
  
  combinedVision.value.clear()
  
  // 1. 添加缓存的建筑视野
  const buildingVision = getBuildingVision()
  for (const key of buildingVision) {
    combinedVision.value.add(key)
  }
  
  // 2. 计算眼位视野
  const now = gameTime.value
  const activeWards = wards.value.filter(w => {
    if (w.type === 'sentry') return true
    return (now - w.placedAt) < OBSERVER_DURATION
  })
  
  if (activeWards.length !== wards.value.length) {
    wards.value = activeWards
  }
  
  for (const ward of activeWards) {
    if (ward.type !== 'observer') continue
    
    const visionRadius = isDaytime.value ? OBSERVER_VISION_RADIUS_DAY : OBSERVER_VISION_RADIUS_NIGHT
    const gridRadius = Math.ceil(visionRadius / VISION_GRID_SIZE)
    
    visionSimulator.updateVisibility(ward.gridX, ward.gridY, gridRadius)
    
    for (const key in visionSimulator.lights) {
      combinedVision.value.add(key)
    }
  }
  
  // 标记迷雾缓存需要更新
  needsFogCacheUpdate = true
}

// 获取眼位显示半径（画布像素）
const getWardDisplayRadius = (ward: Ward): number => {
  if (ward.type === 'sentry') {
    return SENTRY_TRUE_SIGHT_RADIUS / (WORLD_SIZE / navWidth.value)
  }
  const visionRadius = isDaytime.value ? OBSERVER_VISION_RADIUS_DAY : OBSERVER_VISION_RADIUS_NIGHT
  return visionRadius / (WORLD_SIZE / navWidth.value)
}

// 检查眼位是否即将过期（闪烁提示）
const isWardExpiring = (ward: Ward): boolean => {
  if (ward.type === 'sentry') return false
  const remaining = OBSERVER_DURATION - (gameTime.value - ward.placedAt)
  return remaining > 0 && remaining < 30  // 最后 30 秒闪烁
}

// 眼位命中检测
const hitTestWard = (worldPoint: Point): Ward | null => {
  const hitRadius = 100 // 游戏单位
  for (const ward of wards.value) {
    const dx = worldPoint.x - ward.worldX
    const dy = worldPoint.y - ward.worldY
    if (dx * dx + dy * dy < hitRadius * hitRadius) {
      return ward
    }
  }
  return null
}

// ===== 坐标转换（官方公式） =====
// 世界坐标 -> 画布坐标（Y轴翻转）
// 公式参考 dota-map-coordinates: grid_to_image (gX, gridHeight - gY - 1)
const worldToCanvas = (worldX: number, worldY: number): Point => {
  const canvasSize = navWidth.value || 2401
  const x = ((worldX - WORLD_MIN) / WORLD_SIZE) * canvasSize
  const y = ((WORLD_MAX - worldY) / WORLD_SIZE) * canvasSize  // Y轴翻转
  return { x, y }
}

// 画布坐标 -> 世界坐标
const canvasToWorld = (canvasX: number, canvasY: number): Point => {
  const canvasSize = navWidth.value || 2401
  const x = (canvasX / canvasSize) * WORLD_SIZE + WORLD_MIN
  const y = WORLD_MAX - (canvasY / canvasSize) * WORLD_SIZE  // Y轴翻转
  return { x, y }
}

// 世界坐标 -> 导航图像素坐标
const worldToNav = (worldX: number, worldY: number): Point => {
  const gX = Math.round((worldX - WORLD_MIN) / NAV_CELL_SIZE)
  const gY = Math.round((worldY - WORLD_MIN) / NAV_CELL_SIZE)
  const x = gX
  const y = navHeight.value - gY - 1  // Y轴翻转
  return {
    x: Math.max(0, Math.min(navWidth.value - 1, x)),
    y: Math.max(0, Math.min(navHeight.value - 1, y))
  }
}

// 导航图像素坐标 -> 世界坐标
const navToWorld = (navX: number, navY: number): Point => {
  const gX = navX
  const gY = navHeight.value - navY - 1  // Y轴翻转
  const x = gX * NAV_CELL_SIZE + WORLD_MIN
  const y = gY * NAV_CELL_SIZE + WORLD_MIN
  return { x, y }
}


// ===== 可行走检测 =====
// 检查单个像素是否可通行
const isPixelWalkable = (navX: number, navY: number): boolean => {
  if (!navData.value) return false
  if (navX < 0 || navX >= navWidth.value || navY < 0 || navY >= navHeight.value) return false
  
  const idx = (navY * navWidth.value + navX) * 4
  return navData.value[idx] > 128
}

// 检查一个位置是否可行走（考虑英雄碰撞半径）
const isWalkable = (navX: number, navY: number): boolean => {
  if (!navData.value) return false
  
  // 检查碰撞半径范围内的所有像素
  for (let dx = -COLLISION_CELLS; dx <= COLLISION_CELLS; dx++) {
    for (let dy = -COLLISION_CELLS; dy <= COLLISION_CELLS; dy++) {
      // 只检查圆形范围内的像素
      if (dx * dx + dy * dy <= COLLISION_CELLS * COLLISION_CELLS) {
        if (!isPixelWalkable(navX + dx, navY + dy)) {
          return false
        }
      }
    }
  }
  
  // 检查树木障碍
  if (showTrees.value && treeIndex.value.size > 0) {
    const worldPos = navToWorld(navX, navY)
    const treeGX = Math.floor((worldPos.x - WORLD_MIN) / 64)
    const treeGY = Math.floor((worldPos.y - WORLD_MIN) / 64)
    
    // 搜索周围 3x3 范围的树木格子
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${treeGX + dx},${treeGY + dy}`
        if (treeIndex.value.has(key) && !destroyedTrees.value.has(key)) {
          const tree = treeIndex.value.get(key)!
          // 英雄碰撞半径(24) + 树木碰撞半径(64) = 88
          const collisionDist = HERO_COLLISION_RADIUS + 64
          if (Math.abs(worldPos.x - tree.x) < collisionDist && Math.abs(worldPos.y - tree.y) < collisionDist) {
            return false
          }
        }
      }
    }
  }
  
  return true
}

// ===== A* 寻路算法 =====
const heuristic = (ax: number, ay: number, bx: number, by: number): number => {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}

// 二叉堆（最小堆）实现优先队列
class MinHeap {
  private heap: { x: number, y: number, f: number }[] = []
  
  push(node: { x: number, y: number, f: number }) {
    this.heap.push(node)
    this.bubbleUp(this.heap.length - 1)
  }
  
  pop(): { x: number, y: number, f: number } | undefined {
    if (this.heap.length === 0) return undefined
    const min = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.bubbleDown(0)
    }
    return min
  }
  
  get length() { return this.heap.length }
  
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

const findPath = (start: Point, end: Point): Point[] => {
  const startNav = worldToNav(start.x, start.y)
  const endNav = worldToNav(end.x, end.y)

  if (!isWalkable(startNav.x, startNav.y) || !isWalkable(endNav.x, endNav.y)) {
    return []
  }

  // 使用步长降采样：在速度和精度间平衡
  const STEP = 4
  const sX = Math.round(startNav.x / STEP) * STEP
  const sY = Math.round(startNav.y / STEP) * STEP
  const eX = Math.round(endNav.x / STEP) * STEP
  const eY = Math.round(endNav.y / STEP) * STEP

  const gScore = new Map<string, number>()
  const parent = new Map<string, string | null>()
  const closedSet = new Set<string>()
  const openHeap = new MinHeap()
  
  const directions = [
    { dx: STEP, dy: 0, cost: STEP },
    { dx: -STEP, dy: 0, cost: STEP },
    { dx: 0, dy: STEP, cost: STEP },
    { dx: 0, dy: -STEP, cost: STEP },
    { dx: STEP, dy: STEP, cost: STEP * Math.SQRT2 },
    { dx: STEP, dy: -STEP, cost: STEP * Math.SQRT2 },
    { dx: -STEP, dy: STEP, cost: STEP * Math.SQRT2 },
    { dx: -STEP, dy: -STEP, cost: STEP * Math.SQRT2 }
  ]

  const startKey = `${sX},${sY}`
  gScore.set(startKey, 0)
  parent.set(startKey, null)
  openHeap.push({ x: sX, y: sY, f: heuristic(sX, sY, eX, eY) })

  let iterations = 0
  const maxIterations = 200000

  while (openHeap.length > 0 && iterations < maxIterations) {
    iterations++
    const current = openHeap.pop()!
    const currentKey = `${current.x},${current.y}`

    if (current.x === eX && current.y === eY) {
      const result: Point[] = []
      let key: string | null = currentKey
      while (key) {
        const [x, y] = key.split(',').map(Number)
        result.unshift(navToWorld(x, y))
        key = parent.get(key) || null
      }
      console.log(`寻路完成: ${iterations} 次迭代, ${result.length} 个路径点`)
      return result
    }

    if (closedSet.has(currentKey)) continue
    closedSet.add(currentKey)

    const currentG = gScore.get(currentKey) || 0

    for (const dir of directions) {
      const nx = current.x + dir.dx
      const ny = current.y + dir.dy
      const neighborKey = `${nx},${ny}`

      if (closedSet.has(neighborKey) || !isWalkable(nx, ny)) continue

      const tentativeG = currentG + dir.cost
      const existingG = gScore.get(neighborKey)
      
      if (existingG === undefined || tentativeG < existingG) {
        gScore.set(neighborKey, tentativeG)
        parent.set(neighborKey, currentKey)
        openHeap.push({ x: nx, y: ny, f: tentativeG + heuristic(nx, ny, eX, eY) })
      }
    }
  }

  console.log(`寻路失败: ${iterations} 次迭代`)
  return []
}

// ===== 绘制函数 =====
const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const canvasSize = navWidth.value || 2401
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 应用变换：translate + scale
  ctx.save()
  ctx.translate(offsetX.value, offsetY.value)
  ctx.scale(scale.value, scale.value)
  
  // 1. 绘制底图
  if (mapImage.value?.complete) {
    ctx.drawImage(mapImage.value, 0, 0, canvasSize, canvasSize)
  }
  
  // 2. 绘制导航网格
  if (showNavGrid.value && navData.value) {
    drawNavGrid(ctx, canvasSize)
  }
  
  // 3. 绘制树木（在迷雾之前）
  if (mapEntities.value && showTrees.value) {
    drawTrees(ctx)
  }
  
  // 4. 绘制战争迷雾（只影响底图和树木，不影响后续图标）
  // 条件：开启迷雾 + 视野模拟器就绪 + 有任何视野点（建筑或眼位）
  if (showFogOfWar.value && visionReady.value && combinedVision.value.size > 0) {
    drawFogOfWar(ctx, canvasSize)
  }
  
  // 5. 绘制其他实体图层（不受迷雾影响）
  if (mapEntities.value) {
    if (showBuildings.value) drawBuildings(ctx)
    if (showTowers.value) drawTowers(ctx)
    if (showNeutralCamps.value) drawNeutralCamps(ctx)
    if (showRunes.value) drawRunes(ctx)
  }
  
  // 6. 绘制路径和起终点
  drawOverlay(ctx)
  
  // 7. 绘制眼位和视野
  if (visionReady.value) {
    // 绘制选中眼位的视野区域
    if (showVisionCircles.value && selectedWardId.value !== null) {
      drawVisionArea(ctx, canvasSize)
    }
    
    // 绘制眼位图标
    if (wards.value.length > 0) {
      drawWards(ctx)
    }
  }
  
  ctx.restore()
  
  // 绘制缩放指示器（不受变换影响）
  if (scale.value !== 1) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(10, 10, 80, 24)
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`缩放: ${Math.round(scale.value * 100)}%`, 18, 22)
  }
}

// 构建导航网格缓存
const buildNavGridCache = () => {
  if (!navData.value) return
  
  navGridCache = document.createElement('canvas')
  navGridCache.width = navWidth.value
  navGridCache.height = navHeight.value
  const ctx = navGridCache.getContext('2d')
  if (!ctx) return
  
  const imageData = ctx.createImageData(navWidth.value, navHeight.value)
  for (let y = 0; y < navHeight.value; y++) {
    for (let x = 0; x < navWidth.value; x++) {
      const idx = (y * navWidth.value + x) * 4
      if (navData.value[idx] <= 128) {
        imageData.data[idx] = 30
        imageData.data[idx + 1] = 30
        imageData.data[idx + 2] = 35
        imageData.data[idx + 3] = 180
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

// 绘制导航网格（使用缓存）
const drawNavGrid = (ctx: CanvasRenderingContext2D, canvasSize: number) => {
  if (!navGridCache) buildNavGridCache()
  if (navGridCache) {
    ctx.drawImage(navGridCache, 0, 0, canvasSize, canvasSize)
  }
}

// 构建树木图层缓存
const buildTreeCache = () => {
  const trees = mapEntities.value?.ent_dota_tree
  if (!trees) return
  
  const canvasSize = navWidth.value || 2401
  treeLayerCache = document.createElement('canvas')
  treeLayerCache.width = canvasSize
  treeLayerCache.height = canvasSize
  const ctx = treeLayerCache.getContext('2d')
  if (!ctx) return
  
  for (const tree of trees) {
    const gX = Math.round((tree.x - WORLD_MIN) / 64)
    const gY = Math.round((tree.y - WORLD_MIN) / 64)
    const key = `${gX},${gY}`
    const destroyed = destroyedTrees.value.has(key)
    
    ctx.fillStyle = destroyed ? TREE_DESTROYED_COLOR : TREE_COLOR
    const pos = worldToCanvas(tree.x, tree.y)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)  // 放大半径
    ctx.fill()
  }
  needsTreeCacheUpdate = false
}

// 绘制树木（使用缓存）
const drawTrees = (ctx: CanvasRenderingContext2D) => {
  if (!treeLayerCache || needsTreeCacheUpdate) buildTreeCache()
  if (treeLayerCache) {
    ctx.drawImage(treeLayerCache, 0, 0)
  }
}
// 着色图标缓存（key: iconName_color）
const tintedIconCache = new Map<string, HTMLCanvasElement>()

// 绘制雪碧图图标（支持颜色叠加，带缓存）
const drawIcon = (ctx: CanvasRenderingContext2D, iconName: string, worldX: number, worldY: number, displaySize: number = 32, tintColor?: string) => {
  if (!spriteSheet.value || !iconsConfig.value) return false
  
  const icon = iconsConfig.value.icons[iconName]
  if (!icon) return false
  
  const cellSize = iconsConfig.value.meta.cellSize
  const iconSize = cellSize * icon.size
  
  let sx = icon.col * cellSize
  let sy = icon.row * cellSize
  
  if (icon.size === 0.5) {
    sx += icon.subCol * (cellSize / 2)
    sy += icon.subRow * (cellSize / 2)
  }
  
  const pos = worldToCanvas(worldX, worldY)
  const halfSize = displaySize / 2
  
  if (tintColor) {
    // 使用缓存
    const cacheKey = `${iconName}_${tintColor}`
    let cachedCanvas = tintedIconCache.get(cacheKey)
    
    if (!cachedCanvas) {
      // 创建并缓存着色后的图标
      cachedCanvas = document.createElement('canvas')
      cachedCanvas.width = iconSize
      cachedCanvas.height = iconSize
      const tempCtx = cachedCanvas.getContext('2d')!
      
      tempCtx.drawImage(spriteSheet.value, sx, sy, iconSize, iconSize, 0, 0, iconSize, iconSize)
      // 使用 multiply 混合模式保留图标细节
      tempCtx.globalCompositeOperation = 'multiply'
      tempCtx.fillStyle = tintColor
      tempCtx.fillRect(0, 0, iconSize, iconSize)
      // 恢复透明度
      tempCtx.globalCompositeOperation = 'destination-in'
      tempCtx.drawImage(spriteSheet.value, sx, sy, iconSize, iconSize, 0, 0, iconSize, iconSize)
      
      tintedIconCache.set(cacheKey, cachedCanvas)
    }
    
    ctx.drawImage(cachedCanvas, pos.x - halfSize, pos.y - halfSize, displaySize, displaySize)
  } else {
    ctx.drawImage(spriteSheet.value, sx, sy, iconSize, iconSize, pos.x - halfSize, pos.y - halfSize, displaySize, displaySize)
  }
  return true
}

// 绘制野怪营地
const drawNeutralCamps = (ctx: CanvasRenderingContext2D) => {
  const camps = mapEntities.value?.npc_dota_neutral_spawner
  if (!camps) return
  
  // 营地类型到图标和颜色的配置
  const CAMP_CONFIG: Record<string, { icon: string, color: string, size: number }> = {
    small:  { icon: 'camp_small',  color: '#ffb347', size: 20 },
    medium: { icon: 'camp_medium', color: '#ff8c00', size: 24 },
    large:  { icon: 'camp_large',  color: '#e67300', size: 28 },
    ancient:{ icon: 'camp_ancient',color: '#cc5500', size: 36 }
  }
  const DEFAULT_CONFIG = { icon: 'camp_medium', color: '#ff8c00', size: 24 }
  const DEAD_COLOR = '#666666'  // 死亡状态颜色
  
  // 检查并刷新营地（整分钟刷新机制）
  // Dota 野怪在每分钟的 :00 刷新（游戏开始后第一波在 1:00 刷新）
  const currentMinute = Math.floor(gameTime.value / 60)
  
  for (let i = 0; i < camps.length; i++) {
    const camp = camps[i]
    const campIndex = i + 1
    
    // 检查是否应该刷新
    let isDead = false
    if (campDeathTime.value.has(campIndex)) {
      const deathTime = campDeathTime.value.get(campIndex)!
      const deathMinute = Math.floor(deathTime / 60)
      // 如果当前分钟 > 死亡时的分钟，说明已经过了一个整分钟刷新点
      if (currentMinute > deathMinute) {
        campDeathTime.value.delete(campIndex)
        isDead = false
      } else {
        isDead = true
      }
    }
    
    const campConfig = campTypes.value.find(c => c.x === camp.x && c.y === camp.y)
    const campType = campConfig?.type
    const config = campType ? CAMP_CONFIG[campType] : DEFAULT_CONFIG
    
    // 死亡状态使用灰色
    const color = isDead ? DEAD_COLOR : config.color
    
    // 设置透明度
    if (isDead) {
      ctx.globalAlpha = 0.5
    }
    
    // 图标随缩放变化，但有最小尺寸限制
    const displaySize = Math.max(config.size * 1.5, 16 / scale.value)
    
    // 尝试用图标渲染（带颜色叠加）
    if (drawIcon(ctx, config.icon, camp.x, camp.y, displaySize, color)) {
      ctx.globalAlpha = 1
      continue
    }
    
    // 回退到圆形
    const pos = worldToCanvas(camp.x, camp.y)
    ctx.fillStyle = color
    ctx.strokeStyle = isDead ? '#999' : '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, config.size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    ctx.globalAlpha = 1
  }
}

// 绘制建筑
const drawBuildings = (ctx: CanvasRenderingContext2D) => {
  const entities = mapEntities.value
  if (!entities) return
  
  // 前哨（使用图标）
  for (const outpost of entities.npc_dota_watch_tower || []) {
    if (drawIcon(ctx, 'outpost', outpost.x, outpost.y, 48)) continue
    // 回退
    const pos = worldToCanvas(outpost.x, outpost.y)
    ctx.fillStyle = '#9b59b6'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  
  // 泉水（保持原样，用户说不需要图标）
  for (const fountain of entities.ent_dota_fountain || []) {
    const pos = worldToCanvas(fountain.x, fountain.y)
    ctx.fillStyle = fountain.team === 2 ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 30px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⛲', pos.x, pos.y)
  }
  
  // 遗迹/基地（按阵营着色，尺寸约1000游戏单位）
  const ANCIENT_SIZE = 1000
  const canvasSize = navWidth.value || 2401
  const ancientDisplaySize = ANCIENT_SIZE / WORLD_SIZE * canvasSize
  
  for (const fort of entities.npc_dota_fort || []) {
    const isRadiant = fort.team === 2
    // 天辉用鲜艳绿色，夜魇用猩红色
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    
    if (drawIcon(ctx, 'ancient', fort.x, fort.y, ancientDisplaySize, color)) continue
    // 回退到菱形
    const pos = worldToCanvas(fort.x, fort.y)
    const halfSize = ancientDisplaySize / 2
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - halfSize)
    ctx.lineTo(pos.x + halfSize * 0.875, pos.y)
    ctx.lineTo(pos.x, pos.y + halfSize)
    ctx.lineTo(pos.x - halfSize * 0.875, pos.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

// 绘制防御塔（按实际体积显示，随缩放变化）
const drawTowers = (ctx: CanvasRenderingContext2D) => {
  const towers = mapEntities.value?.npc_dota_tower
  if (!towers) return
  
  // 防御塔碰撞半径: 144 游戏单位
  const TOWER_RADIUS = 144
  const canvasSize = navWidth.value || 2401
  // 游戏单位转画布像素
  const towerSize = (TOWER_RADIUS * 2) / WORLD_SIZE * canvasSize
  
  for (const tower of towers) {
    const isRadiant = tower.team === 2
    const name = tower.name || ''
    const isMid = name.includes('_mid_')
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    
    // 尝试用图标渲染
    const iconName = isMid ? 'tower_mid' : 'tower_side'
    if (drawIcon(ctx, iconName, tower.x, tower.y, towerSize, color)) continue
    
    // 回退到方块
    const pos = worldToCanvas(tower.x, tower.y)
    const halfSize = towerSize / 2
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.fillRect(pos.x - halfSize, pos.y - halfSize, towerSize, towerSize)
    ctx.strokeRect(pos.x - halfSize, pos.y - halfSize, towerSize, towerSize)
  }
}

// 绘制神符（图标随缩放变化，有最小尺寸限制）
const drawRunes = (ctx: CanvasRenderingContext2D) => {
  // 神符图标大小：随缩放变化，最小16像素
  const runeSize = Math.max(36, 16 / scale.value)
  
  // 力量神符（使用rune_spot图标）
  for (const rune of mapEntities.value?.dota_item_rune_spawner_powerup || []) {
    if (drawIcon(ctx, 'rune_spot', rune.x, rune.y, runeSize)) continue
    // 回退
    const pos = worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = 'rgba(155, 89, 182, 0.9)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    const s = 20
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - s)
    ctx.lineTo(pos.x + s, pos.y)
    ctx.lineTo(pos.x, pos.y + s)
    ctx.lineTo(pos.x - s, pos.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  
  // 赏金神符（使用rune_bounty图标）
  for (const rune of mapEntities.value?.dota_item_rune_spawner_bounty || []) {
    if (drawIcon(ctx, 'rune_bounty', rune.x, rune.y, runeSize)) continue
    // 回退
    const pos = worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = 'rgba(241, 196, 15, 0.9)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#000'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', pos.x, pos.y + 1)
  }
}

// 绘制路径和起终点
const drawOverlay = (ctx: CanvasRenderingContext2D) => {
  // 绘制路径
  if (path.value.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 8 / scale.value  // 放大线宽
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    const first = worldToCanvas(path.value[0].x, path.value[0].y)
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < path.value.length; i++) {
      const p = worldToCanvas(path.value[i].x, path.value[i].y)
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  
  // 起点
  if (startPoint.value) {
    const sp = worldToCanvas(startPoint.value.x, startPoint.value.y)
    ctx.beginPath()
    ctx.fillStyle = '#2ecc71'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3 / scale.value
    ctx.arc(sp.x, sp.y, 20 / scale.value, 0, Math.PI * 2)  // 放大半径
    ctx.fill()
    ctx.stroke()
  }
  
  // 终点
  if (endPoint.value) {
    const ep = worldToCanvas(endPoint.value.x, endPoint.value.y)
    ctx.beginPath()
    ctx.fillStyle = '#e74c3c'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3 / scale.value
    ctx.arc(ep.x, ep.y, 20 / scale.value, 0, Math.PI * 2)  // 放大半径
    ctx.fill()
    ctx.stroke()
  }
}

// 绘制视野区域（只绘制选中眼位的视野）
const drawVisionArea = (ctx: CanvasRenderingContext2D, canvasSize: number) => {
  if (!visionSimulator || selectedWardId.value === null) return
  
  // 找到选中的眼位
  const selectedWard = wards.value.find(w => w.id === selectedWardId.value)
  if (!selectedWard || selectedWard.type !== 'observer') return
  
  // 计算选中眼位的视野
  const visionRadius = isDaytime.value ? OBSERVER_VISION_RADIUS_DAY : OBSERVER_VISION_RADIUS_NIGHT
  const gridRadius = Math.ceil(visionRadius / VISION_GRID_SIZE)
  
  visionSimulator.updateVisibility(selectedWard.gridX, selectedWard.gridY, gridRadius)
  
  const cellPixels = canvasSize / visionSimulator.gridWidth
  
  ctx.save()
  ctx.fillStyle = 'rgba(255, 215, 0, 0.12)'  // 金黄色，更淡
  
  // 绘制每个可见网格单元
  for (const key in visionSimulator.lights) {
    const pt = key2pt(key)
    const imgX = pt.x
    const imgY = visionSimulator.gridHeight - pt.y - 1
    
    ctx.fillRect(
      imgX * cellPixels,
      imgY * cellPixels,
      cellPixels,
      cellPixels
    )
  }
  
  ctx.restore()
}

// 绘制眼位图标
const drawWards = (ctx: CanvasRenderingContext2D) => {
  // 使用全局阵营颜色
  const WARD_COLORS = {
    radiant: {
      observer: { fill: TEAM_COLORS.radiant, stroke: '#fff', circleColor: `${TEAM_COLORS.radiant}99` },
      sentry: { fill: TEAM_COLORS.radiant, stroke: '#fff', circleColor: `${TEAM_COLORS.radiant}99` }
    },
    dire: {
      observer: { fill: TEAM_COLORS.dire, stroke: '#fff', circleColor: `${TEAM_COLORS.dire}99` },
      sentry: { fill: TEAM_COLORS.dire, stroke: '#fff', circleColor: `${TEAM_COLORS.dire}99` }
    }
  }
  
  // 选中高亮颜色
  const SELECTED_COLOR = '#ffd700'  // 金黄色
  
  for (const ward of wards.value) {
    const pos = worldToCanvas(ward.worldX, ward.worldY)
    const isObserver = ward.type === 'observer'
    const expiring = isWardExpiring(ward)
    const colors = WARD_COLORS[ward.team][ward.type]
    const isSelected = selectedWardId.value === ward.id
    
    // 闪烁效果
    if (expiring && Math.floor(gameTime.value * 2) % 2 === 0) {
      continue // 隐藏帧
    }
    
    // 只有选中的眼位显示视野范围圈
    if (isSelected) {
      ctx.save()
      const displayRadius = getWardDisplayRadius(ward)
      
      // 选中时使用金黄色
      ctx.strokeStyle = SELECTED_COLOR
      ctx.lineWidth = 3 / scale.value
      ctx.setLineDash(isObserver ? [5, 5] : [3, 3])
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, displayRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    
    // 绘制眼位图标（使用雪碧图）
    const iconSize = 40 / scale.value
    const iconName = isObserver ? 'ward_observer' : 'ward_sentry'
    
    // 尝试使用雪碧图图标（带阵营颜色叠加）
    if (!drawIcon(ctx, iconName, ward.worldX, ward.worldY, iconSize, colors.fill)) {
      // 回退到圆圈绘制
      ctx.save()
      ctx.fillStyle = colors.fill
      ctx.strokeStyle = colors.stroke
      ctx.lineWidth = 2 / scale.value
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, iconSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    
    // 选中高亮环
    if (isSelected) {
      ctx.save()
      ctx.strokeStyle = SELECTED_COLOR
      ctx.lineWidth = 3 / scale.value
      ctx.setLineDash([])  // 实线
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, (iconSize / 2) + 6 / scale.value, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
}

// 构建迷雾图层缓存
const buildFogOfWarCache = (canvasSize: number) => {
  if (!visionSimulator || combinedVision.value.size === 0) return
  
  // 创建或重用离屏Canvas
  if (!fogOfWarCache) {
    fogOfWarCache = document.createElement('canvas')
  }
  fogOfWarCache.width = canvasSize
  fogOfWarCache.height = canvasSize
  
  const ctx = fogOfWarCache.getContext('2d')
  if (!ctx) return
  
  const cellPixels = canvasSize / visionSimulator.gridWidth
  
  // 先填充整个画布为迷雾颜色
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.fillRect(0, 0, canvasSize, canvasSize)
  
  // 使用 destination-out 模式清除可见区域
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  
  // 绘制 ImageData 更高效（避免逐个绘制矩形）
  for (const key of combinedVision.value) {
    const pt = key2pt(key)
    const imgX = pt.x
    const imgY = visionSimulator.gridHeight - pt.y - 1
    
    ctx.fillRect(
      imgX * cellPixels,
      imgY * cellPixels,
      cellPixels,
      cellPixels
    )
  }
  
  ctx.globalCompositeOperation = 'source-over'
  needsFogCacheUpdate = false
}

// 绘制战争迷雾（使用缓存）
const drawFogOfWar = (ctx: CanvasRenderingContext2D, canvasSize: number) => {
  if (!visionSimulator || combinedVision.value.size === 0) return
  
  // 需要更新缓存时重建
  if (needsFogCacheUpdate || !fogOfWarCache) {
    buildFogOfWarCache(canvasSize)
  }
  
  // 直接绘制缓存图像
  if (fogOfWarCache) {
    ctx.drawImage(fogOfWarCache, 0, 0, canvasSize, canvasSize)
  }
}

// ===== 事件处理 =====
// 获取点击的画布坐标（考虑变换）
const getCanvasCoords = (event: MouseEvent): Point | null => {
  const canvas = canvasRef.value
  if (!canvas) return null
  
  const rect = canvas.getBoundingClientRect()
  // 屏幕坐标 -> 画布内部坐标
  const screenX = (event.clientX - rect.left) / rect.width * canvas.width
  const screenY = (event.clientY - rect.top) / rect.height * canvas.height
  // 逆变换：canvasPos = (screenPos - offset) / scale
  const canvasX = (screenX - offsetX.value) / scale.value
  const canvasY = (screenY - offsetY.value) / scale.value
  return { x: canvasX, y: canvasY }
}

// 点击处理
const handleCanvasClick = (event: MouseEvent) => {
  if (!navData.value || isDragging.value || isDraggingWard.value) return
  
  const coords = getCanvasCoords(event)
  if (!coords) return
  
  const worldPoint = canvasToWorld(coords.x, coords.y)
  
  // 1. 优先检测眼位点击
  const hitWard = hitTestWard(worldPoint)
  if (hitWard) {
    // 点击已选中的眼位 -> 取消选中
    if (selectedWardId.value === hitWard.id) {
      selectedWardId.value = null
    } else {
      selectedWardId.value = hitWard.id
    }
    draw()
    return
  }
  
  // 2. 检测实体点击
  const hitEntity = hitTestEntity(worldPoint)
  if (hitEntity) {
    selectedWardId.value = null  // 取消眼位选中
    selectedEntity.value = hitEntity
    popupPosition.value = { x: event.clientX, y: event.clientY }
    draw()
    return
  }
  
  // 3. 点击空白处关闭详情面板和眼位选中
  if (selectedEntity.value || selectedWardId.value !== null) {
    selectedEntity.value = null
    popupPosition.value = null
    selectedWardId.value = null
    draw()
  }
}

// 命中检测：检查点击位置是否命中实体
const hitTestEntity = (worldPoint: Point): SelectedEntity | null => {
  const entities = mapEntities.value
  if (!entities) return null
  
  // 检测半径（世界坐标单位）
  const HIT_RADIUS = {
    camp: 200,
    tower: 150,
    fountain: 300,
    fort: 300,
    outpost: 200
  }
  
  // 计算距离
  const dist = (e: MapEntity) => Math.sqrt(
    Math.pow(worldPoint.x - e.x, 2) + Math.pow(worldPoint.y - e.y, 2)
  )
  
  // 检测野怪营地
  if (showNeutralCamps.value && entities.npc_dota_neutral_spawner) {
    for (let i = 0; i < entities.npc_dota_neutral_spawner.length; i++) {
      const camp = entities.npc_dota_neutral_spawner[i]
      if (dist(camp) < HIT_RADIUS.camp) {
        // 查找营地类型配置
        const campConfig = campTypes.value.find(c => c.x === camp.x && c.y === camp.y)
        return {
          type: 'camp',
          data: camp,
          campType: campConfig?.type || null,
          campNote: campConfig?.note || '',
          index: i + 1
        }
      }
    }
  }
  
  // 检测防御塔
  if (showTowers.value && entities.npc_dota_tower) {
    for (const tower of entities.npc_dota_tower) {
      if (dist(tower) < HIT_RADIUS.tower) {
        return { type: 'tower', data: tower }
      }
    }
  }
  
  // 检测泉水
  if (showBuildings.value && entities.ent_dota_fountain) {
    for (const fountain of entities.ent_dota_fountain) {
      if (dist(fountain) < HIT_RADIUS.fountain) {
        return { type: 'fountain', data: fountain }
      }
    }
  }
  
  // 检测遗迹
  if (showBuildings.value && entities.npc_dota_fort) {
    for (const fort of entities.npc_dota_fort) {
      if (dist(fort) < HIT_RADIUS.fort) {
        return { type: 'fort', data: fort }
      }
    }
  }
  
  // 检测前哨
  if (showBuildings.value && entities.npc_dota_watch_tower) {
    for (const outpost of entities.npc_dota_watch_tower) {
      if (dist(outpost) < HIT_RADIUS.outpost) {
        return { type: 'outpost', data: outpost }
      }
    }
  }
  
  return null
}

// 滚轮缩放（以鼠标位置为中心）
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const screenX = (event.clientX - rect.left) / rect.width * canvas.width
  const screenY = (event.clientY - rect.top) / rect.height * canvas.height
  
  // 当前鼠标对应的画布坐标
  const canvasX = (screenX - offsetX.value) / scale.value
  const canvasY = (screenY - offsetY.value) / scale.value
  
  // 计算新缩放
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.5, Math.min(4, scale.value * zoomFactor))
  
  // 调整偏移，使鼠标位置保持不变
  offsetX.value = screenX - canvasX * newScale
  offsetY.value = screenY - canvasY * newScale
  scale.value = newScale
  
  draw()
}

// 中键拖拽 & 眼位拖拽
const handleMouseDown = (event: MouseEvent) => {
  // 中键地图拖拽
  if (event.button === 1) {
    event.preventDefault()
    isDragging.value = true
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    return
  }
  
  // 左键眼位拖拽（需先选中眼位）
  if (event.button === 0 && selectedWardId.value !== null) {
    const coords = getCanvasCoords(event)
    if (!coords) return
    
    const worldPoint = canvasToWorld(coords.x, coords.y)
    const hitWard = hitTestWard(worldPoint)
    
    // 在选中的眼位上按下才开始拖拽
    if (hitWard && hitWard.id === selectedWardId.value) {
      isDraggingWard.value = true
      lastMousePos.value = { x: event.clientX, y: event.clientY }
    }
  }
}

const handleMouseMove = (event: MouseEvent) => {
  // 中键地图拖拽
  if (isDragging.value) {
    const canvas = canvasRef.value
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const deltaX = (event.clientX - lastMousePos.value.x) / rect.width * canvas.width
    const deltaY = (event.clientY - lastMousePos.value.y) / rect.height * canvas.height
    
    offsetX.value += deltaX
    offsetY.value += deltaY
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    
    draw()
    return
  }
  
  // 眼位拖拽
  if (isDraggingWard.value && selectedWardId.value !== null && visionSimulator) {
    const coords = getCanvasCoords(event)
    if (!coords) return
    
    const worldPoint = canvasToWorld(coords.x, coords.y)
    const ward = wards.value.find(w => w.id === selectedWardId.value)
    if (!ward) return
    
    const gridPt = visionSimulator.WorldXYtoGridXY(worldPoint.x, worldPoint.y)
    
    // 检查新位置是否可放眼
    if (visionSimulator.isValidXY(gridPt.x, gridPt.y, true, true, true)) {
      ward.worldX = worldPoint.x
      ward.worldY = worldPoint.y
      ward.gridX = gridPt.x
      ward.gridY = gridPt.y
      updateCombinedVision()
      draw()
    }
  }
}

const handleMouseUp = (event: MouseEvent) => {
  if (event.button === 1) {
    isDragging.value = false
  }
  if (event.button === 0) {
    isDraggingWard.value = false
  }
}

// 重置函数
const resetZoom = () => {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  draw()
}

const resetPoints = () => {
  startPoint.value = null
  endPoint.value = null
  path.value = []
  isSettingStart.value = true
  draw()
}

const resetTrees = () => {
  // 树木障碍已改为运行时动态计算，只需清空 destroyedTrees
  destroyedTrees.value.clear()
  needsTreeCacheUpdate = true
  draw()
}

// ===== 右键菜单处理 =====
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  // 计算点击的世界坐标
  const rect = canvas.getBoundingClientRect()
  const screenX = (event.clientX - rect.left) / rect.width * canvas.width
  const screenY = (event.clientY - rect.top) / rect.height * canvas.height
  const canvasX = (screenX - offsetX.value) / scale.value
  const canvasY = (screenY - offsetY.value) / scale.value
  const worldPoint = canvasToWorld(canvasX, canvasY)
  
  // 检测点击目标
  const hitEntity = hitTestEntity(worldPoint)
  const items: ContextMenuItem[] = []
  
  if (hitEntity?.type === 'camp') {
    // 野怪营地菜单
    const campIndex = hitEntity.index || 0
    const isDead = campDeathTime.value.has(campIndex)
    
    if (isDead) {
      items.push({
        label: '恢复营地',
        icon: '✅',
        action: () => {
          campDeathTime.value.delete(campIndex)
          draw()
        }
      })
    } else {
      items.push({
        label: '清野',
        icon: '🗡️',
        action: () => {
          campDeathTime.value.set(campIndex, gameTime.value)
          draw()
        }
      })
    }
  }
  
  // 检测树木
  const gX = Math.round((worldPoint.x - WORLD_MIN) / 64)
  const gY = Math.round((worldPoint.y - WORLD_MIN) / 64)
  const treeKey = `${gX},${gY}`
  
  if (showTrees.value && treeIndex.value.has(treeKey)) {
    const isChopped = destroyedTrees.value.has(treeKey)
    items.push({
      label: isChopped ? '恢复树木' : '砍树',
      icon: isChopped ? '🌲' : '🪓',
      action: () => {
        if (isChopped) {
          destroyedTrees.value.delete(treeKey)
        } else {
          destroyedTrees.value.add(treeKey)
        }
        // 同步更新视野系统中的树木状态
        if (visionSimulator && visionReady.value) {
          visionSimulator.toggleTree(gX, gY)
          updateCombinedVision()
        }
        needsTreeCacheUpdate = true
        draw()
      }
    })
  }
  
  // 通用菜单项（空白区域）
  items.push({
    label: '设为起点',
    icon: '📍',
    action: () => {
      const navPos = worldToNav(worldPoint.x, worldPoint.y)
      if (isWalkable(navPos.x, navPos.y)) {
        startPoint.value = worldPoint
        if (startPoint.value && endPoint.value) {
          path.value = findPath(startPoint.value, endPoint.value)
        }
        draw()
      }
    }
  })
  
  items.push({
    label: '设为终点',
    icon: '🎯',
    action: () => {
      const navPos = worldToNav(worldPoint.x, worldPoint.y)
      if (isWalkable(navPos.x, navPos.y)) {
        endPoint.value = worldPoint
        if (startPoint.value && endPoint.value) {
          path.value = findPath(startPoint.value, endPoint.value)
        }
        draw()
      }
    }
  })
  
  // 眼位相关选项
  if (visionReady.value) {
    // 检查是否点击了眼位
    const clickedWard = wards.value.find(w => {
      const dx = w.worldX - worldPoint.x
      const dy = w.worldY - worldPoint.y
      return Math.sqrt(dx * dx + dy * dy) < 100
    })
    
    if (clickedWard) {
      items.push({
        label: '移除眼位',
        icon: '❌',
        action: () => {
          removeWard(clickedWard.id)
          draw()
        }
      })
    } else {
      items.push({
        label: '放置假眼',
        icon: '👁',
        action: () => {
          if (placeWard(worldPoint.x, worldPoint.y, 'observer')) {
            draw()
          }
        }
      })
      
      items.push({
        label: '放置真眼',
        icon: '◉',
        action: () => {
          if (placeWard(worldPoint.x, worldPoint.y, 'sentry')) {
            draw()
          }
        }
      })
    }
    
    if (wards.value.length > 0) {
      items.push({
        label: '清除所有眼位',
        icon: '🧹',
        action: () => {
          clearAllWards()
          draw()
        }
      })
    }
  }
  
  if (startPoint.value || endPoint.value) {
    items.push({
      label: '清除路径',
      icon: '🔄',
      action: () => {
        resetPoints()
      }
    })
  }
  
  // 显示菜单
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    items,
    worldPoint
  }
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenu.value.visible = false
}

// 执行菜单项
const executeMenuItem = (item: ContextMenuItem) => {
  item.action()
  closeContextMenu()
}

// 构建树木索引
const buildTreeIndex = (trees: MapEntity[]) => {
  treeIndex.value.clear()
  for (const tree of trees) {
    const gX = Math.round((tree.x - WORLD_MIN) / 64)
    const gY = Math.round((tree.y - WORLD_MIN) / 64)
    treeIndex.value.set(`${gX},${gY}`, tree)
  }
}

// ===== 数据加载 =====
onMounted(async () => {
  try {
    const navImg = new Image()
    navImg.crossOrigin = 'anonymous'
    mapImage.value = new Image()

    // 加载导航图
    const navPromise = new Promise<void>((resolve, reject) => {
      navImg.onload = () => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = navImg.width
        tempCanvas.height = navImg.height
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) { reject(new Error('无法创建 canvas')); return }
        
        tempCtx.drawImage(navImg, 0, 0)
        const imageData = tempCtx.getImageData(0, 0, navImg.width, navImg.height)
        navData.value = imageData.data
        navWidth.value = navImg.width
        navHeight.value = navImg.height
        resolve()
      }
      navImg.onerror = () => reject(new Error('导航图加载失败'))
      navImg.src = `/images/map/${MAP_VERSION}/gridnav.png`
    })

    // 加载底图
    const mapPromise = new Promise<void>((resolve) => {
      mapImage.value!.onload = () => resolve()
      mapImage.value!.onerror = () => resolve()
      mapImage.value!.src = `/images/map/${MAP_VERSION}/minimap_accurate.png`
    })

    // 加载实体数据
    const loadEntities = async () => {
      try {
        const [trees, spawners, towers, forts, fountains, outposts, powerRunes, bountyRunes, campTypesData, neutrals, buildings, iconsData] = await Promise.all([
          fetch('/data/world/entities/trees.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/neutral-spawners.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/towers.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/forts.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/fountains.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/outposts.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/runes-power.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/runes-bounty.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/custom/neutral-camp-types.json').then(r => r.json()).catch(() => ({ camps: [] })),
          fetch('/data/world/neutrals.json').then(r => r.json()).catch(() => ({})),
          fetch('/data/world/buildings.json').then(r => r.json()).catch(() => ({})),
          fetch('/data/world/icons-config.json').then(r => r.json()).catch(() => null)
        ])
        
        mapEntities.value = {
          ent_dota_tree: trees.data,
          npc_dota_neutral_spawner: spawners.data,
          npc_dota_tower: towers.data,
          npc_dota_fort: forts.data,
          ent_dota_fountain: fountains.data,
          npc_dota_watch_tower: outposts.data,
          dota_item_rune_spawner_powerup: powerRunes.data,
          dota_item_rune_spawner_bounty: bountyRunes.data
        }
        
        // 加载营地类型配置和属性数据
        campTypes.value = campTypesData.camps || []
        neutralsData.value = neutrals
        buildingsData.value = buildings
        
        // 加载图标配置和雪碧图
        if (iconsData) {
          iconsConfig.value = iconsData
          const img = new Image()
          img.onload = () => {
            // 预处理：将特定背景色像素变成透明
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            
            // 需要透明化的背景色列表 [R, G, B]（可以添加更多）
            const bgColors = [
              [0, 0, 0],       // 纯黑
              [32, 32, 32],    // 深灰 #202020
              [48, 48, 48],    // 灰色 #303030
              [64, 64, 64],    // 浅灰 #404040
            ]
            const tolerance = 5  // 颜色容差
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2]
              // 检查是否匹配任一背景色
              for (const [br, bg, bb] of bgColors) {
                if (Math.abs(r - br) <= tolerance && 
                    Math.abs(g - bg) <= tolerance && 
                    Math.abs(b - bb) <= tolerance) {
                  data[i + 3] = 0  // alpha = 0
                  break
                }
              }
            }
            
            ctx.putImageData(imageData, 0, 0)
            
            // 创建处理后的图像
            const processedImg = new Image()
            processedImg.onload = () => {
              spriteSheet.value = processedImg
              draw()
            }
            processedImg.src = canvas.toDataURL()
          }
          img.src = iconsData.meta.spriteSheet
        }
        
        if (trees.data?.length > 0) {
          buildTreeIndex(trees.data)
        }
      } catch (err) {
        console.warn('地图实体加载失败:', err)
      }
    }

    await Promise.all([navPromise, mapPromise, loadEntities()])
    loading.value = false
    
    // 初始化视野模拟器（在后台加载，不阻塞渲染）
    initVisionSimulator()
    
    setTimeout(draw, 100)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载地图数据失败'
    loading.value = false
  }
})

watch(moveSpeed, () => {})

// 日夜切换时更新视野（建筑视野也会变化）
watch(isDaytime, () => {
  if (visionReady.value) {
    updateCombinedVision()
    draw()
  }
})
</script>

<template>
  <div class="map-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载地图数据中...</span>
    </div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="layout">
        <!-- 左侧控制面板 -->
        <aside class="panel">
          <!-- 寻路 -->
          <div class="section">
            <h3>🗺️ 寻路</h3>
            <div class="point-status">
              <div class="point-item" :class="{ active: isSettingStart }">
                <span class="marker start">起</span>
                <span>{{ startPoint ? `(${Math.round(startPoint.x)}, ${Math.round(startPoint.y)})` : '点击地图设置' }}</span>
              </div>
              <div class="point-item" :class="{ active: !isSettingStart && startPoint }">
                <span class="marker end">终</span>
                <span>{{ endPoint ? `(${Math.round(endPoint.x)}, ${Math.round(endPoint.y)})` : '点击地图设置' }}</span>
              </div>
            </div>
            <button class="btn" @click="resetPoints">🔄 重置起终点</button>
          </div>

          <!-- 计算结果 -->
          <div class="section" v-if="path.length > 0">
            <h3>📏 计算结果</h3>
            <div class="result-row">
              <span>路径长度</span>
              <span class="value">{{ pathLength.toLocaleString() }} 单位</span>
            </div>
            <div class="result-row highlight">
              <span>移动时间</span>
              <span class="value">{{ formattedTime }}</span>
            </div>
          </div>

          <div class="section warning" v-else-if="startPoint && endPoint">
            ⚠️ 未找到有效路径
          </div>

          <!-- 移速 -->
          <div class="section">
            <h3>🏃 移动速度</h3>
            <div class="speed-input">
              <input type="number" v-model.number="moveSpeed" min="100" max="700" step="10">
              <span class="unit">单位/秒</span>
            </div>
            <div class="speed-presets">
              <button @click="moveSpeed = 280">280</button>
              <button @click="moveSpeed = 325">325</button>
              <button @click="moveSpeed = 370">370</button>
              <button @click="moveSpeed = 400">400</button>
              <button @click="moveSpeed = 550">550</button>
            </div>
          </div>

          <!-- 图层 -->
          <div class="section">
            <h3>📊 图层</h3>
            <div class="layer-list">
              <label><input type="checkbox" v-model="showTowers" @change="draw"> 🗼 防御塔</label>
              <label><input type="checkbox" v-model="showRunes" @change="draw"> 💎 神符</label>
              <label><input type="checkbox" v-model="showNeutralCamps" @change="draw"> 🐺 野怪营地</label>
              <label><input type="checkbox" v-model="showBuildings" @change="draw"> 🏰 建筑</label>
              <label><input type="checkbox" v-model="showTrees" @change="draw"> 🌲 树木</label>
              <div class="tree-controls" v-if="showTrees">
                <small>Shift+点击砍树</small>
                <button class="small-btn" @click="resetTrees" :disabled="destroyedTrees.size === 0">
                  重置 ({{ destroyedTrees.size }})
                </button>
              </div>
              <label class="debug"><input type="checkbox" v-model="showNavGrid" @change="draw"> 📐 导航网格</label>
            </div>
          </div>

          <div class="section debug-info" v-if="showNavGrid">
            导航图: {{ navWidth }} x {{ navHeight }} px
          </div>

          <!-- 时间轴控制 -->
          <div class="section time-control">
            <h3>⏱️ 游戏时间</h3>
            <div class="time-bar">
              <button class="play-btn" @click="togglePlay">
                {{ isPlaying ? '⏸' : '▶' }}
              </button>
              <input 
                type="range" 
                class="time-slider"
                v-model.number="gameTime" 
                min="0" 
                max="3600" 
                step="1"
                @input="draw"
              >
              <span class="time-display">{{ formatGameTime(gameTime) }}</span>
              <span class="day-night-icon">{{ isDaytime ? '☀️' : '🌙' }}</span>
            </div>
            <div class="speed-controls">
              <span>速度:</span>
              <button 
                v-for="speed in [1, 2, 4]" 
                :key="speed"
                :class="{ active: playSpeed === speed }"
                @click="playSpeed = speed"
              >{{ speed }}x</button>
            </div>
            <div class="time-info">
              <span>已清营地: {{ campDeathTime.size }}</span>
              <button class="small-btn" @click="campDeathTime.clear(); draw()" :disabled="campDeathTime.size === 0">
                重置
              </button>
            </div>
          </div>

          <!-- 视野控制 -->
          <div class="section vision-control">
            <h3>👁 视野系统</h3>
            <div class="vision-status" v-if="!visionReady">
              <span class="loading-text">加载视野数据...</span>
            </div>
            <template v-else>
              <label class="checkbox-item">
                <input type="checkbox" v-model="showVisionCircles" @change="draw">
                <span>显示视野区域</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="showFogOfWar" @change="draw">
                <span>显示战争迷雾</span>
              </label>
              <div class="ward-info" v-if="wards.length > 0">
                <span>假眼: {{ wards.filter(w => w.type === 'observer').length }}</span>
                <span>真眼: {{ wards.filter(w => w.type === 'sentry').length }}</span>
                <button class="small-btn" @click="clearAllWards(); draw()">清除</button>
              </div>
              <div class="team-selector">
                <span>当前阵营:</span>
                <button 
                  class="team-btn radiant" 
                  :class="{ active: currentTeam === 'radiant' }"
                  @click="currentTeam = 'radiant'"
                >
                  天辉
                </button>
                <button 
                  class="team-btn dire" 
                  :class="{ active: currentTeam === 'dire' }"
                  @click="currentTeam = 'dire'"
                >
                  夜魇
                </button>
              </div>
              <div class="ward-tips">
                <small>💡 右键地图放置眼位</small>
              </div>
            </template>
          </div>
        </aside>

        <!-- 地图区域 -->
        <main class="map-area">
          <canvas
            ref="canvasRef"
            :width="navWidth || 2401"
            :height="navHeight || 2401"
            @click="handleCanvasClick"
            @wheel.prevent="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @contextmenu="handleContextMenu"
            class="map-canvas"
            :class="{ dragging: isDragging }"
          ></canvas>
          
          <div class="zoom-controls" v-if="scale !== 1">
            <button @click="resetZoom">↺ 重置缩放</button>
          </div>

          <!-- 实体详情浮窗 -->
          <div 
            class="entity-popup" 
            v-if="selectedEntity && popupPosition"
            :style="{ left: popupPosition.x + 'px', top: popupPosition.y + 'px' }"
          >
            <div class="popup-header">
              <h3>
                <template v-if="selectedEntity.type === 'camp'">🐺 野怪营地 #{{ selectedEntity.index }}</template>
                <template v-else-if="selectedEntity.type === 'tower'">🗼 防御塔</template>
                <template v-else-if="selectedEntity.type === 'fountain'">⛲ 泉水</template>
                <template v-else-if="selectedEntity.type === 'fort'">🏰 遗迹</template>
                <template v-else-if="selectedEntity.type === 'outpost'">🔭 前哨</template>
              </h3>
              <button class="close-btn" @click="selectedEntity = null; popupPosition = null">×</button>
            </div>
            
            <!-- 野怪营地详情 -->
            <template v-if="selectedEntity.type === 'camp'">
              <div class="popup-row">
                <span class="label">类型</span>
                <span class="value" :class="selectedEntity.campType || 'unknown'">
                  {{ getCampTypeName(selectedEntity.campType) }}
                </span>
              </div>
              <div class="popup-row" v-if="selectedEntity.campType && neutralsData?.camps?.[selectedEntity.campType]">
                <span class="label">💰 金币</span>
                <span class="value">{{ getCampGoldRange(selectedEntity.campType) }}</span>
              </div>
              <div class="popup-row" v-if="selectedEntity.campType && neutralsData?.camps?.[selectedEntity.campType]">
                <span class="label">⭐ 经验</span>
                <span class="value">{{ getCampXpRange(selectedEntity.campType) }}</span>
              </div>
              <div class="popup-row">
                <span class="label">🔄 刷新</span>
                <span class="value">60 秒</span>
              </div>
              <div class="popup-row note" v-if="selectedEntity.campNote">
                <span class="value">{{ selectedEntity.campNote }}</span>
              </div>
              <div class="popup-row coords">
                <span class="label">📍</span>
                <span class="value">({{ selectedEntity.data.x }}, {{ selectedEntity.data.y }})</span>
              </div>
            </template>
            
            <!-- 防御塔详情 -->
            <template v-else-if="selectedEntity.type === 'tower'">
              <div class="popup-row">
                <span class="label">阵营</span>
                <span class="value" :class="selectedEntity.data.team === 2 ? 'radiant' : 'dire'">
                  {{ selectedEntity.data.team === 2 ? '天辉' : '夜魇' }}
                </span>
              </div>
              <div class="popup-row">
                <span class="label">等级</span>
                <span class="value">{{ getTowerTier(selectedEntity.data.name) }}</span>
              </div>
              <div class="popup-row coords">
                <span class="label">📍</span>
                <span class="value">({{ Math.round(selectedEntity.data.x) }}, {{ Math.round(selectedEntity.data.y) }})</span>
              </div>
            </template>
            
            <!-- 泉水/遗迹/前哨详情 -->
            <template v-else>
              <div class="popup-row" v-if="selectedEntity.data.team">
                <span class="label">阵营</span>
                <span class="value" :class="selectedEntity.data.team === 2 ? 'radiant' : 'dire'">
                  {{ selectedEntity.data.team === 2 ? '天辉' : '夜魇' }}
                </span>
              </div>
              <div class="popup-row coords">
                <span class="label">📍</span>
                <span class="value">({{ Math.round(selectedEntity.data.x) }}, {{ Math.round(selectedEntity.data.y) }})</span>
              </div>
            </template>
          </div>

          <!-- 右键菜单 -->
          <div 
            class="context-menu" 
            v-if="contextMenu.visible"
            :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
            @click.stop
          >
            <div 
              class="context-menu-item"
              v-for="(item, index) in contextMenu.items"
              :key="index"
              :class="{ disabled: item.disabled }"
              @click="!item.disabled && executeMenuItem(item)"
            >
              <span class="icon">{{ item.icon }}</span>
              <span class="label">{{ item.label }}</span>
            </div>
          </div>

          <!-- 点击其他区域关闭菜单的遮罩 -->
          <div 
            class="context-menu-overlay" 
            v-if="contextMenu.visible"
            @click="closeContextMenu"
            @contextmenu.prevent="closeContextMenu"
          ></div>
        </main>
      </div>
    </template>
  </div>
</template>

<style scoped>
.map-container {
  height: 100%;
  min-height: 600px;
}

.layout {
  display: flex;
  gap: 1rem;
  height: 100%;
}

/* 控制面板 */
.panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
}

.section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.point-status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 0.85rem;
  opacity: 0.6;
}

.point-item.active {
  opacity: 1;
  border: 1px solid var(--primary);
}

.marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
}

.marker.start { background: #2ecc71; }
.marker.end { background: #e74c3c; }

.btn {
  width: 100%;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.result-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.result-row.highlight {
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(52, 152, 219, 0.2));
  border: 1px solid var(--primary);
}

.result-row .value { font-weight: 600; }

.warning {
  color: #f39c12;
  text-align: center;
}

.speed-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.speed-input input {
  flex: 1;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 1rem;
  text-align: center;
}

.speed-input .unit {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.speed-presets {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.speed-presets button {
  flex: 1;
  min-width: 45px;
  padding: 0.35rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.speed-presets button:hover {
  background: var(--primary);
  color: #fff;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.layer-list label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.layer-list label:hover { border-color: var(--primary); }
.layer-list label:has(input:checked) {
  background: rgba(46, 204, 113, 0.15);
  border-color: #2ecc71;
}

.layer-list label.debug { opacity: 0.7; }

.tree-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.5rem;
  margin-left: 1.5rem;
  background: rgba(34, 139, 34, 0.1);
  border-radius: 4px;
}

.tree-controls small {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.tree-controls .small-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}

.tree-controls .small-btn:hover:not(:disabled) {
  background: var(--primary);
  color: #fff;
}

.tree-controls .small-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.debug-info {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
}

/* 地图区域 */
.map-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.map-canvas {
  /* 强制保持 1:1 宽高比，避免坐标计算错误 */
  aspect-ratio: 1 / 1;
  max-width: calc(100vh - 200px);
  max-height: calc(100vh - 200px);
  border-radius: 4px;
  cursor: crosshair;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.map-canvas.dragging { cursor: grabbing; }

.zoom-controls {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
}

.zoom-controls button {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.zoom-controls button:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 8px;
}

/* 实体详情浮窗 */
.entity-popup {
  position: fixed;
  z-index: 1000;
  min-width: 180px;
  max-width: 240px;
  padding: 0.75rem;
  background: rgba(20, 25, 35, 0.95);
  border: 1px solid var(--primary);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transform: translate(10px, -50%);
  backdrop-filter: blur(8px);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.popup-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: #e74c3c;
}

.popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  font-size: 0.8rem;
}

.popup-row .label {
  color: var(--text-secondary);
}

.popup-row .value {
  font-weight: 600;
}

.popup-row .value.small { color: #87ceeb; }
.popup-row .value.medium { color: #90ee90; }
.popup-row .value.large { color: #ffa500; }
.popup-row .value.ancient { color: #ff6b6b; }
.popup-row .value.unknown { color: var(--text-secondary); font-style: italic; }
.popup-row .value.radiant { color: #2ecc71; }
.popup-row .value.dire { color: #e74c3c; }

.popup-row.coords {
  margin-top: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.popup-row.note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* ===== 右键菜单样式 ===== */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--bg-secondary, #2a2a2a);
  border: 1px solid var(--border, #444);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 140px;
  padding: 4px 0;
  animation: contextMenuFadeIn 0.1s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.9rem;
}

.context-menu-item:hover {
  background: var(--accent, #4a90d9);
  color: white;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.context-menu-item .icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.context-menu-item .label {
  flex: 1;
}

/* ===== 时间控制样式 ===== */
.time-control h3 {
  margin-bottom: 0.5rem;
}

.time-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.play-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--accent, #4a90d9);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.play-btn:hover {
  background: var(--accent-hover, #3a7bc8);
}

.time-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: var(--border, #444);
  border-radius: 3px;
  cursor: pointer;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent, #4a90d9);
  cursor: pointer;
}

.time-display {
  font-family: monospace;
  font-size: 0.9rem;
  min-width: 40px;
}

.day-night-icon {
  font-size: 1.2rem;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.speed-controls button {
  padding: 2px 8px;
  border: 1px solid var(--border, #444);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.speed-controls button:hover {
  border-color: var(--accent, #4a90d9);
}

.speed-controls button.active {
  background: var(--accent, #4a90d9);
  border-color: var(--accent, #4a90d9);
  color: white;
}

.time-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* ===== 视野控制样式 ===== */
.vision-control h3 {
  margin-bottom: 0.5rem;
}

.vision-status {
  padding: 0.5rem;
  text-align: center;
}

.loading-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.ward-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-secondary, #1e1e1e);
  border-radius: 4px;
  font-size: 0.85rem;
}

.ward-tips {
  margin-top: 0.5rem;
  color: var(--text-secondary);
}

.ward-tips small {
  font-size: 0.8rem;
}

.team-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.team-btn {
  padding: 0.25rem 0.75rem;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  opacity: 0.6;
}

.team-btn.radiant {
  background: #2d4a2d;
  color: #7ed321;
  border-color: #3d5a3d;
}

.team-btn.radiant.active {
  background: #3d6a3d;
  border-color: #7ed321;
  opacity: 1;
}

.team-btn.dire {
  background: #4a2d2d;
  color: #e74c3c;
  border-color: #5a3d3d;
}

.team-btn.dire.active {
  background: #6a3d3d;
  border-color: #e74c3c;
  opacity: 1;
}

.team-btn:hover {
  opacity: 0.9;
}
</style>
