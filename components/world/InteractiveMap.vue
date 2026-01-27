<script setup lang="ts">
/**
 * InteractiveMapV2.vue - 交互式地图组件（重构版）
 * 
 * 使用新的 composables 架构，支持：
 * - 模块化的数据加载
 * - 可扩展的视野系统
 * - 支持不同单位类型的寻路
 */

import { ref, computed, onMounted, watch, onUnmounted, shallowRef } from 'vue'

// 类型导入
import { 
  MAP_CONSTANTS,
  type Point, 
  type MapEntity, 
  type CampTypeConfig,
  type SelectedEntity,
  type EntityType,
  type WardType,
  type Ward,
  type Team,
  type TeamView,
  type ContextMenuItem,
  type ContextMenuState
} from '@/types/map'

// Composables 导入
import { useMapData } from '@/composables/useMapData'
import { useCoordinates } from '@/composables/useCoordinates'
import { usePathfinding } from '@/composables/usePathfinding'
import { useVision } from '@/composables/useVision'
import { useUnit } from '@/composables/useUnit'
import { useCombatLoop } from '@/composables/useCombatLoop'
import { getUnitColor, TEAM_RING_COLORS } from '@/types/unit'
import type { Unit, Hero, Creep } from '@/types/unit'

// 子组件导入
import MapControlPanel from './MapControlPanel.vue'
import MapContextMenu from './MapContextMenu.vue'
import EntityPopup from './EntityPopup.vue'
import TimeBar from './TimeBar.vue'

// 解构常量
const {
  VERSION: MAP_VERSION,
  WORLD_MIN,
  WORLD_MAX,
  WORLD_SIZE,
  NAV_CELL_SIZE,
  HERO_COLLISION_RADIUS,
  VISION_GRID_SIZE,
  TEAM_COLORS,
  OBSERVER_DURATION,
  SENTRY_TRUE_SIGHT_RADIUS,
  TOWER_VISION,
  OBSERVER_VISION_RADIUS_DAY,
  OBSERVER_VISION_RADIUS_NIGHT,
  SENTRY_VISION_RADIUS,
  ANCIENT_VISION_RADIUS
} = MAP_CONSTANTS

// ===== Composables 初始化 =====
const mapData = useMapData()

// 坐标转换（在 navData 加载后更新）
const coords = computed(() => useCoordinates(mapData.navWidth.value, mapData.navHeight.value))

// ===== 本地状态 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)

// ===== Unit 系统 =====
const unitSystem = useUnit()

// 移速输入（用于选中英雄的移速调整）
const moveSpeed = ref(300)

// 图层控制
const showNavGrid = ref(false)
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
const isDraggingWard = ref(false)
const isDraggingUnit = ref(false)  // 是否正在拖动英雄
const lastMousePos = ref({ x: 0, y: 0 })

// 详情面板
const selectedEntity = ref<SelectedEntity | null>(null)
const popupPosition = ref<{ x: number, y: number } | null>(null)

// 游戏时间系统
const gameTime = ref(0)  // 秒，0 ~ 3600
const isPlaying = ref(false)
const playSpeed = ref(1)  // 1x, 2x, 4x
const isDaytime = computed(() => Math.floor(gameTime.value / 300) % 2 === 0)

// 时间播放动画
let animationFrameId: number | null = null
let lastFrameTime = 0

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    // 启动所有有路径的单位移动
    for (const unit of unitSystem.getAllUnits()) {
      if (unit.pathPlan.currentPath.length > 0) {
        unitSystem.startMoving(unit.id)
      }
    }
    unitSystem.isPlanning.value = false
    
    lastFrameTime = performance.now()
    animationFrameId = requestAnimationFrame(updateGameTime)
  } else if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function updateGameTime(currentTime: number) {
  if (!isPlaying.value) return
  
  const deltaTime = (currentTime - lastFrameTime) / 1000
  lastFrameTime = currentTime
  
  const prevDaytime = isDaytime.value
  gameTime.value = Math.min(3600, gameTime.value + deltaTime * playSpeed.value)
  
  if (gameTime.value >= 3600) {
    isPlaying.value = false
    return
  }
  
  // 只在日夜真正切换时更新视野
  if (vision.value) {
    vision.value.setGameTime(gameTime.value)
    if (prevDaytime !== isDaytime.value) {
      vision.value.setDaytime(isDaytime.value)
      needsFogCacheUpdate = true
    }
  }
  
  // 更新单位位置（根据移速和路径移动）
  const actualDelta = deltaTime * playSpeed.value
  const hasMovingUnits = unitSystem.getAllUnits().some(u => u.pathPlan.isMoving)
  unitSystem.updateUnits(actualDelta)
  
  // 更新小兵模拟
  if (creepSimEnabled.value) {
    combatLoop.setGameTime(gameTime.value)
    combatLoop.update(actualDelta)
  }
  
  // 如果有单位在移动，更新视野
  if (hasMovingUnits) {
    updateUnitVision()
  }
  
  draw()
  animationFrameId = requestAnimationFrame(updateGameTime)
}

function onGameTimeChange() {
  // 非播放状态下的时间变化视为拖动跳跃，自动关闭兵线
  if (!isPlaying.value && creepSimEnabled.value) {
    creepSimEnabled.value = false
  }
  
  if (vision.value) {
    vision.value.setGameTime(gameTime.value)
    vision.value.setDaytime(isDaytime.value)
    // 更新单位视野（昼夜视野范围不同）
    updateUnitVision()
  }
  // 同步战斗系统时间
  if (creepSimEnabled.value) {
    combatLoop.setGameTime(gameTime.value)
  }
  draw()
}

// ===== 视野系统（使用 useVision） =====
// 延迟初始化：需要等待 mapData 加载完成
// 延迟初始化：需要等待 mapData 加载完成
const vision = shallowRef<ReturnType<typeof useVision> | null>(null)

// 眼位放置模式
const currentWardMode = ref<WardType | null>(null)
const currentTeam = ref<Team>('radiant')
const currentView = ref<TeamView>('both')
const showFogOfWar = ref(true)
const showVisionCircles = ref(true)

// 右键菜单
const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: []
})

// 离屏缓存
let navGridCache: HTMLCanvasElement | null = null
let treeLayerCache: HTMLCanvasElement | null = null
let needsTreeCacheUpdate = true
let fogOfWarCache: HTMLCanvasElement | null = null
let needsFogCacheUpdate = true

// ===== 战斗系统 =====
// 寻路实例（用于小兵 AI）
const creepPathfinding = computed(() => {
  if (!mapData.navData.value) return null
  return usePathfinding(
    mapData.navData,
    mapData.navWidth,
    mapData.navHeight,
    mapData.treeIndex,
    mapData.destroyedTrees,
    showTrees
  )
})

// 寻路函数封装
const findPathForCreeps = (start: Point, end: Point, options?: { collisionRadius?: number }) => {
  const pf = creepPathfinding.value
  if (!pf) return []
  return pf.findPath(start, end, options)
}

const combatLoop = useCombatLoop({ findPath: findPathForCreeps })
const showCreeps = ref(true)
const creepSimEnabled = ref(true)
const showLanePaths = ref(false)  // 兵线路径调试图层（默认隐藏）

// 监听兵线开关，关闭时清除所有小兵
watch(creepSimEnabled, (enabled) => {
  if (!enabled) {
    combatLoop.reset()
  }
})

// ===== 更新单位视野 =====
function updateUnitVision() {
  if (!vision.value) return
  
  const isDay = isDaytime.value
  const sources = unitSystem.getAllUnits()
    .filter(u => u.isAlive)
    .map(u => ({
      x: u.position.x,
      y: u.position.y,
      radius: isDay ? u.vision.dayVision : u.vision.nightVision,
      team: u.team as 'radiant' | 'dire'
    }))
  
  vision.value.setUnitVisionSources(sources)
  needsFogCacheUpdate = true
}

// ===== 检查位置是否可放置单位 =====
function isValidPlacement(worldPos: Point): boolean {
  const pathfinding = usePathfinding(
    mapData.navData,
    mapData.navWidth,
    mapData.navHeight,
    mapData.treeIndex,
    mapData.destroyedTrees,
    showTrees
  )
  const navPos = coords.value.worldToNav(worldPos.x, worldPos.y)
  return pathfinding.isWalkable(navPos.x, navPos.y)
}
const pathLength = computed(() => {
  const unit = unitSystem.selectedUnit.value
  if (!unit || unit.pathPlan.currentPath.length < 2) return 0
  let total = 0
  const path = unit.pathPlan.currentPath
  for (let i = 1; i < path.length; i++) {
    total += coords.value.distance(path[i - 1], path[i])
  }
  return Math.round(total)
})

