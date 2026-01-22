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

// ===== 常量 =====
const CANVAS_SIZE = 600 // Canvas 显示大小
const MAP_VERSION = '7.40b'

// 世界坐标范围 (来自 worlddata.json)
const WORLD_MIN = -9600
const WORLD_MAX = 9600
const WORLD_SIZE = WORLD_MAX - WORLD_MIN // 19200

// ===== 状态 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 导航数据 (从 gridnav.png 读取)
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
const showNavGrid = ref(true)  // 导航网格默认选中
const showTrees = ref(true)
const showNeutralCamps = ref(true)
const showBuildings = ref(true)

// 缩放和拖拽
const scale = ref(1)
const minScale = 0.5
const maxScale = 4
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const isMiddleButtonDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

// 地图实体数据
interface MapEntity {
  x: number
  y: number
  z?: number
  name?: string
  team?: number
  bounds?: number[]
}

interface MapData {
  npc_dota_neutral_spawner?: MapEntity[]
  npc_dota_watch_tower?: MapEntity[]
  ent_dota_fountain?: MapEntity[]
  ent_dota_tree?: MapEntity[]
  npc_dota_tower?: MapEntity[]
  npc_dota_fort?: MapEntity[]
}

// 野怪营地类型数据
interface CampType {
  id: number
  x: number
  y: number
  type: 'small' | 'medium' | 'large' | 'ancient' | null
  note?: string
}

const mapEntities = ref<MapData | null>(null)
const campTypes = ref<CampType[]>([])

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
  if (seconds < 60) {
    return `${seconds.toFixed(1)} 秒`
  }
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return `${mins} 分 ${secs} 秒`
})

// ===== 坐标转换 =====
// gridnav.png 的坐标系：Y 轴翻转（图像 Y=0 对应游戏 Y=WORLD_MAX）
// 参考 dota-map-coordinates 的 grid_to_image: (gX, gridHeight - gY - 1)

// 世界坐标 -> 画布坐标（与 gridnav.png 一致，Y轴翻转）
const worldToCanvas = (worldX: number, worldY: number): Point => {
  const x = ((worldX - WORLD_MIN) / WORLD_SIZE) * CANVAS_SIZE
  // Y 轴翻转：游戏 Y 越大，画布 Y 越小
  const y = ((WORLD_MAX - worldY) / WORLD_SIZE) * CANVAS_SIZE
  return { x, y }
}

// 画布坐标 -> 世界坐标
const canvasToWorld = (canvasX: number, canvasY: number): Point => {
  const x = (canvasX / CANVAS_SIZE) * WORLD_SIZE + WORLD_MIN
  // Y 轴翻转
  const y = WORLD_MAX - (canvasY / CANVAS_SIZE) * WORLD_SIZE
  return { x, y }
}

// 世界坐标 -> 导航图像素坐标（与 gridnav.png 生成逻辑一致）
const worldToNav = (worldX: number, worldY: number): Point => {
  // 对应 world_to_grid: (wX - worldMinX) / 64
  const gX = Math.round((worldX - WORLD_MIN) / 64)
  const gY = Math.round((worldY - WORLD_MIN) / 64)
  // 对应 grid_to_image: (gX, gridHeight - gY - 1)
  const x = gX
  const y = navHeight.value - gY - 1
  return {
    x: Math.max(0, Math.min(navWidth.value - 1, x)),
    y: Math.max(0, Math.min(navHeight.value - 1, y))
  }
}

// 导航图像素坐标 -> 世界坐标
const navToWorld = (navX: number, navY: number): Point => {
  // 反向：从图像坐标恢复网格坐标
  const gX = navX
  const gY = navHeight.value - navY - 1
  // 对应 grid_to_world: gX * 64 + worldMinX
  const x = gX * 64 + WORLD_MIN
  const y = gY * 64 + WORLD_MIN
  return { x, y }
}

// ===== 检查是否可行走 =====
const isWalkable = (navX: number, navY: number): boolean => {
  if (!navData.value) return false
  if (navX < 0 || navX >= navWidth.value || navY < 0 || navY >= navHeight.value) {
    return false
  }
  // 图片是RGBA格式，每个像素4字节
  const idx = (navY * navWidth.value + navX) * 4
  // 白色 (亮度高) = 可行走，黑色 (亮度低) = 阻挡
  // 使用 R 通道判断
  return navData.value[idx] > 128
}

