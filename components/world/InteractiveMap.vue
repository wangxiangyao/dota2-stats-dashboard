<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

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

const findPath = (start: Point, end: Point): Point[] => {
  const startNav = worldToNav(start.x, start.y)
  const endNav = worldToNav(end.x, end.y)

  if (!isWalkable(startNav.x, startNav.y) || !isWalkable(endNav.x, endNav.y)) {
    return []
  }

  const openList: PathNode[] = []
  const closedSet = new Set<string>()
  
  const directions = [
    { dx: 1, dy: 0, cost: 1 },
    { dx: -1, dy: 0, cost: 1 },
    { dx: 0, dy: 1, cost: 1 },
    { dx: 0, dy: -1, cost: 1 },
    { dx: 1, dy: 1, cost: Math.SQRT2 },
    { dx: 1, dy: -1, cost: Math.SQRT2 },
    { dx: -1, dy: 1, cost: Math.SQRT2 },
    { dx: -1, dy: -1, cost: Math.SQRT2 }
  ]

  const startNode: PathNode = {
    x: startNav.x, y: startNav.y,
    g: 0,
    h: heuristic(startNav.x, startNav.y, endNav.x, endNav.y),
    f: 0,
    parent: null
  }
  startNode.f = startNode.g + startNode.h
  openList.push(startNode)

  let iterations = 0
  const maxIterations = 100000

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++

    // 找 f 值最小的节点
    let lowestIdx = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) lowestIdx = i
    }
    const current = openList.splice(lowestIdx, 1)[0]

    // 到达终点
    if (current.x === endNav.x && current.y === endNav.y) {
      const result: Point[] = []
      let node: PathNode | null = current
      while (node) {
        result.unshift(navToWorld(node.x, node.y))
        node = node.parent
      }
      return result
    }

    const key = `${current.x},${current.y}`
    if (closedSet.has(key)) continue
    closedSet.add(key)

    // 探索邻居
    for (const dir of directions) {
      const nx = current.x + dir.dx
      const ny = current.y + dir.dy
      const neighborKey = `${nx},${ny}`

      if (closedSet.has(neighborKey) || !isWalkable(nx, ny)) continue

      // 对角线检查
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!isWalkable(current.x + dir.dx, current.y) ||
            !isWalkable(current.x, current.y + dir.dy)) continue
      }

      const g = current.g + dir.cost
      const h = heuristic(nx, ny, endNav.x, endNav.y)
      const existingIdx = openList.findIndex(n => n.x === nx && n.y === ny)
      
      if (existingIdx !== -1) {
        if (g < openList[existingIdx].g) {
          openList[existingIdx].g = g
          openList[existingIdx].f = g + h
          openList[existingIdx].parent = current
        }
      } else {
        openList.push({ x: nx, y: ny, g, h, f: g + h, parent: current })
      }
    }
  }

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
  
  // 3. 绘制实体图层
  if (mapEntities.value) {
    if (showTrees.value) drawTrees(ctx)
    if (showBuildings.value) drawBuildings(ctx)
    if (showTowers.value) drawTowers(ctx)
    if (showNeutralCamps.value) drawNeutralCamps(ctx)
    if (showRunes.value) drawRunes(ctx)
  }
  
  // 4. 绘制路径和起终点
  drawOverlay(ctx)
  
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
    
    ctx.fillStyle = destroyed ? 'rgba(100, 100, 100, 0.3)' : 'rgba(34, 139, 34, 0.7)'
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

// 绘制野怪营地
const drawNeutralCamps = (ctx: CanvasRenderingContext2D) => {
  const camps = mapEntities.value?.npc_dota_neutral_spawner
  if (!camps) return
  
  ctx.fillStyle = '#ff8c00'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  for (const camp of camps) {
    const pos = worldToCanvas(camp.x, camp.y)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)  // 放大半径
    ctx.fill()
    ctx.stroke()
  }
}