const travelTime = computed(() => {
  const unit = unitSystem.selectedUnit.value
  if (pathLength.value === 0 || !unit) return 0
  return pathLength.value / unit.combat.moveSpeed
})

const formattedTime = computed(() => {
  const seconds = travelTime.value
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return `${mins} 分 ${secs} 秒`
})

/**
 * 计算选中单位的完整路径
 * 根据路径点，使用 A* 算法计算每段实际路径
 */
function calculateUnitPath() {
  const unit = unitSystem.selectedUnit.value
  if (!unit) return
  
  const waypoints = unit.pathPlan.waypoints
  if (waypoints.length === 0) {
    unitSystem.setCurrentPath(unit.id, [])
    return
  }
  
  // 创建寻路实例
  const pathfinding = usePathfinding(
    mapData.navData,
    mapData.navWidth,
    mapData.navHeight,
    mapData.treeIndex,
    mapData.destroyedTrees,
    showTrees
  )
  
  // 起点是单位当前位置
  const allPoints: Point[] = [unit.position]
  
  // 对每对相邻点计算 A* 路径
  let currentPos = unit.position
  let totalDistance = 0
  let totalTime = 0
  
  for (let i = 0; i < waypoints.length; i++) {
    const target = waypoints[i].position
    const segment = pathfinding.findPath(currentPos, target)
    
    if (segment.length > 0) {
      // 跳过第一个点（已包含在 allPoints 中）
      for (let j = 1; j < segment.length; j++) {
        allPoints.push(segment[j])
      }
      
      // 计算这段的距离和时间
      const legDistance = pathfinding.getPathLength(segment)
      const legTime = pathfinding.getTravelTime(segment, unit.combat.moveSpeed)
      
      totalDistance += legDistance
      totalTime += legTime
      
      // 更新路径点信息
      waypoints[i].legDistance = legDistance
      waypoints[i].arrivalTime = totalTime
    }
    
    currentPos = target
  }
  
  // 设置完整路径
  unitSystem.setCurrentPath(unit.id, allPoints)
}

const formatGameTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 着色图标缓存
const tintedIconCache = new Map<string, HTMLCanvasElement>()
// 透明背景图标缓存
const transparentIconCache = new Map<string, HTMLCanvasElement>()

// 将指定背景色变透明
function makeBackgroundTransparent(
  sourceCanvas: HTMLCanvasElement,
  bgColor: number[],
  tolerance: number = 20
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const ctx = canvas.getContext('2d')!
  
  ctx.drawImage(sourceCanvas, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  const [bgR, bgG, bgB] = bgColor
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    // 检查是否接近背景色
    if (Math.abs(r - bgR) < tolerance && 
        Math.abs(g - bgG) < tolerance && 
        Math.abs(b - bgB) < tolerance) {
      data[i + 3] = 0  // 设为透明
    }
  }
  
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// 获取透明背景的图标 Canvas
function getTransparentIcon(iconName: string): HTMLCanvasElement | null {
  if (transparentIconCache.has(iconName)) {
    return transparentIconCache.get(iconName)!
  }
  
  if (!mapData.spriteSheet.value || !mapData.iconsConfig.value) return null
  
  const icon = mapData.iconsConfig.value.icons[iconName]
  if (!icon) return null
  
  const cellSize = mapData.iconsConfig.value.meta.cellSize
  const iconSize = cellSize * icon.size
  
  let sx = icon.col * cellSize
  let sy = icon.row * cellSize
  
  if (icon.size === 0.5) {
    sx += (icon.subCol ?? 0) * (cellSize / 2)
    sy += (icon.subRow ?? 0) * (cellSize / 2)
  }
  
  // 创建临时 canvas 提取图标
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = iconSize
  tempCanvas.height = iconSize
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(mapData.spriteSheet.value, sx, sy, iconSize, iconSize, 0, 0, iconSize, iconSize)
  
  // 如果有背景色配置，去除背景
  let resultCanvas = tempCanvas
  if (icon.bgColor) {
    resultCanvas = makeBackgroundTransparent(tempCanvas, icon.bgColor)
  }
  
  transparentIconCache.set(iconName, resultCanvas)
  return resultCanvas
}

// 绘制雪碧图图标
function drawIcon(
  ctx: CanvasRenderingContext2D, 
  iconName: string, 
  worldX: number, 
  worldY: number, 
  displaySize: number = 32, 
  tintColor?: string
): boolean {
  const transparentIcon = getTransparentIcon(iconName)
  if (!transparentIcon) return false
  
  const pos = coords.value.worldToCanvas(worldX, worldY)
  const halfSize = displaySize / 2
  const iconSize = transparentIcon.width
  
  // 如果有着色需求，使用缓存
  if (tintColor) {
    const cacheKey = `${iconName}_${tintColor}`
    let tintedCanvas = tintedIconCache.get(cacheKey)
    
    if (!tintedCanvas) {
      tintedCanvas = document.createElement('canvas')
      tintedCanvas.width = iconSize
      tintedCanvas.height = iconSize
      const tintCtx = tintedCanvas.getContext('2d')!
      
      // 先绘制透明背景图标
      tintCtx.drawImage(transparentIcon, 0, 0)
      // 使用 multiply 混合模式保留图标细节
      tintCtx.globalCompositeOperation = 'multiply'
      tintCtx.fillStyle = tintColor
      tintCtx.fillRect(0, 0, iconSize, iconSize)
      // 恢复透明度（使用原图的 alpha 通道）
      tintCtx.globalCompositeOperation = 'destination-in'
      tintCtx.drawImage(transparentIcon, 0, 0)
      
      tintedIconCache.set(cacheKey, tintedCanvas)
    }
    
    ctx.drawImage(tintedCanvas, pos.x - halfSize, pos.y - halfSize, displaySize, displaySize)
  } else {
    ctx.drawImage(transparentIcon, 0, 0, iconSize, iconSize, pos.x - halfSize, pos.y - halfSize, displaySize, displaySize)
  }
  
  return true
}

// ===== 绘制函数 =====
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const canvasSize = mapData.navWidth.value || 2401
  canvas.width = canvasSize
  canvas.height = canvasSize
  
  ctx.clearRect(0, 0, canvasSize, canvasSize)
  
  // 应用变换
  ctx.save()
  ctx.translate(offsetX.value, offsetY.value)
  ctx.scale(scale.value, scale.value)
  
  // 绘制底图
  if (mapData.mapImage.value) {
    ctx.drawImage(mapData.mapImage.value, 0, 0, canvasSize, canvasSize)
  }
  
  // 绘制导航网格
  if (showNavGrid.value) {
    drawNavGrid(ctx, canvasSize)
  }
  
  // 绘制迷雾（在树木和实体之前，半透明覆盖）
  if (showFogOfWar.value && vision.value) {
    drawFogOfWar(ctx, canvasSize)
  }
  
  // 绘制树木（在迷雾之上，不被遮挡）
  if (showTrees.value) {
    drawTrees(ctx, canvasSize)
  }
  
  // 绘制眼位
  if (vision.value) {
    drawWards(ctx)
  }
  
  // 绘制野怪营地
  if (showNeutralCamps.value) {
    drawNeutralCamps(ctx)
  }
  
  // 绘制防御塔
  if (showTowers.value) {
    drawTowers(ctx)
  }
  
  // 绘制建筑（基地、泉水、兵营、商店等）
  if (showBuildings.value) {
    drawBuildings(ctx)
  }
  
  // 绘制神符（和莲花池、智慧神符等）
  if (showRunes.value) {
    drawRunes(ctx)
  }

  // 绘制地图机制（前哨、魔方、双子门）
  drawFeatures(ctx)
  
  // 绘制路径
  drawPath(ctx)
  
  // 绘制单位（英雄等）
  drawUnits(ctx)
  
  // 绘制小兵
  drawCreeps(ctx)
  
  // 绘制兵线路径点（调试）
  drawLanePaths(ctx)
  
  // 绘制选中防御塔的范围圈
  drawTowerRanges(ctx, canvasSize)
  
  ctx.restore()
}

// ===== 尺寸计算辅助函数 =====

// 获取实体在画布上的物理尺寸 (Physical Scale)
// worldRadius: 实体在游戏世界中的半径
function getPhysicalSize(worldRadius: number): number {
  const canvasSize = mapData.navWidth.value || 2401
  // 直径 = 半径 * 2
  return (worldRadius * 2) / WORLD_SIZE * canvasSize
}

