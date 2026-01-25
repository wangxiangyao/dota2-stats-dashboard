<script setup lang="ts">
/**
 * InteractiveMapV2.vue - 交互式地图组件（重构版）
 * 
 * 使用新的 composables 架构，支持：
 * - 模块化的数据加载
 * - 可扩展的视野系统
 * - 支持不同单位类型的寻路
 */

import { ref, computed, onMounted, watch, onUnmounted } from 'vue'

// 类型导入
import { 
  MAP_CONSTANTS,
  type Point, 
  type MapEntity, 
  type CampTypeConfig,
  type SelectedEntity,
  type EntityType,
  type WardType,
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

// 子组件导入
import MapControlPanel from './MapControlPanel.vue'
import MapContextMenu from './MapContextMenu.vue'
import EntityPopup from './EntityPopup.vue'

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
  SENTRY_TRUE_SIGHT_RADIUS
} = MAP_CONSTANTS

// ===== Composables 初始化 =====
const mapData = useMapData()

// 坐标转换（在 navData 加载后更新）
const coords = computed(() => useCoordinates(mapData.navWidth.value, mapData.navHeight.value))

// ===== 本地状态 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)

// 交互状态
const startPoint = ref<Point | null>(null)
const endPoint = ref<Point | null>(null)
const path = ref<Point[]>([])
const isSettingStart = ref(true)

// 移速输入
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
  
  gameTime.value = Math.min(3600, gameTime.value + deltaTime * playSpeed.value)
  
  if (gameTime.value >= 3600) {
    isPlaying.value = false
    return
  }
  
  // 更新视野（日夜切换）
  if (vision) {
    vision.setGameTime(gameTime.value)
  }
  
  draw()
  animationFrameId = requestAnimationFrame(updateGameTime)
}

function onGameTimeChange() {
  if (vision) {
    vision.setGameTime(gameTime.value)
    vision.updateCombinedVision()
    needsFogCacheUpdate = true
  }
  draw()
}

// ===== 视野系统（使用 useVision） =====
// 延迟初始化：需要等待 mapData 加载完成
let vision: ReturnType<typeof useVision> | null = null

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

// ===== 计算属性 =====
const pathLength = computed(() => {
  if (path.value.length < 2) return 0
  let total = 0
  for (let i = 1; i < path.value.length; i++) {
    total += coords.value.distance(path.value[i - 1], path.value[i])
  }
  return Math.round(total)
})

const travelTime = computed(() => {
  if (pathLength.value === 0 || moveSpeed.value <= 0) return 0
  return pathLength.value / moveSpeed.value
})

const formattedTime = computed(() => {
  const seconds = travelTime.value
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return `${mins} 分 ${secs} 秒`
})

const formatGameTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
  
  // 绘制树木
  if (showTrees.value) {
    drawTrees(ctx, canvasSize)
  }
  
  // 绘制迷雾（在实体之前，半透明覆盖）
  if (showFogOfWar.value && vision) {
    drawFogOfWar(ctx, canvasSize)
  }
  
  // 绘制眼位
  if (vision) {
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
  
  // 绘制建筑（基地、泉水等）
  if (showBuildings.value) {
    drawBuildings(ctx)
  }
  
  // 绘制神符
  if (showRunes.value) {
    drawRunes(ctx)
  }
  
  // 绘制路径
  drawPath(ctx)
  
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

function drawTrees(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!treeLayerCache || needsTreeCacheUpdate) {
    treeLayerCache = document.createElement('canvas')
    treeLayerCache.width = canvasSize
    treeLayerCache.height = canvasSize
    const cacheCtx = treeLayerCache.getContext('2d')!
    
    cacheCtx.fillStyle = 'rgba(50, 160, 140, 0.6)'
    
    for (const tree of mapData.trees.value) {
      const pos = coords.value.worldToCanvas(tree.x, tree.y)
      const key = `${Math.floor((tree.x - WORLD_MIN) / 64)},${Math.floor((tree.y - WORLD_MIN) / 64)}`
      
      if (mapData.destroyedTrees.value.has(key)) {
        cacheCtx.fillStyle = 'rgba(90, 90, 95, 0.4)'
      } else {
        cacheCtx.fillStyle = 'rgba(50, 160, 140, 0.6)'
      }
      
      cacheCtx.beginPath()
      cacheCtx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
      cacheCtx.fill()
    }
    
    needsTreeCacheUpdate = false
  }
  
  ctx.drawImage(treeLayerCache, 0, 0)
}

