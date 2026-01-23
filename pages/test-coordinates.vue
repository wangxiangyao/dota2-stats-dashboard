<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

// ===== 常量定义 =====
const MAP_VERSION = '7.40b'

// 世界坐标范围
const WORLD_MIN = -9600
const WORLD_MAX = 9600
const WORLD_SIZE = WORLD_MAX - WORLD_MIN // 19200

// ===== 画布尺寸 =====
// 声明尺寸（模拟 InteractiveMap 的 getCanvasSize()）
const DECLARED_CANVAS_SIZE = 1000

// 模拟选项：点击计算时使用不同尺寸
const clickSizeOffset = ref(0)  // 点击计算时的尺寸偏差

// 实际显示的画布尺寸（等于 DECLARED_CANVAS_SIZE）
const canvasRef = ref<HTMLCanvasElement | null>(null)
const navImage = ref<HTMLImageElement | null>(null)
const navImageLoaded = ref(false)

// 点击点列表
interface ClickPoint {
  id: number
  clickPos: { x: number; y: number }   // 点击时计算的画布坐标
  drawPos: { x: number; y: number }    // 绘制时计算的画布坐标
  world: { x: number; y: number }
}
const clickPoints = ref<ClickPoint[]>([])
let pointIdCounter = 0

const showGrid = ref(true)

// ===== 坐标转换函数 =====

// 世界坐标 -> 画布坐标（用于绘制，使用 DECLARED_CANVAS_SIZE）
const worldToCanvas = (worldX: number, worldY: number) => {
  const x = ((worldX - WORLD_MIN) / WORLD_SIZE) * DECLARED_CANVAS_SIZE
  const y = ((WORLD_MAX - worldY) / WORLD_SIZE) * DECLARED_CANVAS_SIZE
  return { x, y }
}

// 画布坐标 -> 世界坐标（用于点击，可模拟使用不同尺寸）
const canvasToWorld = (canvasX: number, canvasY: number, useClickSize: boolean = false) => {
  // 模拟：点击时可能使用了不同的尺寸
  const size = useClickSize ? (DECLARED_CANVAS_SIZE + clickSizeOffset.value) : DECLARED_CANVAS_SIZE
  const x = (canvasX / size) * WORLD_SIZE + WORLD_MIN
  const y = WORLD_MAX - (canvasY / size) * WORLD_SIZE
  return { x, y }
}

// ===== 绘制函数 =====
const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, DECLARED_CANVAS_SIZE, DECLARED_CANVAS_SIZE)

  // 1. 绘制导航图底图
  if (navImage.value && navImageLoaded.value) {
    ctx.drawImage(navImage.value, 0, 0, DECLARED_CANVAS_SIZE, DECLARED_CANVAS_SIZE)
  } else {
    ctx.fillStyle = '#333'
    ctx.fillRect(0, 0, DECLARED_CANVAS_SIZE, DECLARED_CANVAS_SIZE)
  }

  // 2. 绘制网格线
  if (showGrid.value) {
    drawGrid(ctx)
  }

  // 3. 绘制点击点
  for (const pt of clickPoints.value) {
    // 绘制点击位置（红色 X）- 这是用户实际点击的地方
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'
    ctx.lineWidth = 2
    const cx = pt.clickPos.x
    const cy = pt.clickPos.y
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 8)
    ctx.lineTo(cx + 8, cy + 8)
    ctx.moveTo(cx + 8, cy - 8)
    ctx.lineTo(cx - 8, cy + 8)
    ctx.stroke()
    
    // 绘制"标点位置"（绿色圆）- 这是系统计算后绘制的位置
    ctx.fillStyle = 'rgba(0, 255, 100, 0.8)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pt.drawPos.x, pt.drawPos.y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // 连线显示偏移
    if (pt.clickPos.x !== pt.drawPos.x || pt.clickPos.y !== pt.drawPos.y) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pt.clickPos.x, pt.clickPos.y)
      ctx.lineTo(pt.drawPos.x, pt.drawPos.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // ID 标签
    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(pt.id), pt.drawPos.x, pt.drawPos.y)
  }

  // 4. 绘制原点
  const origin = worldToCanvas(0, 0)
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(origin.x - 30, origin.y)
  ctx.lineTo(origin.x + 30, origin.y)
  ctx.moveTo(origin.x, origin.y - 30)
  ctx.lineTo(origin.x, origin.y + 30)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'
  ctx.beginPath()
  ctx.arc(origin.x, origin.y, 4, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制网格
const drawGrid = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 1
  const step = 2000
  for (let w = WORLD_MIN; w <= WORLD_MAX; w += step) {
    const top = worldToCanvas(w, WORLD_MAX)
    const bottom = worldToCanvas(w, WORLD_MIN)
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(bottom.x, bottom.y)
    ctx.stroke()
    const left = worldToCanvas(WORLD_MIN, w)
    const right = worldToCanvas(WORLD_MAX, w)
    ctx.beginPath()
    ctx.moveTo(left.x, left.y)
    ctx.lineTo(right.x, right.y)
    ctx.stroke()
  }
}