// 获取标记在画布上的自适应尺寸 (Marker Scale)
// basePixelSize: 期望在屏幕上显示的基础像素大小
function getMarkerSize(basePixelSize: number): number {
  // 目标是在当前 scale 下保持 basePixelSize 的屏幕大小
  // canvasSize = screenPixel / scale
  const size = basePixelSize / scale.value
  
  // 限制最大/最小尺寸，防止缩放过极时图标过大或过小
  const MIN_SIZE = 28  // 最小尺寸，比树（直径约16px）大一圈
  const MAX_SIZE = 150 // 最大尺寸
  
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, size))
}

function drawFeatures(ctx: CanvasRenderingContext2D) {
  // 1. 前哨 (Watchers) - 实体 (半径约 250)
  const outpostSize = getPhysicalSize(250)
  for (const outpost of mapData.outposts.value) {
    const isRadiant = outpost.team === 2
    const isDire = outpost.team === 3
    const color = isRadiant ? TEAM_COLORS.radiant : (isDire ? TEAM_COLORS.dire : '#95a5a6')
    
    if (drawIcon(ctx, 'outpost', outpost.x, outpost.y, outpostSize, color)) continue
    
    // Fallback
    const pos = coords.value.worldToCanvas(outpost.x, outpost.y)
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.rect(pos.x - 8, pos.y - 8, 16, 16)
    ctx.fill()
    ctx.stroke()
  }

  // 2. 痛苦魔方 (Tormentors) - 实体 (半径约 300)
  const tormentorSize = getPhysicalSize(300)
  for (const tormentor of mapData.tormentors.value) {
    const isRadiant = tormentor.team === 2 || tormentor.x < 0 // 假设左下是天辉侧
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    
    if (drawIcon(ctx, 'pain_cube', tormentor.x, tormentor.y, tormentorSize, color)) continue
    
    // Fallback cube
    const pos = coords.value.worldToCanvas(tormentor.x, tormentor.y)
    ctx.fillStyle = '#636e72'
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.rect(pos.x - 10, pos.y - 10, 20, 20)
    ctx.fill()
    ctx.stroke()
  }

  // 3. 双子门 (Twin Gates) - 实体 (半径约 350)
  const gateSize = getPhysicalSize(350)
  for (const gate of mapData.twinGates.value) {
    if (drawIcon(ctx, 'twin_gate', gate.x, gate.y, gateSize, '#00cec9')) continue
    
    const pos = coords.value.worldToCanvas(gate.x, gate.y)
    ctx.strokeStyle = '#00cec9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 4. 莲花池 (Lotus Pools) - 标记 (Marker Scale)
  const lotusSize = getMarkerSize(55)
  for (const pool of mapData.lotusPools.value) {
    if (drawIcon(ctx, 'lotus_pool', pool.x, pool.y, lotusSize, '#e84393')) continue
    
    const pos = coords.value.worldToCanvas(pool.x, pool.y)
    ctx.fillStyle = '#e84393' // Pink
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 绘制防御塔范围圈（视野和攻击）
function drawTowerRanges(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!selectedEntity.value || selectedEntity.value.type !== 'tower') return
  
  const tower = selectedEntity.value.data
  const towerName = (tower as any).MapUnitName || tower.name || ''
  
  // 根据塔名称判断等级 (格式: npc_dota_goodguys_tower3_bot)
  const getTowerTier = (name: string): keyof typeof TOWER_VISION => {
    if (name.includes('tower1')) return 'tier1'
    if (name.includes('tower2')) return 'tier2'
    if (name.includes('tower3')) return 'tier3'
    if (name.includes('tower4')) return 'tier4'
    return 'tier1'  // 默认
  }
  
  const tier = getTowerTier(towerName)
  const towerVision = TOWER_VISION[tier]
  const TOWER_COLLISION_RADIUS = 144  // 塔的碰撞半径
  // 视野范围：只有一塔在夜晚时加上碰撞半径
  const baseVision = isDaytime.value ? towerVision.day : towerVision.night
  const visionRange = (tier === 'tier1' && !isDaytime.value) ? baseVision + TOWER_COLLISION_RADIUS : baseVision
  // 攻击范围：所有塔都从塔边缘开始计算
  const TOWER_ATTACK_RANGE = 700 + TOWER_COLLISION_RADIUS
  
  // 转换世界坐标到画布
  const pos = coords.value.worldToCanvas(tower.x, tower.y)
  
  // 计算画布上的范围半径
  const visionRadius = visionRange / WORLD_SIZE * canvasSize
  const attackRadius = TOWER_ATTACK_RANGE / WORLD_SIZE * canvasSize
  
  ctx.save()
  ctx.setLineDash([10, 5])  // 虚线
  ctx.lineWidth = 2
  
  // 视野范围圈 - 黄色
  ctx.strokeStyle = 'rgba(255, 220, 50, 0.8)'
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, visionRadius, 0, Math.PI * 2)
  ctx.stroke()
  
  // 攻击范围圈 - 红色
  ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)'
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, attackRadius, 0, Math.PI * 2)
  ctx.stroke()
  
  ctx.restore()
}

function drawNavGrid(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!mapData.navData.value) return
  
  // 使用缓存
  if (!navGridCache) {
    navGridCache = document.createElement('canvas')
    navGridCache.width = canvasSize
    navGridCache.height = canvasSize
    const cacheCtx = navGridCache.getContext('2d')!
    
    const imageData = cacheCtx.createImageData(canvasSize, canvasSize)
    const data = imageData.data
    
    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const idx = (y * canvasSize + x) * 4
        const navIdx = (y * mapData.navWidth.value + x) * 4
        const isWalkable = mapData.navData.value[navIdx] > 128
        
        if (!isWalkable) {
          data[idx] = 255
          data[idx + 1] = 0
          data[idx + 2] = 0
          data[idx + 3] = 80
        }
      }
    }
    
    cacheCtx.putImageData(imageData, 0, 0)
  }
  
  ctx.drawImage(navGridCache, 0, 0)
}

// ===== 实体数据辅助函数 =====

// 获取实体所属阵营
// 返回: 2 (Radiant), 3 (Dire), 0 (Neutral/Other)
function getEntityTeam(entity: any): number {
  // 1. 尝试直接获取 team 或 teamnumber
  let team = entity.team ?? entity.teamnumber
  
  // 转换字符串为数字
  if (typeof team === 'string') {
    team = parseInt(team, 10)
  }
  
  // 如果有有效阵营 (2 或 3)，直接返回
  if (team === 2 || team === 3) return team
  
  // 2. 如果 team 无效 (0, undefined, etc)，尝试从名称推断
  const name = entity.MapUnitName || entity.targetname || entity.name || ''
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('goodguys') || lowerName.includes('radiant')) return 2
  if (lowerName.includes('badguys') || lowerName.includes('dire')) return 3
  
  // 3. 特殊处理前哨 (通常 teamnumber 为 0)
  if (lowerName.includes('watch_tower') || lowerName.includes('outpost')) {
    // 简单按南北半球划分：y < 0 为下方(Radiant), y > 0 为上方(Dire)
    // 注意：Dota坐标系原点在中间。
    // South (-y) -> Radiant, North (+y) -> Dire
    return entity.y < 0 ? 2 : 3
  }
  
  return 0
}

function drawTrees(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!treeLayerCache || needsTreeCacheUpdate) {
    treeLayerCache = document.createElement('canvas')
    treeLayerCache.width = canvasSize
    treeLayerCache.height = canvasSize
    const cacheCtx = treeLayerCache.getContext('2d')!
    
    // 树木颜色根据高度分层（正常深绿色渐变）
    // z/128 = 层级：0=河边, 1=中地, 2+=高地
    const getTreeColor = (z: number, destroyed: boolean) => {
      if (destroyed) {
        return 'rgb(80, 75, 65)'         // 已砍伐 - 灰褐色
      }
      const level = Math.round(z / 128)
      if (level <= 0) {
        return 'rgb(30, 85, 50)'         // 河边 - 深绿
      } else if (level === 1) {
        return 'rgb(40, 110, 55)'        // 中地 - 中绿
      } else {
        return 'rgb(55, 140, 65)'        // 高地 - 亮绿（但不过分）
      }
    }
    
    for (const tree of mapData.trees.value) {
      const pos = coords.value.worldToCanvas(tree.x, tree.y)
      const key = `${Math.floor((tree.x - WORLD_MIN) / 64)},${Math.floor((tree.y - WORLD_MIN) / 64)}`
      const z = (tree as any).z || 128
      const destroyed = mapData.destroyedTrees.value.has(key)
      
      cacheCtx.fillStyle = getTreeColor(z, destroyed)
      cacheCtx.beginPath()
      cacheCtx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
      cacheCtx.fill()
    }
    
    needsTreeCacheUpdate = false
  }
  
  ctx.drawImage(treeLayerCache, 0, 0)
}