// ===== A* 寻路算法 =====
const heuristic = (ax: number, ay: number, bx: number, by: number): number => {
  // 欧几里得距离
  const dx = Math.abs(ax - bx)
  const dy = Math.abs(ay - by)
  return Math.sqrt(dx * dx + dy * dy)
}

const findPath = (start: Point, end: Point): Point[] => {
  const startNav = worldToNav(start.x, start.y)
  const endNav = worldToNav(end.x, end.y)

  // 检查起点和终点是否有效
  if (!isWalkable(startNav.x, startNav.y)) {
    console.warn('起点被阻挡', startNav)
    return []
  }
  if (!isWalkable(endNav.x, endNav.y)) {
    console.warn('终点被阻挡', endNav)
    return []
  }

  const openList: PathNode[] = []
  const closedSet = new Set<string>()

  const startNode: PathNode = {
    x: startNav.x,
    y: startNav.y,
    g: 0,
    h: heuristic(startNav.x, startNav.y, endNav.x, endNav.y),
    f: 0,
    parent: null
  }
  startNode.f = startNode.g + startNode.h
  openList.push(startNode)

  // 8方向移动
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

  let iterations = 0
  const maxIterations = 100000

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++

    // 找到 f 值最小的节点
    let lowestIdx = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i
      }
    }
    const current = openList.splice(lowestIdx, 1)[0]

    // 到达终点
    if (current.x === endNav.x && current.y === endNav.y) {
      const resultPath: Point[] = []
      let node: PathNode | null = current
      while (node) {
        const worldPos = navToWorld(node.x, node.y)
        resultPath.unshift(worldPos)
        node = node.parent
      }
      console.log(`寻路完成，迭代次数: ${iterations}，路径点数: ${resultPath.length}`)
      return resultPath
    }

    const key = `${current.x},${current.y}`
    if (closedSet.has(key)) continue
    closedSet.add(key)

    // 探索邻居
    for (const dir of directions) {
      const nx = current.x + dir.dx
      const ny = current.y + dir.dy
      const neighborKey = `${nx},${ny}`

      if (closedSet.has(neighborKey)) continue
      if (!isWalkable(nx, ny)) continue

      // 对角线移动检查：确保不穿过角落
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!isWalkable(current.x + dir.dx, current.y) ||
            !isWalkable(current.x, current.y + dir.dy)) {
          continue
        }
      }

      const g = current.g + dir.cost
      const h = heuristic(nx, ny, endNav.x, endNav.y)

      // 检查是否已在 openList 中且有更好的路径
      const existingIdx = openList.findIndex(n => n.x === nx && n.y === ny)
      if (existingIdx !== -1) {
        if (g < openList[existingIdx].g) {
          openList[existingIdx].g = g
          openList[existingIdx].f = g + h
          openList[existingIdx].parent = current
        }
      } else {
        openList.push({
          x: nx,
          y: ny,
          g,
          h,
          f: g + h,
          parent: current
        })
      }
    }
  }

  console.warn(`未找到路径，迭代次数: ${iterations}`)
  return []
}