// ===== 事件处理 =====
const handleCanvasClick = (event: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  
  // 点击位置（真实的画布坐标）
  const clickX = (event.clientX - rect.left) / rect.width * DECLARED_CANVAS_SIZE
  const clickY = (event.clientY - rect.top) / rect.height * DECLARED_CANVAS_SIZE
  
  // 转换成世界坐标（模拟使用偏差尺寸）
  const world = canvasToWorld(clickX, clickY, true)
  
  // 从世界坐标再转回画布坐标用于绘制（使用标准尺寸）
  const drawPos = worldToCanvas(world.x, world.y)

  const point: ClickPoint = {
    id: ++pointIdCounter,
    clickPos: { x: Math.round(clickX), y: Math.round(clickY) },
    drawPos: { x: Math.round(drawPos.x), y: Math.round(drawPos.y) },
    world: { x: Math.round(world.x), y: Math.round(world.y) },
  }
  clickPoints.value.push(point)

  // 日志
  console.log(`[点击 #${point.id}]`)
  console.log(`  点击画布坐标: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`)
  console.log(`  计算世界坐标: (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`)
  console.log(`  绘制画布坐标: (${drawPos.x.toFixed(1)}, ${drawPos.y.toFixed(1)})`)
  console.log(`  偏移量: (${(drawPos.x - clickX).toFixed(2)}, ${(drawPos.y - clickY).toFixed(2)})`)

  draw()
}

const clearClickPoints = () => {
  clickPoints.value = []
  pointIdCounter = 0
  draw()
}

// ===== 初始化 =====
onMounted(() => {
  navImage.value = new Image()
  navImage.value.onload = () => {
    navImageLoaded.value = true
    console.log(`导航图加载完成: ${navImage.value!.width}x${navImage.value!.height}`)
    draw()
  }
  navImage.value.onerror = () => {
    console.error('导航图加载失败')
    draw()
  }
  navImage.value.src = `/images/map/${MAP_VERSION}/gridnav.png`
})

// 监听偏移变化
watch(clickSizeOffset, () => {
  draw()
})
</script>

<template>
  <div class="test-page">
    <h1>手动标点偏移测试</h1>
    
    <div class="info-panel">
      <div class="section">
        <h3>🔬 偏移模拟</h3>
        <p>点击时尺寸偏差: <strong>{{ clickSizeOffset }}</strong></p>
        <input 
          type="range" 
          v-model.number="clickSizeOffset" 
          min="-200" 
          max="200" 
          step="10"
          class="slider"
        >
        <p class="hint">
          模拟：点击时计算坐标使用 {{ DECLARED_CANVAS_SIZE + clickSizeOffset }}px，
          绘制时使用 {{ DECLARED_CANVAS_SIZE }}px
        </p>
        <div class="presets">
          <button @click="clickSizeOffset = 0">0 (无偏移)</button>
          <button @click="clickSizeOffset = 100">+100</button>
          <button @click="clickSizeOffset = -100">-100</button>
        </div>
      </div>
      
      <div class="section">
        <h3>说明</h3>
        <p>🔴 红色 X = 实际点击位置</p>
        <p>🟢 绿色圆 = 系统绘制的标点位置</p>
        <p>🟡 黄色虚线 = 偏移量</p>
        <button @click="clearClickPoints" class="clear-btn">清除标点</button>
      </div>
    </div>

    <div class="canvas-container">
      <canvas
        ref="canvasRef"
        :width="DECLARED_CANVAS_SIZE"
        :height="DECLARED_CANVAS_SIZE"
        @click="handleCanvasClick"
      />
    </div>

    <div class="points-list" v-if="clickPoints.length > 0">
      <h3>标点记录</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>点击位置</th>
            <th>世界坐标</th>
            <th>绘制位置</th>
            <th>偏移</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pt in clickPoints" :key="pt.id">
            <td>{{ pt.id }}</td>
            <td>({{ pt.clickPos.x }}, {{ pt.clickPos.y }})</td>
            <td>({{ pt.world.x }}, {{ pt.world.y }})</td>
            <td>({{ pt.drawPos.x }}, {{ pt.drawPos.y }})</td>
            <td>({{ pt.drawPos.x - pt.clickPos.x }}, {{ pt.drawPos.y - pt.clickPos.y }})</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.test-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #e0e0e0;
  background: #1a1a2e;
  min-height: 100vh;
}

h1 {
  text-align: center;
  color: #fff;
  margin-bottom: 20px;
}

h3 {
  margin: 0 0 10px 0;
  color: #9be6f5;
}

.info-panel {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.section {
  background: rgba(255,255,255,0.05);
  padding: 15px;
  border-radius: 8px;
  flex: 1;
  min-width: 250px;
}

.section p {
  margin: 5px 0;
}

.slider {
  width: 100%;
  margin: 10px 0;
}

.presets {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.presets button {
  padding: 4px 10px;
  background: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.presets button:hover {
  background: #555;
}

.clear-btn {
  margin-top: 10px;
  padding: 6px 12px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.hint {
  color: #888;
  font-size: 12px;
  font-style: italic;
}

.canvas-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

canvas {
  border: 2px solid #444;
  cursor: crosshair;
  max-width: 100%;
  height: auto;
}

.points-list {
  background: rgba(255,255,255,0.05);
  padding: 15px;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th, td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

th {
  color: #9be6f5;
}

td {
  font-family: 'Consolas', monospace;
}
</style>