function drawNeutralCamps(ctx: CanvasRenderingContext2D) {
  // 营地图标配置 (自适应大小)
  const CAMP_CONFIG: Record<string, { icon: string, color: string, baseSize: number }> = {
    small: { icon: 'camp_small', color: '#2ecc71', baseSize: 24 },
    medium: { icon: 'camp_medium', color: '#f39c12', baseSize: 28 },
    large: { icon: 'camp_large', color: '#e74c3c', baseSize: 32 },
    ancient: { icon: 'camp_ancient', color: '#9b59b6', baseSize: 36 }
  }
  const DEFAULT_CONFIG = { icon: 'camp_medium', color: '#ff8c00', baseSize: 24 }
  
  for (let i = 0; i < mapData.neutralSpawners.value.length; i++) {
    const camp = mapData.neutralSpawners.value[i]
    
    // 匹配营地类型（使用坐标容差）
    const campConfig = mapData.campTypes.value.find((c: any) => 
      Math.abs(c.x - camp.x) < 100 && Math.abs(c.y - camp.y) < 100
    )
    let campType = campConfig?.type || (camp.targetname?.includes('ancient') ? 'ancient' : null)
    
    // 对进化营地(isFrog)，根据游戏时间计算当前等级
    if (campConfig?.isFrog && campType) {
      const minutes = Math.floor(gameTime.value / 60)
      const baseTierIndex = ['small', 'medium', 'large', 'ancient'].indexOf(campType)
      const maxUpgrades = Math.min(2, 3 - baseTierIndex)
      const completedUpgrades = Math.min(maxUpgrades, Math.floor(minutes / 15))
      const currentTierIndex = Math.min(baseTierIndex + completedUpgrades, 3)
      campType = (['small', 'medium', 'large', 'ancient'] as const)[currentTierIndex]
    }
    
    const config = campType ? CAMP_CONFIG[campType] : DEFAULT_CONFIG
    
    // 自适应大小
    const displaySize = getMarkerSize(config.baseSize)

    // 尝试用图标渲染
    if (drawIcon(ctx, config.icon, camp.x, camp.y, displaySize, config.color)) {
      continue
    }
    
    // 回退到圆形
    const pos = coords.value.worldToCanvas(camp.x, camp.y)
    ctx.fillStyle = config.color
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawTowers(ctx: CanvasRenderingContext2D) {
  // 防御塔尺寸 (实体，半径 144)
  const TOWER_RADIUS = 144
  const towerSize = getPhysicalSize(TOWER_RADIUS)
  
  for (const tower of mapData.towers.value) {
    const team = getEntityTeam(tower)
    const isRadiant = team === 2
    const name = (tower as any).MapUnitName || tower.name || ''
    const isMid = name.includes('_mid') || name.includes('mid_')
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    
    // 尝试用图标渲染
    const iconName = isMid ? 'tower_mid' : 'tower_side'
    if (drawIcon(ctx, iconName, tower.x, tower.y, towerSize, color)) {
      continue
    }
    
    // Fallback logic
    const pos = coords.value.worldToCanvas(tower.x, tower.y)
    const halfSize = (towerSize / 2) // fallback
    
    ctx.fillStyle = color
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.fillRect(pos.x - halfSize, pos.y - halfSize, towerSize, towerSize)
    ctx.strokeRect(pos.x - halfSize, pos.y - halfSize, towerSize, towerSize)
  }
}

// ===== 迷雾和眼位渲染 =====
function drawBuildings(ctx: CanvasRenderingContext2D) {
  // 1. 基地 (Ancients) - 实体 (半径约 350)
  const ancientSize = getPhysicalSize(350)
  for (const ancient of mapData.ancients.value) {
    const team = getEntityTeam(ancient)
    const isRadiant = team === 2
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    
    // 使用 ancient 图标
    if (drawIcon(ctx, 'ancient', ancient.x, ancient.y, ancientSize, color)) continue
    
    // Fallback
    const pos = coords.value.worldToCanvas(ancient.x, ancient.y)
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.rect(pos.x - 16, pos.y - 16, 32, 32)
    ctx.fill()
    ctx.stroke()
  }

  // 2. 泉水 (Fountains) - 实体 (半径约 200)
  const fountainSize = getPhysicalSize(200)
  for (const fountain of mapData.fountains.value) {
    const team = getEntityTeam(fountain)
    const isRadiant = team === 2
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    
    // Draw fountain area
    const pos = coords.value.worldToCanvas(fountain.x, fountain.y)
    ctx.fillStyle = color === TEAM_COLORS.radiant ? 'rgba(76, 209, 55,0.3)' : 'rgba(232, 65, 24,0.3)'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2)
    ctx.fill()
  }

  // 3. 兵营 (Barracks) - 实体 (半径约 250)
  const raxSize = getPhysicalSize(250)
  for (const rax of mapData.barracks.value) {
    const team = getEntityTeam(rax)
    const isRadiant = team === 2
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    const name = (rax as any).MapUnitName || rax.name || ''
    const isMid = name.includes('mid')
    const icon = isMid ? 'barracks_mid' : 'barracks_side'
    
    if (drawIcon(ctx, icon, rax.x, rax.y, raxSize, color)) continue
    
    // Fallback
    const pos = coords.value.worldToCanvas(rax.x, rax.y)
    ctx.fillStyle = color
    ctx.fillRect(pos.x - 6, pos.y - 6, 12, 12)
  }

  // 4. 商店 (Shops) - 标记 (Marker Scale)
  const shopSize = getMarkerSize(70)
  for (const shop of mapData.shops.value) {
    // 使用 shoptype 字段判断商店类型
    // shoptype: "0" = 泉水商店, "2" = 神秘商店
    const shoptype = (shop as any).shoptype
    const isSecret = shoptype === '2' || shoptype === 2
    const icon = isSecret ? 'shop_secret' : 'shop_base'
    
    // 使用亮金色着色
    if (drawIcon(ctx, icon, shop.x, shop.y, shopSize, '#FFD700')) continue
    
    const pos = coords.value.worldToCanvas(shop.x, shop.y)
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }

  // 5. 肉山 (Roshan) - 标记 (Marker Scale)
  const roshanSize = getMarkerSize(65)
  for (const rs of mapData.roshan.value) {
    if (drawIcon(ctx, 'roshan', rs.x, rs.y, roshanSize, '#d63031')) continue
    
    const pos = coords.value.worldToCanvas(rs.x, rs.y)
    ctx.fillStyle = '#d63031'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2)
    ctx.fill()
  }

  // 6. 普通建筑 (Generic Buildings) - 实体 (半径约 180)
  const buildingSize = getPhysicalSize(180)
  for (const b of mapData.buildings.value) {
    const team = getEntityTeam(b)
    const isRadiant = team === 2
    const color = isRadiant ? TEAM_COLORS.radiant : (team === 3 ? TEAM_COLORS.dire : '#95a5a6')
    
    // 使用 building_base 图标
    if (drawIcon(ctx, 'building_base', b.x, b.y, buildingSize, color)) continue
    
    const pos = coords.value.worldToCanvas(b.x, b.y)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.6
    ctx.fillRect(pos.x - 5, pos.y - 5, 10, 10)
    ctx.globalAlpha = 1.0
  }
}

// 监听数据加载完成，强制重绘
watch(() => mapData.loading.value, (loading) => {
  if (!loading) {
    console.log('数据加载完成，触发重绘')
    // 延迟一点以确保 Vue 响应式更新传播
    setTimeout(() => {
        needsFogCacheUpdate = true
        needsTreeCacheUpdate = true
        draw()
    }, 100)
  }
})