// ===== 绘制函数 =====
const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 保存原始状态
  ctx.save()
  
  // 应用缩放和平移变换
  // 先平移到缩放中心，再缩放，再平移回去
  ctx.translate(offsetX.value, offsetY.value)
  ctx.scale(scale.value, scale.value)

  // 绘制地图底图 (elevation.png)
  if (mapImage.value && mapImage.value.complete) {
    ctx.drawImage(mapImage.value, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }

  // 叠加显示导航网格
  if (showNavGrid.value && navData.value) {
    drawNavGrid(ctx)
  }

  // 绘制地图实体图层
  if (mapEntities.value) {
    // 树木层（最底层）
    if (showTrees.value) {
      drawTrees(ctx)
    }
    // 建筑层
    if (showBuildings.value) {
      drawBuildings(ctx)
    }
    // 野怪营地层
    if (showNeutralCamps.value) {
      drawNeutralCamps(ctx)
    }
  }

  drawOverlay(ctx)
  
  // 恢复原始状态
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

// 绘制树木
const drawTrees = (ctx: CanvasRenderingContext2D) => {
  const trees = mapEntities.value?.ent_dota_tree
  if (!trees) return

  ctx.fillStyle = 'rgba(34, 139, 34, 0.6)'
  for (const tree of trees) {
    const pos = worldToCanvas(tree.x, tree.y)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 营地类型样式映射
const campStyleMap: Record<string, { radius: number; color: string }> = {
  small: { radius: 2.5, color: '#4ade80' },   // 绿色
  medium: { radius: 3, color: '#facc15' },    // 黄色
  large: { radius: 3.5, color: '#fb923c' },   // 橙色
  ancient: { radius: 4, color: '#a855f7' }    // 紫色
}
const defaultCampStyle = { radius: 2.5, color: '#ff8c00' }  // 未标注的营地

// 绘制野怪营地（根据类型显示不同颜色和大小）
const drawNeutralCamps = (ctx: CanvasRenderingContext2D) => {
  const camps = mapEntities.value?.npc_dota_neutral_spawner
  if (!camps) return

  for (const camp of camps) {
    // 查找该营地的类型标注
    const campType = campTypes.value.find(c => c.x === camp.x && c.y === camp.y)
    const style = campType?.type ? campStyleMap[campType.type] : defaultCampStyle
    
    const pos = worldToCanvas(camp.x, camp.y)
    ctx.beginPath()
    ctx.fillStyle = style.color
    ctx.arc(pos.x, pos.y, style.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 绘制建筑
const drawBuildings = (ctx: CanvasRenderingContext2D) => {
  const entities = mapEntities.value
  if (!entities) return

  // 绘制前哨
  const outposts = entities.npc_dota_watch_tower || []
  for (const outpost of outposts) {
    const pos = worldToCanvas(outpost.x, outpost.y)
    ctx.fillStyle = '#9b59b6'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2

    // 六边形
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6
      const x = pos.x + 8 * Math.cos(angle)
      const y = pos.y + 8 * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // 绘制泉水
  const fountains = entities.ent_dota_fountain || []
  for (const fountain of fountains) {
    const pos = worldToCanvas(fountain.x, fountain.y)
    const isRadiant = fountain.team === 2
    ctx.fillStyle = isRadiant ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2

    // 圆形
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 图标
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⛲', pos.x, pos.y)
  }

  // 绘制遗迹
  const forts = entities.npc_dota_fort || []
  for (const fort of forts) {
    const pos = worldToCanvas(fort.x, fort.y)
    ctx.fillStyle = '#f39c12'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2

    // 菱形
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - 12)
    ctx.lineTo(pos.x + 10, pos.y)
    ctx.lineTo(pos.x, pos.y + 12)
    ctx.lineTo(pos.x - 10, pos.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

// 绘制导航网格（调试用，标记障碍区域）
const drawNavGrid = (ctx: CanvasRenderingContext2D) => {
  if (!navData.value) return

  const imageData = ctx.createImageData(navWidth.value, navHeight.value)

  for (let y = 0; y < navHeight.value; y++) {
    for (let x = 0; x < navWidth.value; x++) {
      const idx = (y * navWidth.value + x) * 4
      const walkable = navData.value[idx] > 128

      if (walkable) {
        // 可行走区域：完全透明
        imageData.data[idx] = 0
        imageData.data[idx + 1] = 0
        imageData.data[idx + 2] = 0
        imageData.data[idx + 3] = 0
      } else {
        // 阻挡区域：深灰色半透明（与地势图色系一致）
        imageData.data[idx] = 30
        imageData.data[idx + 1] = 30
        imageData.data[idx + 2] = 35
        imageData.data[idx + 3] = 180
      }
    }
  }

  // 创建临时 canvas 来绘制导航图
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = navWidth.value
  tempCanvas.height = navHeight.value
  const tempCtx = tempCanvas.getContext('2d')
  if (tempCtx) {
    tempCtx.putImageData(imageData, 0, 0)
    // 将导航图缩放绘制到主 canvas
    ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }
}

const drawOverlay = (ctx: CanvasRenderingContext2D) => {
  // 绘制路径
  if (path.value.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const firstPoint = worldToCanvas(path.value[0].x, path.value[0].y)
    ctx.moveTo(firstPoint.x, firstPoint.y)

    for (let i = 1; i < path.value.length; i++) {
      const p = worldToCanvas(path.value[i].x, path.value[i].y)
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }

  // 绘制起点
  if (startPoint.value) {
    const sp = worldToCanvas(startPoint.value.x, startPoint.value.y)
    ctx.beginPath()
    ctx.fillStyle = '#2ecc71'
    ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('起', sp.x, sp.y + 4)
  }

  // 绘制终点
  if (endPoint.value) {
    const ep = worldToCanvas(endPoint.value.x, endPoint.value.y)
    ctx.beginPath()
    ctx.fillStyle = '#e74c3c'
    ctx.arc(ep.x, ep.y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('终', ep.x, ep.y + 4)
  }
}

// ===== 事件处理 =====

// 获取考虑缩放和偏移后的画布坐标
// 变换顺序：translate(offsetX, offsetY) -> scale(scale)
// 逆变换：(rawX - offsetX) / scale, (rawY - offsetY) / scale
const getCanvasCoords = (event: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return null
  
  const rect = canvas.getBoundingClientRect()
  
  // 屏幕坐标 -> 画布原始坐标
  const rawX = (event.clientX - rect.left) / rect.width * CANVAS_SIZE
  const rawY = (event.clientY - rect.top) / rect.height * CANVAS_SIZE
  
  // 逆变换：还原到未变换的画布坐标
  const canvasX = (rawX - offsetX.value) / scale.value
  const canvasY = (rawY - offsetY.value) / scale.value
  
  return { canvasX, canvasY, rawX, rawY }
}

const handleCanvasClick = (event: MouseEvent) => {
  if (!navData.value) return
  
  // 如果是中键拖拽刚结束，忽略点击
  if (isMiddleButtonDragging.value) return
  
  const coords = getCanvasCoords(event)
  if (!coords) return

  const worldPoint = canvasToWorld(coords.canvasX, coords.canvasY)

  if (isSettingStart.value) {
    startPoint.value = worldPoint
    isSettingStart.value = false
    path.value = []
  } else {
    endPoint.value = worldPoint
    isSettingStart.value = true

    // 计算路径
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
  
  // 获取鼠标在画布上的位置
  const mouseX = (event.clientX - rect.left) / rect.width * CANVAS_SIZE
  const mouseY = (event.clientY - rect.top) / rect.height * CANVAS_SIZE
  
  // 计算鼠标在当前变换下对应的原始画布坐标
  const worldX = (mouseX - offsetX.value) / scale.value
  const worldY = (mouseY - offsetY.value) / scale.value
  
  // 计算新缩放比例
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(minScale, Math.min(maxScale, scale.value * zoomFactor))
  
  // 计算新的偏移，使鼠标位置保持不变
  // 新变换后：mouseX = worldX * newScale + newOffsetX
  // 所以：newOffsetX = mouseX - worldX * newScale
  offsetX.value = mouseX - worldX * newScale
  offsetY.value = mouseY - worldY * newScale
  scale.value = newScale
  
  draw()
}

// 鼠标中键拖拽开始
const handleMouseDown = (event: MouseEvent) => {
  // 中键 (button === 1)
  if (event.button === 1) {
    event.preventDefault()
    isMiddleButtonDragging.value = true
    lastMousePos.value = { x: event.clientX, y: event.clientY }
  }
}

// 鼠标移动（拖拽时平移）
const handleMouseMove = (event: MouseEvent) => {
  if (!isMiddleButtonDragging.value) return
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  
  // 直接使用屏幕像素转画布像素的比例
  const deltaX = (event.clientX - lastMousePos.value.x) / rect.width * CANVAS_SIZE
  const deltaY = (event.clientY - lastMousePos.value.y) / rect.height * CANVAS_SIZE
  
  // 在当前变换下，偏移直接加鼠标移动量
  offsetX.value += deltaX
  offsetY.value += deltaY
  
  lastMousePos.value = { x: event.clientX, y: event.clientY }
  draw()
}

// 鼠标释放
const handleMouseUp = (event: MouseEvent) => {
  if (event.button === 1) {
    isMiddleButtonDragging.value = false
  }
}

// 重置缩放
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

// ===== 数据加载 =====
onMounted(async () => {
  try {
    // 并行加载导航图、底图和地图实体数据
    const navImg = new Image()
    navImg.crossOrigin = 'anonymous'

    mapImage.value = new Image()

    // 加载导航图并提取像素数据
    const navPromise = new Promise<void>((resolve, reject) => {
      navImg.onload = () => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = navImg.width
        tempCanvas.height = navImg.height
        const tempCtx = tempCanvas.getContext('2d')

        if (!tempCtx) {
          reject(new Error('无法创建 canvas context'))
          return
        }

        tempCtx.drawImage(navImg, 0, 0)
        const imageData = tempCtx.getImageData(0, 0, navImg.width, navImg.height)

        navData.value = imageData.data
        navWidth.value = navImg.width
        navHeight.value = navImg.height

        console.log(`导航图加载完成: ${navImg.width}x${navImg.height}`)
        resolve()
      }
      navImg.onerror = () => reject(new Error('导航图加载失败'))
      navImg.src = `/images/map/${MAP_VERSION}/gridnav.png`
    })

    // 加载底图 (elevation.png，带斜坡标记)
    const mapPromise = new Promise<void>((resolve) => {
      mapImage.value!.onload = () => resolve()
      mapImage.value!.onerror = () => resolve()
      mapImage.value!.src = `/images/map/${MAP_VERSION}/elevation.png`
    })

    // 加载地图实体数据（使用拆分后的文件）
    const loadEntities = async () => {
      try {
        // 并行加载各实体文件
        const [treesRes, spawnersRes, towersRes, fortsRes, fountainsRes, outpostsRes] = await Promise.all([
          fetch('/data/world/entities/trees.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/neutral-spawners.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/towers.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/forts.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/fountains.json').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/data/world/entities/outposts.json').then(r => r.json()).catch(() => ({ data: [] }))
          // TODO: 等自定义数据完成后启用
          // fetch('/data/world/custom/neutral-camp-types.json').then(r => r.json()).catch(() => ({ camps: [] }))
        ])
        
        mapEntities.value = {
          ent_dota_tree: treesRes.data,
          npc_dota_neutral_spawner: spawnersRes.data,
          npc_dota_tower: towersRes.data,
          npc_dota_fort: fortsRes.data,
          ent_dota_fountain: fountainsRes.data,
          npc_dota_watch_tower: outpostsRes.data
        }
        
        // TODO: 等自定义数据完成后启用
        // campTypes.value = campTypesRes.camps || []
        campTypes.value = []
        
        console.log('地图实体加载完成:', {
          trees: treesRes.data?.length || 0,
          spawners: spawnersRes.data?.length || 0,
          towers: towersRes.data?.length || 0,
          campTypesLoaded: campTypes.value.filter(c => c.type).length
        })
      } catch (err) {
        console.warn('地图实体加载失败:', err)
      }
    }
    
    const entityPromise = loadEntities()

    await Promise.all([navPromise, mapPromise, entityPromise])

    loading.value = false

    // 初始绘制
    setTimeout(draw, 100)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载地图数据失败'
    loading.value = false
    console.error(err)
  }
})

// 监听移速变化，自动重新计算
watch(moveSpeed, () => {
  // travelTime 会自动更新
})
</script>

<template>
  <div class="map-move-speed">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载地图数据中...</span>
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <template v-else>
      <div class="layout-container">
        <!-- 左侧控制面板 -->
        <aside class="control-panel">
          <!-- 寻路提示 -->
          <div class="panel-section">
            <h3 class="panel-title">🗺️ 寻路</h3>
            <div class="point-status">
              <div class="point-item" :class="{ active: isSettingStart }">
                <span class="point-marker start">起</span>
                <span>{{ startPoint ? `(${Math.round(startPoint.x)}, ${Math.round(startPoint.y)})` : '点击地图设置' }}</span>
              </div>
              <div class="point-item" :class="{ active: !isSettingStart && startPoint }">
                <span class="point-marker end">终</span>
                <span>{{ endPoint ? `(${Math.round(endPoint.x)}, ${Math.round(endPoint.y)})` : '点击地图设置' }}</span>
              </div>
            </div>
            <button class="reset-btn" @click="resetPoints">🔄 重置起终点</button>
          </div>

          <!-- 计算结果 -->
          <div class="panel-section" v-if="path.length > 0">
            <h3 class="panel-title">� 计算结果</h3>
            <div class="result-row">
              <span class="result-label">路径长度</span>
              <span class="result-value">{{ pathLength.toLocaleString() }} 单位</span>
            </div>
            <div class="result-row highlight">
              <span class="result-label">移动时间</span>
              <span class="result-value">{{ formattedTime }}</span>
            </div>
          </div>

          <div class="panel-section no-path" v-else-if="startPoint && endPoint">
            ⚠️ 未找到有效路径
          </div>

          <!-- 移速设置 -->
          <div class="panel-section">
            <h3 class="panel-title">🏃 移动速度</h3>
            <div class="speed-input">
              <input
                type="number"
                v-model.number="moveSpeed"
                min="100"
                max="700"
                step="10"
              >
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

          <!-- 图层控制 -->
          <div class="panel-section">
            <h3 class="panel-title">📊 图层</h3>
            <div class="layer-list">
              <label class="layer-item">
                <input type="checkbox" v-model="showNeutralCamps" @change="draw">
                <span>🐺 野怪营地</span>
              </label>
              <label class="layer-item">
                <input type="checkbox" v-model="showBuildings" @change="draw">
                <span>🏰 建筑</span>
              </label>
              <label class="layer-item">
                <input type="checkbox" v-model="showTrees" @change="draw">
                <span>🌲 树木</span>
              </label>
              <label class="layer-item debug">
                <input type="checkbox" v-model="showNavGrid" @change="draw">
                <span>📐 导航网格</span>
              </label>
            </div>
          </div>

          <!-- 调试信息 -->
          <div class="panel-section debug-info" v-if="showNavGrid">
            导航图: {{ navWidth }} x {{ navHeight }} px
          </div>
        </aside>

        <!-- 右侧地图区域 -->
        <main class="map-area">
          <canvas
            ref="canvasRef"
            :width="CANVAS_SIZE"
            :height="CANVAS_SIZE"
            @click="handleCanvasClick"
            @wheel.prevent="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @contextmenu.prevent
            class="map-canvas"
            :class="{ 'is-dragging': isMiddleButtonDragging }"
          ></canvas>
          
          <!-- 缩放控制按钮 -->
          <div class="zoom-controls" v-if="scale !== 1">
            <button class="zoom-reset-btn" @click="resetZoom" title="重置缩放">
              ↺ 重置
            </button>
          </div>
        </main>
      </div>
    </template>
  </div>
</template>

<style scoped>
.map-move-speed {
  height: 100%;
  min-height: 600px;
}

.layout-container {
  display: flex;
  gap: 1rem;
  height: 100%;
}

/* 左侧控制面板 */
.control-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.panel-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
}

.panel-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
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
  transition: opacity 0.2s;
}

.point-item.active {
  opacity: 1;
  border: 1px solid var(--primary);
}

.point-marker {
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

.point-marker.start {
  background: #2ecc71;
}

.point-marker.end {
  background: #e74c3c;
}

.reset-btn {
  width: 100%;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* 计算结果 */
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.result-row.highlight {
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(52, 152, 219, 0.2));
  border: 1px solid var(--primary);
}

.result-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.result-value {
  font-weight: 600;
  color: var(--text-primary);
}

.no-path {
  color: #f39c12;
  text-align: center;
}

/* 移速设置 */
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
  padding: 0.35rem 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.speed-presets button:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* 图层控制 */
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.layer-item:hover {
  border-color: var(--primary);
}

.layer-item:has(input:checked) {
  background: rgba(46, 204, 113, 0.15);
  border-color: #2ecc71;
}

.layer-item.debug {
  opacity: 0.7;
}

.debug-info {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
}

/* 右侧地图区域 */
.map-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 8px;
  padding: 1rem;
  min-height: 0;
  overflow: hidden;
}

.map-area {
  position: relative;
}

.map-canvas {
  width: 100%;
  height: 100%;
  max-width: calc(100vh - 200px);
  max-height: calc(100vh - 200px);
  object-fit: contain;
  border-radius: 4px;
  cursor: crosshair;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.map-canvas.is-dragging {
  cursor: grabbing;
}

/* 缩放控制 */
.zoom-controls {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
}

.zoom-reset-btn {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.zoom-reset-btn:hover {
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