function drawNeutralCamps(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255, 165, 0, 0.8)'
  
  for (const camp of mapData.neutralSpawners.value) {
    const pos = coords.value.worldToCanvas(camp.x, camp.y)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawTowers(ctx: CanvasRenderingContext2D) {
  for (const tower of mapData.towers.value) {
    const pos = coords.value.worldToCanvas(tower.x, tower.y)
    const isRadiant = tower.team === 2
    
    ctx.fillStyle = isRadiant ? TEAM_COLORS.radiant : TEAM_COLORS.dire
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawRunes(ctx: CanvasRenderingContext2D) {
  // 神力符
  ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
  for (const rune of mapData.powerupRunes.value) {
    const pos = coords.value.worldToCanvas(rune.x, rune.y)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 赏金符
  ctx.fillStyle = 'rgba(255, 140, 0, 0.9)'
  for (const rune of mapData.bountyRunes.value) {
    const pos = coords.value.worldToCanvas(rune.x, rune.y)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPath(ctx: CanvasRenderingContext2D) {
  // 起点
  if (startPoint.value) {
    const pos = coords.value.worldToCanvas(startPoint.value.x, startPoint.value.y)
    ctx.fillStyle = '#00ff00'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 终点
  if (endPoint.value) {
    const pos = coords.value.worldToCanvas(endPoint.value.x, endPoint.value.y)
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 路径
  if (path.value.length > 1) {
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 3
    ctx.beginPath()
    
    const first = coords.value.worldToCanvas(path.value[0].x, path.value[0].y)
    ctx.moveTo(first.x, first.y)
    
    for (let i = 1; i < path.value.length; i++) {
      const pt = coords.value.worldToCanvas(path.value[i].x, path.value[i].y)
      ctx.lineTo(pt.x, pt.y)
    }
    
    ctx.stroke()
  }
}

function drawBuildings(ctx: CanvasRenderingContext2D) {
  // 绘制基地（遗迹）
  for (const ancient of mapData.ancients.value) {
    const pos = coords.value.worldToCanvas(ancient.x, ancient.y)
    const isRadiant = ancient.team === 2
    
    // 基地图标：大圆 + 内部图案
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2)
    ctx.fillStyle = isRadiant ? 'rgba(100, 200, 100, 0.8)' : 'rgba(200, 100, 100, 0.8)'
    ctx.fill()
    ctx.strokeStyle = isRadiant ? '#2ecc71' : '#e74c3c'
    ctx.lineWidth = 3
    ctx.stroke()
    
    // 画城堡图标
    ctx.fillStyle = '#fff'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏰', pos.x, pos.y)
  }
  
  // 绘制泉水
  for (const fountain of mapData.fountains.value) {
    const pos = coords.value.worldToCanvas(fountain.x, fountain.y)
    const isRadiant = fountain.team === 2
    
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
    ctx.fillStyle = isRadiant ? 'rgba(100, 200, 255, 0.7)' : 'rgba(255, 150, 100, 0.7)'
    ctx.fill()
    ctx.strokeStyle = isRadiant ? '#3498db' : '#e67e22'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⛲', pos.x, pos.y)
  }
  
  // 绘制前哨
  for (const outpost of mapData.outposts.value) {
    const pos = coords.value.worldToCanvas(outpost.x, outpost.y)
    
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(150, 150, 150, 0.7)'
    ctx.fill()
    ctx.strokeStyle = '#95a5a6'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🔭', pos.x, pos.y)
  }
}

// ===== 迷雾和眼位渲染 =====
function drawFogOfWar(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!vision || !vision.visionReady.value) return
  
  // 使用缓存
  if (needsFogCacheUpdate || !fogOfWarCache) {
    fogOfWarCache = document.createElement('canvas')
    fogOfWarCache.width = canvasSize
    fogOfWarCache.height = canvasSize
    const cacheCtx = fogOfWarCache.getContext('2d')!
    
    // 填充迷雾（半透明黑色）
    cacheCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    cacheCtx.fillRect(0, 0, canvasSize, canvasSize)
    
    // 挖空可见区域
    cacheCtx.globalCompositeOperation = 'destination-out'
    cacheCtx.fillStyle = 'rgba(0, 0, 0, 1)'
    
    const gridCellSize = VISION_GRID_SIZE
    const cellPixels = canvasSize / ((WORLD_MAX - WORLD_MIN) / gridCellSize)
    
    for (const key of vision.combinedVision.value) {
      const [gX, gY] = key.split(',').map(Number)
      const worldX = gX * gridCellSize + WORLD_MIN
      const worldY = gY * gridCellSize + WORLD_MIN
      const pos = coords.value.worldToCanvas(worldX, worldY)
      
      cacheCtx.beginPath()
      cacheCtx.arc(pos.x, pos.y, cellPixels * 0.6, 0, Math.PI * 2)
      cacheCtx.fill()
    }
    
    cacheCtx.globalCompositeOperation = 'source-over'
    needsFogCacheUpdate = false
  }
  
  ctx.drawImage(fogOfWarCache, 0, 0)
}

function drawWards(ctx: CanvasRenderingContext2D) {
  if (!vision) return
  
  for (const ward of vision.wards.value) {
    const pos = coords.value.worldToCanvas(ward.worldX, ward.worldY)
    const isRadiant = ward.team === 'radiant'
    const isObserver = ward.type === 'observer'
    const isExpiring = vision.isWardExpiring(ward)
    
    // 检查假眼是否已过期
    const timeElapsed = gameTime.value - ward.placedAt
    const isExpired = isObserver && timeElapsed >= vision.OBSERVER_DURATION
    
    if (isExpired) continue // 过期眼位不显示
    
    // 眼位圆圈
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
    
    // 视野圈（如果启用）
    if (showVisionCircles.value && isObserver) {
      const visionRadius = vision.getWardDisplayRadius(ward, mapData.navWidth.value)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, visionRadius, 0, Math.PI * 2)
      ctx.strokeStyle = isRadiant ? 'rgba(50, 205, 50, 0.4)' : 'rgba(220, 20, 60, 0.4)'
      ctx.lineWidth = 2
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
  if (currentWardMode.value && vision) {
    const success = vision.placeWard(worldCoords.x, worldCoords.y, currentWardMode.value)
    if (success) {
      needsFogCacheUpdate = true
      draw()
    }
    return
  }
  
  // 检测是否点击实体
  const clickedEntity = hitTestEntity(worldCoords, event)
  if (clickedEntity) {
    selectedEntity.value = clickedEntity
    popupPosition.value = { x: event.clientX + 10, y: event.clientY + 10 }
    return
  }
  
  // 关闭已打开的浮窗
  if (selectedEntity.value) {
    selectedEntity.value = null
    popupPosition.value = null
  }
  
  if (isSettingStart.value) {
    startPoint.value = worldCoords
    isSettingStart.value = false
  } else {
    endPoint.value = worldCoords
    isSettingStart.value = true
    
    // 执行寻路
    if (startPoint.value && endPoint.value) {
      const pathfinding = usePathfinding(
        mapData.navData,
        mapData.navWidth,
        mapData.navHeight,
        mapData.treeIndex,
        mapData.destroyedTrees,
        showTrees
      )
      path.value = pathfinding.findPath(startPoint.value, endPoint.value)
    }
  }
  
  draw()
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
        return { 
          type: 'camp', 
          data: camp, 
          index: i,
          campType: camp.type || camp.targetname?.includes('ancient') ? 'ancient' : undefined
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
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        label: '放置假眼 (Observer)',
        icon: '👁',
        action: () => {
          if (vision) {
            vision.placeWard(worldCoords.x, worldCoords.y, 'observer')
            needsFogCacheUpdate = true
            draw()
          }
        }
      },
      {
        label: '放置真眼 (Sentry)',
        icon: '🔮',
        action: () => {
          if (vision) {
            vision.placeWard(worldCoords.x, worldCoords.y, 'sentry')
            draw()
          }
        }
      },
      {
        label: '清除所有眼位',
        icon: '🗑',
        action: () => {
          if (vision) {
            vision.clearAllWards()
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
  if (event.button === 1) {
    isDragging.value = true
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    event.preventDefault()
  }
}

function handleMouseMove(event: MouseEvent) {
  if (isDragging.value) {
    offsetX.value += event.clientX - lastMousePos.value.x
    offsetY.value += event.clientY - lastMousePos.value.y
    lastMousePos.value = { x: event.clientX, y: event.clientY }
    draw()
  }
}

function handleMouseUp() {
  isDragging.value = false
}

function resetZoom() {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  draw()
}

function resetPoints() {
  startPoint.value = null
  endPoint.value = null
  path.value = []
  isSettingStart.value = true
  draw()
}

function resetTrees() {
  mapData.resetTrees()
  needsTreeCacheUpdate = true
  draw()
}

// ===== 视野控制函数 =====
function onTeamChange() {
  if (vision) {
    vision.currentTeam.value = currentTeam.value
    needsFogCacheUpdate = true
    draw()
  }
}

function onViewChange() {
  if (vision) {
    vision.currentView.value = currentView.value
    vision.updateCombinedVision()
    needsFogCacheUpdate = true
    draw()
  }
}

function onFogToggle() {
  needsFogCacheUpdate = true
  draw()
}

function toggleDayNight() {
  if (vision) {
    vision.setDaytime(!isDaytime.value)
    vision.clearBuildingVisionCache()
    vision.updateCombinedVision()
    needsFogCacheUpdate = true
    draw()
  }
}

function clearWards() {
  if (vision) {
    vision.clearAllWards()
    needsFogCacheUpdate = true
    draw()
  }
}

// ===== 生命周期 =====
onMounted(async () => {
  try {
    await mapData.initialize()
    
    // 初始化视野系统
    vision = useVision(mapData.towers, mapData.ancients)
    await vision.initialize()
    
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
          :game-time="gameTime"
          :is-playing="isPlaying"
          :play-speed="playSpeed"
          :is-daytime="isDaytime"
          :show-towers="showTowers"
          :show-neutral-camps="showNeutralCamps"
          :show-runes="showRunes"
          :show-trees="showTrees"
          :show-nav-grid="showNavGrid"
          :show-buildings="showBuildings"
          :show-fog-of-war="showFogOfWar"
          :show-vision-circles="showVisionCircles"
          :move-speed="moveSpeed"
          :path-length="pathLength"
          :formatted-time="formattedTime"
          :has-path="path.length > 0"
          :tree-count="mapData.trees.value.length"
          :destroyed-tree-count="mapData.destroyedTrees.value.size"
          :current-team="currentTeam"
          :current-view="currentView"
          :ward-count="vision?.wards.value.length ?? 0"
          :vision-ready="!!vision?.visionReady.value"
          @update:game-time="v => { gameTime = v; onGameTimeChange() }"
          @update:play-speed="v => playSpeed = v"
          @toggle-play="togglePlay"
          @update:show-towers="v => { showTowers = v; draw() }"
          @update:show-neutral-camps="v => { showNeutralCamps = v; draw() }"
          @update:show-runes="v => { showRunes = v; draw() }"
          @update:show-trees="v => { showTrees = v; needsTreeCacheUpdate = true; draw() }"
          @update:show-nav-grid="v => { showNavGrid = v; draw() }"
          @update:show-buildings="v => { showBuildings = v; draw() }"
          @update:show-fog-of-war="v => { showFogOfWar = v; onFogToggle() }"
          @update:show-vision-circles="v => { showVisionCircles = v; draw() }"
          @update:move-speed="v => moveSpeed = v"
          @update:current-team="v => { currentTeam = v; onTeamChange() }"
          @update:current-view="v => { currentView = v; onViewChange() }"
          @reset-path="resetPoints"
          @reset-zoom="resetZoom"
          @reset-trees="resetTrees"
          @clear-wards="clearWards"
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
        </main>
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
        @close="selectedEntity = null; popupPosition = null"
      />
    </template>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  background: #1a1a2e;
  color: #eee;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.layout {
  display: flex;
  height: 100%;
}

.map-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0d0d1a;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
}
</style>