function drawRunes(ctx: CanvasRenderingContext2D) {
  // 标记图标大小
  const runeSize = getMarkerSize(36)
  
  // 1. 赏金符
  for (const rune of mapData.bountyRunes.value) {
    if (drawIcon(ctx, 'rune_bounty', rune.x, rune.y, runeSize * 0.8)) continue // 稍小一点
    
    const pos = coords.value.worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = '#f1c40f'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 2. 强化符
  for (const rune of mapData.powerupRunes.value) {
    // 使用 rune_spot 图标作为通用强化符
    if (drawIcon(ctx, 'rune_spot', rune.x, rune.y, runeSize * 0.8)) continue
    
    const pos = coords.value.worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = '#ffd700' // Gold fallback
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }

  // 3. 智慧神符 (Wisdom Shrine) - 实体 (半径约 220)
  const wisdomSize = getPhysicalSize(220) 
  for (const rune of mapData.wisdomRunes.value) {
    // 使用 wisdom_shrine 图标
    if (drawIcon(ctx, 'wisdom_shrine', rune.x, rune.y, wisdomSize, '#9b59b6')) continue
    
    const pos = coords.value.worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = '#9b59b6' // Purple
    ctx.beginPath()
    ctx.rect(pos.x - 6, pos.y - 6, 12, 12)
    ctx.fill()
  }
}

function drawPath(ctx: CanvasRenderingContext2D) {
  // 绘制所有单位的路径
  for (const unit of unitSystem.getAllUnits()) {
    const path = unit.pathPlan.currentPath
    const startIndex = unit.pathPlan.currentPathIndex
    const unitColor = getUnitColor(unit.colorIndex)
    
    // 只绘制剩余路径（从英雄当前位置开始）
    if (path.length > startIndex) {
      ctx.strokeStyle = unitColor  // 使用单位颜色
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      
      // 从英雄当前位置开始
      const first = coords.value.worldToCanvas(unit.position.x, unit.position.y)
      ctx.moveTo(first.x, first.y)
      
      // 连接剩余路径点
      for (let i = startIndex; i < path.length; i++) {
        const pt = coords.value.worldToCanvas(path[i].x, path[i].y)
        ctx.lineTo(pt.x, pt.y)
      }
      
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // 绘制路径点（只显示终点红色，中间点蓝色，不显示起点绿色）
    const waypoints = unit.pathPlan.waypoints
    waypoints.forEach((wp, index) => {
      const pos = coords.value.worldToCanvas(wp.position.x, wp.position.y)
      const isLast = index === waypoints.length - 1
      
      // 终点红色，中间点蓝色
      ctx.fillStyle = isLast ? '#dc143c' : '#3498db'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // 序号
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(index + 1), pos.x, pos.y)
    })
  }
}

function drawUnits(ctx: CanvasRenderingContext2D) {
  // 图标大小逻辑：
  // - 物理大小：放大时显示 64 单位
  // - 屏幕大小：缩小时保持屏幕上约 32px（对应 128 单位左右）
  const physicalSize = getPhysicalSize(64)   // 放大时显示 64 单位（画布像素）
  const screenSize = 32 / scale.value        // 缩小时屏幕 32px 对应的画布像素
  const heroSize = Math.max(physicalSize, screenSize)
  
  for (const unit of unitSystem.getAllUnits()) {
    if (!unit.isAlive) continue
    
    const pos = coords.value.worldToCanvas(unit.position.x, unit.position.y)
    const isSelected = unitSystem.selectedUnitId.value === unit.id
    const unitColor = getUnitColor(unit.colorIndex)
    const teamColor = TEAM_RING_COLORS[unit.team]
    
    // 内圆半径（占总大小的 70%）
    const innerRadius = heroSize / 2 * 0.7
    const outerRadius = heroSize / 2
    
    // 选中高亮（白色外圈）
    if (isSelected) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, outerRadius + 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    // 阵营外圈（绿色/红色）
    ctx.fillStyle = teamColor
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, outerRadius, 0, Math.PI * 2)
    ctx.fill()
    
    // 内圆（单位颜色）
    ctx.fillStyle = unitColor
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, innerRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ===== 小兵渲染 =====
function drawCreeps(ctx: CanvasRenderingContext2D) {
  if (!showCreeps.value) return
  
  for (const creep of combatLoop.creeps.value) {
    if (!creep.isAlive) continue
    
    // 渲染大小 = 碰撞半径的 1/3
    const baseSize = getPhysicalSize(creep.collisionRadius / 3)
    const minSize = 3 / scale.value       // 最小 3 屏幕像素
    const creepRadius = Math.max(baseSize, minSize)
    
    const pos = coords.value.worldToCanvas(creep.position.x, creep.position.y)
    const teamColor = TEAM_RING_COLORS[creep.team]
    
    // 呼吸动画（攻击时放大）
    let animScale = 1.0
    if (creep.attackState.attackAnimProgress > 0 && creep.attackState.attackAnimProgress < 1) {
      // 进度 0->0.5 放大，0.5->1 缩小
      const phase = creep.attackState.attackAnimProgress
      animScale = phase < 0.5 
        ? 1 + 0.3 * (phase * 2)           // 1.0 -> 1.3
        : 1 + 0.3 * ((1 - phase) * 2)     // 1.3 -> 1.0
    }
    
    const radius = creepRadius * animScale
    
    // 绘制实心圆点
    ctx.fillStyle = teamColor
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ===== 调试：渲染兵线路径点 =====
function drawLanePaths(ctx: CanvasRenderingContext2D) {
  if (!showLanePaths.value) return
  
  const paths = combatLoop.getLanePaths()
  if (!paths) return
  
  const boxSize = getMarkerSize(8)  // 8 屏幕像素的方块
  const halfBox = boxSize / 2
  
  // 路线颜色
  const laneColors: Record<string, string> = {
    top: '#FFD700',    // 金色
    mid: '#FF69B4',    // 粉色
    bot: '#00CED1'     // 青色
  }
  
  for (const team of ['radiant', 'dire'] as const) {
    for (const lane of ['top', 'mid', 'bot'] as const) {
      const pathData = paths[team][lane]
      if (!pathData) continue
      
      // 绘制刷兵点（较大的方块）
      const spawner = coords.value.worldToCanvas(pathData.spawner.x, pathData.spawner.y)
      ctx.fillStyle = TEAM_RING_COLORS[team]
      ctx.fillRect(spawner.x - halfBox * 1.5, spawner.y - halfBox * 1.5, boxSize * 1.5, boxSize * 1.5)
      
      // 绘制路径点（白色小方块）
      ctx.fillStyle = '#FFFFFF'
      for (const waypoint of pathData.waypoints) {
        const pos = coords.value.worldToCanvas(waypoint.x, waypoint.y)
        ctx.fillRect(pos.x - halfBox, pos.y - halfBox, boxSize, boxSize)
      }
      
      // 绘制连线
      ctx.strokeStyle = laneColors[lane]
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.beginPath()
      ctx.moveTo(spawner.x, spawner.y)
      for (const waypoint of pathData.waypoints) {
        const pos = coords.value.worldToCanvas(waypoint.x, waypoint.y)
        ctx.lineTo(pos.x, pos.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}

// ===== 迷雾和眼位渲染 =====
function drawFogOfWar(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!vision.value || !vision.value.visionReady.value) return
  
  // 使用缓存
  if (needsFogCacheUpdate || !fogOfWarCache) {
    fogOfWarCache = document.createElement('canvas')
    fogOfWarCache.width = canvasSize
    fogOfWarCache.height = canvasSize
    const cacheCtx = fogOfWarCache.getContext('2d')!
    
    // 填充迷雾（半透明黑色）
    cacheCtx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    cacheCtx.fillRect(0, 0, canvasSize, canvasSize)
    
    // 收集所有视野源
    const isDay = isDaytime.value
    const view = vision.value.currentView.value
    const TOWER_COLLISION_RADIUS = 144
    
    interface VisionSource { x: number; y: number; radius: number }
    const visionSources: VisionSource[] = []
    
    // 收集防御塔视野源
    for (const tower of mapData.towers.value) {
      const teamnumber = Number((tower as any).teamnumber || tower.team)
      const isRadiant = teamnumber === 2
      if (view === 'radiant' && !isRadiant) continue
      if (view === 'dire' && isRadiant) continue
      
      const name = (tower as any).MapUnitName || tower.name || ''
      let visionRadius: number
      if (name.includes('tower1')) {
        // 一塔视野：只有夜晚时加上碰撞半径
        const baseVision = isDay ? TOWER_VISION.tier1.day : TOWER_VISION.tier1.night
        visionRadius = isDay ? baseVision : baseVision + TOWER_COLLISION_RADIUS
      } else {
        visionRadius = isDay ? TOWER_VISION.tier2.day : TOWER_VISION.tier2.night
      }
      visionSources.push({ x: tower.x, y: tower.y, radius: visionRadius })
    }
    
    // 收集基地视野源
    for (const ancient of mapData.ancients.value) {
      const teamnumber = Number((ancient as any).teamnumber || ancient.team)
      const isRadiant = teamnumber === 2
      if (view === 'radiant' && !isRadiant) continue
      if (view === 'dire' && isRadiant) continue
      visionSources.push({ x: ancient.x, y: ancient.y, radius: ANCIENT_VISION_RADIUS })
    }
    
    // 收集眼位视野源
    for (const ward of vision.value.wards.value) {
      if (view === 'radiant' && ward.team !== 'radiant') continue
      if (view === 'dire' && ward.team !== 'dire') continue
      
      const radius = ward.type === 'observer' 
        ? (isDay ? OBSERVER_VISION_RADIUS_DAY : OBSERVER_VISION_RADIUS_NIGHT)
        : SENTRY_VISION_RADIUS
      visionSources.push({ x: ward.worldX, y: ward.worldY, radius })
    }
    
    // 收集单位视野源（英雄/小兵）
    for (const unit of unitSystem.getAllUnits()) {
      if (!unit.isAlive) continue
      if (view === 'radiant' && unit.team !== 'radiant') continue
      if (view === 'dire' && unit.team !== 'dire') continue
      
      const radius = isDay ? unit.vision.dayVision : unit.vision.nightVision
      visionSources.push({ x: unit.position.x, y: unit.position.y, radius })
    }
    
    // 创建临时画布绘制格子视野
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvasSize
    tempCanvas.height = canvasSize
    const tempCtx = tempCanvas.getContext('2d')!
    
    // 在临时画布上绘制所有可见格子（白色）
    tempCtx.fillStyle = '#fff'
    const gridCellSize = VISION_GRID_SIZE
    const cellPixels = canvasSize / ((WORLD_MAX - WORLD_MIN) / gridCellSize)
    
    for (const key of vision.value.combinedVision.value) {
      const [gX, gY] = key.split(',').map(Number)
      const worldX = gX * gridCellSize + WORLD_MIN
      const worldY = gY * gridCellSize + WORLD_MIN
      const pos = coords.value.worldToCanvas(worldX, worldY)
      
      // 使用方形填充格子，遮挡边缘更整齐
      const halfCell = cellPixels * 0.5
      tempCtx.fillRect(pos.x - halfCell, pos.y - halfCell, cellPixels, cellPixels)
    }
    
    // 创建圆形蒙版画布
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = canvasSize
    maskCanvas.height = canvasSize
    const maskCtx = maskCanvas.getContext('2d')!
    
    // 绘制所有视野圆形到蒙版
    maskCtx.fillStyle = '#fff'
    for (const src of visionSources) {
      const pos = coords.value.worldToCanvas(src.x, src.y)
      const pixelRadius = src.radius / WORLD_SIZE * canvasSize
      maskCtx.beginPath()
      maskCtx.arc(pos.x, pos.y, pixelRadius, 0, Math.PI * 2)
      maskCtx.fill()
    }
    
    // 用蒙版裁剪格子视野（只保留交集）
    tempCtx.globalCompositeOperation = 'destination-in'
    tempCtx.drawImage(maskCanvas, 0, 0)
    
    // 从迷雾中挖空可见区域
    cacheCtx.globalCompositeOperation = 'destination-out'
    cacheCtx.drawImage(tempCanvas, 0, 0)
    cacheCtx.globalCompositeOperation = 'source-over'
    
    needsFogCacheUpdate = false
  }
  
  // 边缘柔化
  ctx.save()
  ctx.filter = 'blur(4px)'
  ctx.drawImage(fogOfWarCache, 0, 0)
  ctx.restore()
}

function drawWards(ctx: CanvasRenderingContext2D) {
  if (!vision.value) return
  
  for (const ward of vision.value.wards.value) {
    const pos = coords.value.worldToCanvas(ward.worldX, ward.worldY)
    const isRadiant = ward.team === 'radiant'
    const isObserver = ward.type === 'observer'
    const isExpiring = vision.value.isWardExpiring(ward)
    const isSelected = vision.value.selectedWardId.value === ward.id
    
    // 检查假眼是否已过期
    const timeElapsed = gameTime.value - ward.placedAt
    const isExpired = isObserver && timeElapsed >= vision.value.OBSERVER_DURATION
    
    if (isExpired) continue // 过期眼位不显示
    
    // 使用图标渲染
    const iconName = isObserver ? 'ward_observer' : 'ward_sentry'
    const color = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    const iconDrawn = drawIcon(ctx, iconName, ward.worldX, ward.worldY, isObserver ? 24 : 20, color)
    
    if (!iconDrawn) {
      // 回退到圆形
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isObserver ? 8 : 6, 0, Math.PI * 2)
      
      // 过期提醒：变色（橙色闪烁）
      if (isExpiring) {
        const blink = Math.sin(Date.now() / 200) > 0 ? 0.9 : 0.5
        ctx.fillStyle = `rgba(255, 165, 0, ${blink})`
      } else {
        ctx.fillStyle = isObserver 
          ? (isRadiant ? 'rgba(50, 205, 50, 0.9)' : 'rgba(220, 20, 60, 0.9)')
          : (isRadiant ? 'rgba(100, 149, 237, 0.9)' : 'rgba(255, 140, 0, 0.9)')
      }
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = isExpiring ? '#ff6600' : '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    
    // 选中时显示视野圈（黄色虚线）
    if (isSelected && isObserver) {
      const visionRadius = vision.value.getWardDisplayRadius(ward, mapData.navWidth.value)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, visionRadius, 0, Math.PI * 2)
      ctx.setLineDash([8, 4])
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
      
      // 选中高亮边框
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    
    // 选中真眼时显示反隐范围圈（淡蓝色）
    if (isSelected && !isObserver) {
      // 计算反隐范围的画布半径
      const trueSightRadius = SENTRY_TRUE_SIGHT_RADIUS / WORLD_SIZE * mapData.navWidth.value
      
      // 绘制反隐范围圈（淡蓝色填充 + 边框）
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, trueSightRadius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(100, 180, 255, 0.15)'
      ctx.fill()
      ctx.setLineDash([6, 3])
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
      
      // 选中高亮边框
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(100, 180, 255, 1)'
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }
}

// ===== 事件处理 =====
function getCanvasCoords(event: MouseEvent): Point | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY
  
  // 逆变换
  const canvasX = (x - offsetX.value) / scale.value
  const canvasY = (y - offsetY.value) / scale.value
  
  return { x: canvasX, y: canvasY }
}

function handleCanvasClick(event: MouseEvent) {
  if (contextMenu.value.visible) {
    contextMenu.value.visible = false
    return
  }
  
  const canvasCoords = getCanvasCoords(event)
  if (!canvasCoords) return
  
  const worldCoords = coords.value.canvasToWorld(canvasCoords.x, canvasCoords.y)
  
  // 检查是否在眼位放置模式
  if (currentWardMode.value && vision.value) {
    const success = vision.value.placeWard(worldCoords.x, worldCoords.y, currentWardMode.value)
    if (success) {
      needsFogCacheUpdate = true
      draw()
    }
    return
  }
  
  // 检测是否点击英雄（优先于其他实体）
  const clickedUnit = unitSystem.hitTest(worldCoords, 100)
  if (clickedUnit) {
    unitSystem.selectUnit(clickedUnit.id)
    draw()
    return
  } else {
    // 点击空白区域，取消选中英雄
    if (unitSystem.selectedUnitId.value) {
      unitSystem.selectUnit(null)
      unitSystem.isPlanning.value = false
      draw()
    }
  }
  
  // 检测是否点击眼位
  if (vision.value) {
    const clickedWard = hitTestWard(worldCoords)
    if (clickedWard) {
      vision.value.selectedWardId.value = clickedWard.id
      draw()
      return
    } else {
      // 取消选中眼位
      if (vision.value.selectedWardId.value !== null) {
        vision.value.selectedWardId.value = null
        draw()
      }
    }
  }
  
  // 检测是否点击实体
  const clickedEntity = hitTestEntity(worldCoords, event)
  if (clickedEntity) {
    selectedEntity.value = clickedEntity
    popupPosition.value = { x: event.clientX + 10, y: event.clientY + 10 }
    draw()  // 绘制范围圈
    return
  }
  
  // 关闭已打开的浮窗
  if (selectedEntity.value) {
    selectedEntity.value = null
    popupPosition.value = null
    draw()  // 清除范围圈
  }
}

// 眼位点击检测
function hitTestWard(worldCoords: Point): Ward | null {
  if (!vision.value) return null
  const hitRadius = 100 // 世界坐标的点击半径
  
  for (const ward of vision.value.wards.value) {
    const dx = ward.worldX - worldCoords.x
    const dy = ward.worldY - worldCoords.y
    if (dx * dx + dy * dy < hitRadius * hitRadius) {
      return ward
    }
  }
  return null
}

// 实体点击检测
function hitTestEntity(worldCoords: Point, event: MouseEvent): SelectedEntity | null {
  const hitRadius = 80 // 世界坐标的点击半径
  
  // 检测防御塔
  if (showTowers.value) {
    for (const tower of mapData.towers.value) {
      const dx = tower.x - worldCoords.x
      const dy = tower.y - worldCoords.y
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        return { type: 'tower', data: tower }
      }
    }
  }
  
  // 检测野怪营地
  if (showNeutralCamps.value) {
    for (let i = 0; i < mapData.neutralSpawners.value.length; i++) {
      const camp = mapData.neutralSpawners.value[i]
      const dx = camp.x - worldCoords.x
      const dy = camp.y - worldCoords.y
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        // 从 campTypes 中匹配类型（使用坐标容差）
        const campConfig = mapData.campTypes.value.find((c: any) => 
          Math.abs(c.x - camp.x) < 100 && Math.abs(c.y - camp.y) < 100
        )
        return { 
          type: 'camp', 
          data: camp, 
          index: i + 1,
          campType: campConfig?.type || (camp.targetname?.includes('ancient') ? 'ancient' : undefined),
          isFrog: campConfig?.isFrog || false
        }
      }
    }
  }
  
  return null
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  
  const canvasCoords = getCanvasCoords(event)
  if (!canvasCoords) return
  
  const worldCoords = coords.value.canvasToWorld(canvasCoords.x, canvasCoords.y)
  
  // Shift + 右键：为选中单位添加路径点
  if (event.shiftKey && unitSystem.selectedUnit.value) {
    // 自动暂停时间条
    if (isPlaying.value) {
      isPlaying.value = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }
    
    // 添加路径点
    unitSystem.addWaypoint(worldCoords)
    unitSystem.isPlanning.value = true
    
    // 计算完整路径
    calculateUnitPath()
    
    draw()
    return
  }
  
  // 普通右键（选中单位状态下）：取消上一个路径点
  if (unitSystem.selectedUnit.value && unitSystem.selectedUnit.value.pathPlan.waypoints.length > 0 && !event.ctrlKey) {
    unitSystem.removeLastWaypoint()
    calculateUnitPath()
    draw()
    return
  }
  
  // Ctrl + 右键：清空所有路径点
  if (event.ctrlKey && unitSystem.selectedUnit.value) {
    unitSystem.clearWaypoints()
    draw()
    return
  }
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        label: '放置天辉英雄',
        icon: '🟢',
        action: () => {
          if (!isValidPlacement(worldCoords)) {
            console.warn('无法在此处放置英雄（不可行走区域）')
            return
          }
          unitSystem.createHero({
            team: 'radiant',
            position: worldCoords
          })
          updateUnitVision()
          draw()
        }
      },
      {
        label: '放置夜魇英雄',
        icon: '🔴',
        action: () => {
          if (!isValidPlacement(worldCoords)) {
            console.warn('无法在此处放置英雄（不可行走区域）')
            return
          }
          unitSystem.createHero({
            team: 'dire',
            position: worldCoords
          })
          updateUnitVision()
          draw()
        }
      },
      {
        label: '放置假眼 (Observer)',
        icon: '👁',
        action: () => {
          if (vision.value) {
            vision.value.placeWard(worldCoords.x, worldCoords.y, 'observer')
            needsFogCacheUpdate = true
            draw()
          }
        }
      },
      {
        label: '放置真眼 (Sentry)',
        icon: '🔮',
        action: () => {
          if (vision.value) {
            vision.value.placeWard(worldCoords.x, worldCoords.y, 'sentry')
            draw()
          }
        }
      },
      {
        label: '清除所有眼位',
        icon: '🗑',
        action: () => {
          if (vision.value) {
            vision.value.clearAllWards()
            needsFogCacheUpdate = true
            draw()
          }
        }
      }
    ],
    worldPoint: worldCoords
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.5, Math.min(5, scale.value * delta))
  
  const canvasCoords = getCanvasCoords(event)
  if (canvasCoords) {
    const worldX = (canvasCoords.x - offsetX.value) / scale.value
    const worldY = (canvasCoords.y - offsetY.value) / scale.value
    
    offsetX.value = canvasCoords.x - worldX * newScale
    offsetY.value = canvasCoords.y - worldY * newScale
  }
  
  scale.value = newScale
  draw()
}

function handleMouseDown(event: MouseEvent) {
  // 中键拖动地图
  if (event.button === 1) {
    isDragging.value = true
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    event.preventDefault()
    return
  }
  
  // 左键拖动
  if (event.button === 0) {
    const canvasCoords = getCanvasCoords(event)
    if (!canvasCoords) return
    
    const worldCoords = coords.value.canvasToWorld(canvasCoords.x, canvasCoords.y)
    
    // 优先检测是否点击了选中的英雄
    const selectedUnit = unitSystem.selectedUnit.value
    if (selectedUnit) {
      const dx = selectedUnit.position.x - worldCoords.x
      const dy = selectedUnit.position.y - worldCoords.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 50) {  // 在英雄范围内
        isDraggingUnit.value = true
        lastMousePos.value = { x: event.clientX, y: event.clientY }
        // 拖动时暂停播放
        if (isPlaying.value) {
          isPlaying.value = false
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
          }
        }
        return
      }
    }
    
    // 检测眼位拖动
    if (vision.value?.selectedWardId.value) {
      const clickedWard = hitTestWard(worldCoords)
      if (clickedWard && clickedWard.id === vision.value.selectedWardId.value) {
        isDraggingWard.value = true
        lastMousePos.value = { x: event.clientX, y: event.clientY }
      }
    }
  }
}