// 绘制建筑
const drawBuildings = (ctx: CanvasRenderingContext2D) => {
  const entities = mapEntities.value
  if (!entities) return
  
  // 前哨
  for (const outpost of entities.npc_dota_watch_tower || []) {
    const pos = worldToCanvas(outpost.x, outpost.y)
    ctx.fillStyle = '#9b59b6'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6
      const x = pos.x + 24 * Math.cos(angle)  // 放大
      const y = pos.y + 24 * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  
  // 泉水
  for (const fountain of entities.ent_dota_fountain || []) {
    const pos = worldToCanvas(fountain.x, fountain.y)
    ctx.fillStyle = fountain.team === 2 ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2)  // 放大
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 30px sans-serif'  // 放大字体
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⛲', pos.x, pos.y)
  }
  
  // 遗迹
  for (const fort of entities.npc_dota_fort || []) {
    const pos = worldToCanvas(fort.x, fort.y)
    ctx.fillStyle = '#f39c12'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - 40)  // 放大
    ctx.lineTo(pos.x + 35, pos.y)
    ctx.lineTo(pos.x, pos.y + 40)
    ctx.lineTo(pos.x - 35, pos.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

// 绘制防御塔
const drawTowers = (ctx: CanvasRenderingContext2D) => {
  const towers = mapEntities.value?.npc_dota_tower
  if (!towers) return
  
  for (const tower of towers) {
    const pos = worldToCanvas(tower.x, tower.y)
    const isRadiant = tower.team === 2
    const name = tower.name || ''
    let r = 20  // 放大基础尺寸
    if (name.includes('tower1')) r = 18
    else if (name.includes('tower2')) r = 20
    else if (name.includes('tower3')) r = 22
    else if (name.includes('tower4')) r = 24
    
    ctx.fillStyle = isRadiant ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2)
    ctx.strokeRect(pos.x - r, pos.y - r, r * 2, r * 2)
  }
}

// 绘制神符
const drawRunes = (ctx: CanvasRenderingContext2D) => {
  // 力量神符
  for (const rune of mapEntities.value?.dota_item_rune_spawner_powerup || []) {
    const pos = worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = 'rgba(155, 89, 182, 0.9)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    const s = 20  // 放大尺寸
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - s)
    ctx.lineTo(pos.x + s, pos.y)
    ctx.lineTo(pos.x, pos.y + s)
    ctx.lineTo(pos.x - s, pos.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  
  // 赏金神符
  for (const rune of mapEntities.value?.dota_item_rune_spawner_bounty || []) {
    const pos = worldToCanvas(rune.x, rune.y)
    ctx.fillStyle = 'rgba(241, 196, 15, 0.9)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)  // 放大半径
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
  if (!navData.value || isDragging.value) return
  
  const coords = getCanvasCoords(event)
  if (!coords) return
  
  const worldPoint = canvasToWorld(coords.x, coords.y)
  console.log(coords, worldPoint)
  
  // Shift+点击：砍树/恢复树木
  if (event.shiftKey && showTrees.value) {
    const gX = Math.round((worldPoint.x - WORLD_MIN) / 64)
    const gY = Math.round((worldPoint.y - WORLD_MIN) / 64)
    const key = `${gX},${gY}`
    
    if (treeIndex.value.has(key)) {
      if (destroyedTrees.value.has(key)) {
        // 恢复树木
        destroyedTrees.value.delete(key)
      } else {
        // 砲树
        destroyedTrees.value.add(key)
      }
      needsTreeCacheUpdate = true
      draw()
      return
    }
  }
  
  // 普通点击：设置起点/终点
  const navPos = worldToNav(worldPoint.x, worldPoint.y)
  if (!isWalkable(navPos.x, navPos.y)) return
  
  if (isSettingStart.value) {
    startPoint.value = worldPoint
    isSettingStart.value = false
    path.value = []
  } else {
    endPoint.value = worldPoint
    isSettingStart.value = true
    if (startPoint.value && endPoint.value) {
      path.value = findPath(startPoint.value, endPoint.value)
    }
  }
  draw()
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

// 中键拖拽
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 1) {
    event.preventDefault()
    isDragging.value = true
    lastMousePos.value = { x: event.clientX, y: event.clientY }
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const deltaX = (event.clientX - lastMousePos.value.x) / rect.width * canvas.width
  const deltaY = (event.clientY - lastMousePos.value.y) / rect.height * canvas.height
  
  offsetX.value += deltaX
  offsetY.value += deltaY
  lastMousePos.value = { x: event.clientX, y: event.clientY }
  
  draw()
}

const handleMouseUp = (event: MouseEvent) => {
  if (event.button === 1) {
    isDragging.value = false
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
      mapImage.value!.src = `/images/map/${MAP_VERSION}/elevation.png`
    })

    // 加载实体数据
    const loadEntities = async () => {
      try {
        const [trees, spawners, towers, forts, fountains, outposts, powerRunes, bountyRunes] = await Promise.all([
          fetch('/data/world/entities/trees.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/neutral-spawners.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/towers.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/forts.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/fountains.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/outposts.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/runes-power.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/runes-bounty.json').then(r => r.json()).catch(() => ({ data: [] }))
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
        
        if (trees.data?.length > 0) {
          buildTreeIndex(trees.data)
        }
      } catch (err) {
        console.warn('地图实体加载失败:', err)
      }
    }

    await Promise.all([navPromise, mapPromise, loadEntities()])
    loading.value = false
    setTimeout(draw, 100)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载地图数据失败'
    loading.value = false
  }
})

watch(moveSpeed, () => {})
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
            @contextmenu.prevent
            class="map-canvas"
            :class="{ dragging: isDragging }"
          ></canvas>
          
          <div class="zoom-controls" v-if="scale !== 1">
            <button @click="resetZoom">↺ 重置缩放</button>
          </div>
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
</style>