function handleMouseMove(event: MouseEvent) {
  // 拖动地图
  if (isDragging.value) {
    offsetX.value += event.clientX - lastMousePos.value.x
    offsetY.value += event.clientY - lastMousePos.value.y
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    draw()
    return
  }
  
  // 拖动英雄
  if (isDraggingUnit.value) {
    const selectedUnit = unitSystem.selectedUnit.value
    if (selectedUnit) {
      const canvasCoords = getCanvasCoords(event)
      if (canvasCoords) {
        const worldCoords = coords.value.canvasToWorld(canvasCoords.x, canvasCoords.y)
        // 只有在有效位置才更新英雄位置
        if (isValidPlacement(worldCoords)) {
          selectedUnit.position.x = worldCoords.x
          selectedUnit.position.y = worldCoords.y
          // 保留路径点，只重新计算路径
          selectedUnit.pathPlan.currentPathIndex = 0
          selectedUnit.pathPlan.isMoving = false
          // 如果有路径点，重新计算完整路径
          if (selectedUnit.pathPlan.waypoints.length > 0) {
            calculateUnitPath()
          }
          updateUnitVision()
        }
        draw()
      }
    }
    return
  }
  
  // 拖动眼位
  if (isDraggingWard.value && vision.value?.selectedWardId.value) {
    const canvasCoords = getCanvasCoords(event)
    if (canvasCoords) {
      const worldCoords = coords.value.canvasToWorld(canvasCoords.x, canvasCoords.y)
      // 使用 moveWard 正确更新眼位位置和视野
      vision.value.moveWard(vision.value.selectedWardId.value, worldCoords.x, worldCoords.y)
      needsFogCacheUpdate = true
      draw()
    }
  }
}

function handleMouseUp() {
  isDragging.value = false
  isDraggingWard.value = false
  isDraggingUnit.value = false
}

function resetZoom() {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  draw()
}

function resetUnits() {
  // 清空所有单位
  for (const unit of unitSystem.getAllUnits()) {
    unitSystem.removeUnit(unit.id)
  }
  draw()
}

function resetTrees() {
  mapData.resetTrees()
  needsTreeCacheUpdate = true
  draw()
}

// ===== 视野控制函数 =====
function onTeamChange() {
  if (vision.value) {
    vision.value.currentTeam.value = currentTeam.value
    needsFogCacheUpdate = true
    draw()
  }
}

function onViewChange() {
  if (vision.value) {
    vision.value.currentView.value = currentView.value
    vision.value.updateCombinedVision()
    needsFogCacheUpdate = true
    draw()
  }
}

function onFogToggle() {
  needsFogCacheUpdate = true
  draw()
}

function toggleDayNight() {
  if (vision.value) {
    vision.value.setDaytime(!isDaytime.value)
    vision.value.clearBuildingVisionCache()
    vision.value.updateCombinedVision()
    needsFogCacheUpdate = true
    draw()
  }
}

function clearWards() {
  if (vision.value) {
    vision.value.clearAllWards()
    needsFogCacheUpdate = true
    draw()
  }
}

// ===== 生命周期 =====
onMounted(async () => {
  try {
    await mapData.initialize()
    
    // 初始化视野系统
    vision.value = useVision(mapData.towers, mapData.ancients)
    await vision.value.initialize()
    
    // 初始化战斗系统
    await combatLoop.initialize()
    
    setTimeout(draw, 100)
  } catch (err) {
    console.error('地图初始化失败:', err)
  }
})

// 监听窗口点击关闭菜单
onMounted(() => {
  window.addEventListener('click', () => {
    if (contextMenu.value.visible) {
      contextMenu.value.visible = false
    }
  })
})
</script>

<template>
  <div class="map-container">
    <div v-if="mapData.loading.value" class="loading">
      <div class="spinner"></div>
      <span>加载地图数据中...</span>
    </div>

    <div v-else-if="mapData.error.value" class="error">{{ mapData.error.value }}</div>

    <template v-else>
      <div class="layout">
        <!-- 左侧控制面板 -->
        <MapControlPanel
          :is-daytime="isDaytime"
          :show-towers="showTowers"
          :show-neutral-camps="showNeutralCamps"
          :show-runes="showRunes"
          :show-trees="showTrees"
          :show-nav-grid="showNavGrid"
          :show-buildings="showBuildings"
          :show-fog-of-war="showFogOfWar"
          :show-vision-circles="showVisionCircles"
          :show-lane-paths="showLanePaths"
          :move-speed="moveSpeed"
          :path-length="pathLength"
          :formatted-time="formattedTime"
          :has-path="!!unitSystem.selectedUnit.value?.pathPlan.currentPath.length"
          :tree-count="mapData.trees.value.length"
          :destroyed-tree-count="mapData.destroyedTrees.value.size"
          :current-team="currentTeam"
          :current-view="currentView"
          :ward-count="vision?.wards.value.length ?? 0"
          :vision-ready="!!vision?.visionReady.value"
          @update:show-towers="v => { showTowers = v; draw() }"
          @update:show-neutral-camps="v => { showNeutralCamps = v; draw() }"
          @update:show-runes="v => { showRunes = v; draw() }"
          @update:show-trees="v => { showTrees = v; needsTreeCacheUpdate = true; draw() }"
          @update:show-nav-grid="v => { showNavGrid = v; draw() }"
          @update:show-buildings="v => { showBuildings = v; draw() }"
          @update:show-fog-of-war="v => { showFogOfWar = v; onFogToggle() }"
          @update:show-vision-circles="v => { showVisionCircles = v; draw() }"
          @update:show-lane-paths="v => { showLanePaths = v; draw() }"
          :creep-sim-enabled="creepSimEnabled"
          @update:creep-sim-enabled="v => { creepSimEnabled = v; draw() }"
          @update:move-speed="v => moveSpeed = v"
          @update:current-team="v => { currentTeam = v; onTeamChange() }"
          @update:current-view="v => { currentView = v; onViewChange() }"
          @reset-path="resetUnits"
          @reset-zoom="resetZoom"
          @reset-trees="resetTrees"
          @clear-wards="clearWards"
        />

        <!-- 右侧地图区域（包含时间条和画布） -->
        <div class="map-section">
          <!-- 时间条 -->
          <TimeBar
            :game-time="gameTime"
            :is-playing="isPlaying"
            :play-speed="playSpeed"
            :is-daytime="isDaytime"
            @update:game-time="v => { gameTime = v; onGameTimeChange() }"
            @update:play-speed="v => playSpeed = v"
            @toggle-play="togglePlay"
          />
          
          <!-- 地图画布 -->
          <main class="map-area">
            <canvas
              ref="canvasRef"
              @click="handleCanvasClick"
              @contextmenu="handleContextMenu"
              @wheel="handleWheel"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @mouseleave="handleMouseUp"
            ></canvas>
            
            <!-- 右上角功能面板 -->
            <div v-if="unitSystem.selectedUnit.value" class="hud-panel hud-top-right">
              <div class="hud-title">路径信息</div>
              <div class="hud-row">
                <span class="hud-label">路径点</span>
                <span class="hud-value">{{ unitSystem.selectedUnit.value.pathPlan.waypoints.length }}</span>
              </div>
              <div class="hud-row">
                <span class="hud-label">路径长度</span>
                <span class="hud-value">{{ pathLength }} 单位</span>
              </div>
              <div class="hud-row">
                <span class="hud-label">移动时间</span>
                <span class="hud-value">{{ formattedTime }}</span>
              </div>
              <div class="hud-row">
                <span class="hud-label">状态</span>
                <span class="hud-value" :class="{ 'is-moving': unitSystem.selectedUnit.value.pathPlan.isMoving }">
                  {{ unitSystem.selectedUnit.value.pathPlan.isMoving ? '移动中' : '静止' }}
                </span>
              </div>
            </div>
          </main>
          
          <!-- 底部单位信息面板（在 map-section 层级） -->
          <div v-if="unitSystem.selectedUnit.value" class="hud-panel hud-bottom">
            <div class="unit-icon" :style="{ backgroundColor: getUnitColor(unitSystem.selectedUnit.value.colorIndex), borderColor: TEAM_RING_COLORS[unitSystem.selectedUnit.value.team] }"></div>
            <div class="unit-details">
              <div class="unit-name">{{ unitSystem.selectedUnit.value.name }}</div>
              <div class="unit-team" :class="unitSystem.selectedUnit.value.team">
                {{ unitSystem.selectedUnit.value.team === 'radiant' ? '天辉' : '夜魇' }}
              </div>
            </div>
            <div class="unit-stats">
              <div class="stat-item">
                <span class="stat-label">移速</span>
                <span class="stat-value">{{ unitSystem.selectedUnit.value.combat.moveSpeed }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">攻击</span>
                <span class="stat-value">{{ unitSystem.selectedUnit.value.combat.attackDamageMin }}-{{ unitSystem.selectedUnit.value.combat.attackDamageMax }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">护甲</span>
                <span class="stat-value">{{ unitSystem.selectedUnit.value.combat.armor }}</span>
              </div>
            </div>
            <div class="unit-stats">
              <div class="stat-item">
                <span class="stat-label">日间视野</span>
                <span class="stat-value">{{ unitSystem.selectedUnit.value.vision.dayVision }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">夜间视野</span>
                <span class="stat-value">{{ unitSystem.selectedUnit.value.vision.nightVision }}</span>
              </div>
            </div>
            <div class="unit-position">
              <span class="pos-label">位置</span>
              <span class="pos-value">
                ({{ Math.round(unitSystem.selectedUnit.value.position.x) }}, {{ Math.round(unitSystem.selectedUnit.value.position.y) }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右键菜单 -->
      <MapContextMenu
        :visible="contextMenu.visible"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :items="contextMenu.items"
        @close="contextMenu.visible = false"
      />

      <!-- 实体详情浮窗 -->
      <EntityPopup
        :entity="selectedEntity"
        :position="popupPosition"
        :buildings-data="mapData.buildingsData.value"
        :neutrals-data="mapData.neutralsData.value"
        :camp-spawns-data="mapData.campSpawnsData.value"
        :game-time="gameTime"
        @close="selectedEntity = null; popupPosition = null"
      />
    </template>
  </div>
</template>

<style scoped>
/* ===== 根容器 ===== */
.map-container {
  display: grid;
  grid-template-rows: 1fr;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #1a1a2e;
  color: #eee;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* ===== 加载和错误状态 ===== */
.loading, .error {
  display: grid;
  place-items: center;
  height: 100%;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  color: #ff6b6b;
}

/* ===== 主布局：左右两栏 ===== */
.layout {
  display: grid;
  grid-template-columns: auto 1fr;
  height: 100%;
  overflow: hidden;
}

/* ===== 右侧地图区域：上下两行 ===== */
.map-section {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ===== 地图画布容器 ===== */
.map-area {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
  background: #0d0d1a;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
}

/* ===== HUD 面板通用样式 ===== */
.hud-panel {
  position: absolute;
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(100, 100, 150, 0.5);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  z-index: 100;
  pointer-events: auto;
}

/* ===== 右上角路径信息面板 ===== */
.hud-top-right {
  top: 16px;
  right: 16px;
  min-width: 160px;
}

.hud-title {
  font-weight: bold;
  color: #7ecfff;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(100, 100, 150, 0.3);
}

.hud-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  margin: 4px 0;
}

.hud-label {
  color: #aaa;
}

.hud-value {
  color: #fff;
  font-weight: 500;
}

.hud-value.is-moving {
  color: #4ade80;
}

/* ===== 底部单位信息面板 ===== */
.hud-bottom {
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: auto auto repeat(3, auto) auto;
  align-items: center;
  gap: 16px;
}

.unit-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid;
}

.unit-details {
  min-width: 100px;
}

.unit-name {
  font-weight: bold;
  font-size: 16px;
  color: #fff;
}

.unit-team {
  font-size: 12px;
  margin-top: 2px;
}

.unit-team.radiant {
  color: #32cd32;
}

.unit-team.dire {
  color: #dc143c;
}

.unit-stats {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 16px;
  padding: 0 12px;
  border-left: 1px solid rgba(100, 100, 150, 0.3);
}

.stat-item {
  text-align: center;
  min-width: 50px;
  white-space: nowrap;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.unit-position {
  padding-left: 12px;
  border-left: 1px solid rgba(100, 100, 150, 0.3);
}

.pos-label {
  color: #888;
  font-size: 11px;
  display: block;
  white-space: nowrap;
}

.pos-value {
  color: #fff;
  font-family: monospace;
}
</style>

