/**
 * VisionSimulation - Dota 2 视野模拟模块
 * 
 * 基于 dota-vision-simulation 库重构，使用 Canvas API 替代 Jimp。
 * 支持高地遮挡、树木遮挡、日夜视野差异等完整的 Dota 2 视野机制。
 * 
 * 使用方法:
 *   import { VisionSimulation, key2pt, xy2key, xy2pt } from '@/utils/vision/vision-simulation'
 *   
 *   const vs = new VisionSimulation(worlddata)
 *   await vs.initialize('/images/map/7.40b/map_data.png')
 *   vs.updateVisibility(gX, gY, radius)
 *   // vs.lights 包含可见区域的 key -> brightness 映射
 * 
 * @license MIT
 */

import { PreciseShadowcasting } from './rot-fov.js'

// ============ 工具函数 ============

const key2ptCache = {}

/**
 * 将 "x,y" 格式的 key 转换为点对象
 */
export function key2pt(key) {
    if (key in key2ptCache) return key2ptCache[key]
    const p = key.split(',').map(c => parseInt(c))
    const pt = { x: p[0], y: p[1], key }
    key2ptCache[key] = pt
    return pt
}

/**
 * 将 x, y 坐标转换为 "x,y" 格式的 key
 */
export function xy2key(x, y) {
    return x + ',' + y
}

/**
 * 将 x, y 坐标转换为点对象
 */
export function xy2pt(x, y) {
    return { x, y, key: x + ',' + y }
}

/**
 * 将点对象转换为 "x,y" 格式的 key
 */
export function pt2key(pt) {
    return pt.x + ',' + pt.y
}

// ============ 内部辅助函数 ============

/**
 * 生成高度墙壁数据
 */
function generateElevationWalls(data, elevation) {
    const walls = {}

    for (const key in data) {
        const pt = data[key]
        if (pt.z > elevation) {
            adjLoop:
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i !== 0 || j !== 0) {
                        const k = (pt.x + i) + ',' + (pt.y + j)
                        if (data[k] && data[k].z <= elevation) {
                            walls[pt.key] = pt
                            break adjLoop
                        }
                    }
                }
            }
        }
    }

    return walls
}

/**
 * 树木阻挡半径
 * 原版 dota-vision-simulation 使用 64 单位网格，阻挡半径为 Math.SQRT2 ≈ 1.414
 * 我们使用 8 单位网格，需要放大 8 倍以保持视觉效果一致
 * 实际游戏中树木半径约为 64-128 单位，对应 8-16 个 8 单位格子
 */
const TREE_BLOCKING_RADIUS = Math.SQRT2 * 8  // ~11.3 个网格单位

/**
 * 设置树木墙壁
 * 树木高度 = 地面高度 + 1（来自 Python: z = int(pt['z'] / 128) + 1）
 * 阻挡条件：树木高度 >= 眼位高度
 */
function setTreeWalls(obj, elevation, tree, treeElevations, treeState, treeBlocks) {
    for (const i in tree) {
        // 树木阻挡条件：elevation <= treeElevations[i]
        // 即：眼位高度 <= 树木高度 时阻挡
        if (treeState[i] && elevation <= treeElevations[i]) {
            treeBlocks[i].forEach(pt => {
                const k = pt.x + ',' + pt.y
                obj[k] = (obj[k] || []).concat([['tree', tree[i].x, tree[i].y, TREE_BLOCKING_RADIUS]])
            })
        }
    }
}

// ============ 图像处理器 ============

/**
 * 使用 Canvas API 加载和处理图像
 */
class CanvasImageHandler {
    constructor(imagePath) {
        this.imagePath = imagePath
        this.imageData = null
        this.width = 0
        this.height = 0
    }

    async load() {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'

            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height

                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                this.imageData = ctx.getImageData(0, 0, img.width, img.height)
                this.width = img.width
                this.height = img.height

                resolve()
            }

            img.onerror = (err) => {
                reject(new Error(`Failed to load image: ${this.imagePath}`))
            }

            img.src = this.imagePath
        })
    }

    /**
     * 扫描图像区域并调用像素处理器
     */
    scan(offsetX, width, height, pixelHandler, grid) {
        const data = this.imageData.data
        const imgWidth = this.width

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcX = offsetX + x
                const idx = (y * imgWidth + srcX) * 4

                const r = data[idx]
                const g = data[idx + 1]
                const b = data[idx + 2]

                pixelHandler(x, y, [r, g, b], grid)
            }
        }
    }
}

// ============ 主视野模拟类 ============

/**
 * Dota 2 视野模拟器
 */
export class VisionSimulation {
    /**
     * @param {Object} worlddata - 世界数据 { worldMinX, worldMinY, worldMaxX, worldMaxY }
     * @param {Object} opts - 配置选项
     * @param {number} opts.radius - 默认视野半径（网格单位）
     * @param {number} opts.gridCellSize - 网格单元大小（默认 64）
     */
    constructor(worlddata, opts = {}) {
        this.opts = opts
        this.gridCellSize = opts.gridCellSize || 64
        this.radius = opts.radius || Math.floor(1600 / this.gridCellSize)

        this.worldMinX = worlddata.worldMinX
        this.worldMinY = worlddata.worldMinY
        this.worldMaxX = worlddata.worldMaxX
        this.worldMaxY = worlddata.worldMaxY
        this.worldWidth = this.worldMaxX - this.worldMinX
        this.worldHeight = this.worldMaxY - this.worldMinY
        this.gridWidth = Math.floor(this.worldWidth / this.gridCellSize) + 1
        this.gridHeight = Math.floor(this.worldHeight / this.gridCellSize) + 1

        this.ready = false
        this.elevation = 0

        // 初始化 FOV 算法
        // 注意：elevWall（高度墙）不在这里检查！
        // 高度差只影响"那个点是否可见"，不影响"光线是否能穿过"
        // 真正阻挡光线传播的只有：FOW遮挡物、树木
        this._lightBlockCounts = { elevWall: 0, fowNode: 0, treeWall: 0, pass: 0 }
        this._blockedSamples = []  // 采样记录被阻挡的点
        this.lightPassesCallback = (x, y) => {
            const key = x + ',' + y
            const treeWalls = this.treeWalls[this.elevation]

            // 检查是否被 FOW 遮挡物阻挡（这些是真正的视野阻挡物）
            if (key in this.entFowBlockerNode) {
                this._lightBlockCounts.fowNode++
                if (this._blockedSamples.length < 20) {
                    this._blockedSamples.push({ x, y, reason: 'fowNode' })
                }
                return false
            }
            // 检查是否被树木阻挡（树木阻挡光线传播）
            if (treeWalls && treeWalls[key] && treeWalls[key].length > 0) {
                this._lightBlockCounts.treeWall++
                if (this._blockedSamples.length < 20) {
                    this._blockedSamples.push({ x, y, reason: 'treeWall', treeCount: treeWalls[key].length })
                }
                return false
            }

            this._lightBlockCounts.pass++
            return true
        }

        this.fov = new PreciseShadowcasting(this.lightPassesCallback, { topology: 8 })
    }

    /**
     * 初始化视野模拟器，加载预计算的 JSON 数据
     * @param {string} visionDataPath - vision_data.json 的路径
     */
    async initialize(visionDataPath) {
        this.ready = false
        this.grid = []
        this.gridnav = {}
        this.entFowBlockerNode = {}
        this.toolsNoWards = {}
        this.elevationValues = []
        this.elevationGrid = {}
        this.elevationWalls = {}
        this.treeWalls = {}
        this.tree = {}           // 树木中心 key -> 点对象
        this.treeBlocks = {}     // 树木中心 -> 角点数组
        this.treeRelations = {}  // 角点 key -> 树木中心数组
        this.treeElevations = {}
        this.treeState = {}      // 树木状态（true = 存在）
        this.walls = {}
        this.lights = {}
        this.area = 0

        console.time('VisionSimulation: 加载 JSON')
        const response = await fetch(visionDataPath)
        const data = await response.json()
        console.timeEnd('VisionSimulation: 加载 JSON')

        console.time('VisionSimulation: 解析数据')

        // 直接使用 64 单位网格数据（不再展开到更细的网格）
        this.elevationValues = data.elevationValues

        // 高度数据：直接使用，key 已经是 "x,y" 格式
        for (const key in data.elevation) {
            const [gX, gY] = key.split(',').map(Number)
            const z = data.elevation[key]
            this.elevationGrid[key] = { x: gX, y: gY, z, key }
        }

        // 导航数据：直接转换
        for (const pt of data.gridnav) {
            const [gX, gY] = pt
            this.gridnav[xy2key(gX, gY)] = true
        }

        // FOW 遮挡物
        for (const key of data.entFowBlockerNode || []) {
            this.entFowBlockerNode[key] = true
        }

        // 禁眼区
        for (const key of data.toolsNoWards || []) {
            this.toolsNoWards[key] = true
        }

        // 树木数据：JSON 中树木坐标是 8 单位网格，需要转换到 64 单位网格
        // 转换比例：8 -> 64 = 除以 8
        const scale = 64 / 8  // JSON 使用 8 单位网格，运行时使用 64 单位
        const treeBlockRadius = 1  // 64 单位网格中树木阻挡半径为 1 格
        for (const treeData of data.trees) {
            const [cx8, cy8, z] = treeData
            // 转换到 64 单位网格坐标
            const cx = Math.floor(cx8 / scale)
            const cy = Math.floor(cy8 / scale)
            const key = xy2key(cx, cy)
            const pt = xy2pt(cx, cy)

            this.tree[key] = pt
            this.treeElevations[key] = z
            this.treeState[key] = true
            this.treeBlocks[key] = []

            // 计算阻挡的网格点（3x3 区域）
            for (let dx = -treeBlockRadius; dx <= treeBlockRadius; dx++) {
                for (let dy = -treeBlockRadius; dy <= treeBlockRadius; dy++) {
                    const gX = cx + dx
                    const gY = cy + dy
                    if (gX >= 0 && gX < this.gridWidth && gY >= 0 && gY < this.gridHeight) {
                        const blockPt = xy2pt(gX, gY)
                        this.treeBlocks[key].push(blockPt)
                        this.treeRelations[blockPt.key] =
                            (this.treeRelations[blockPt.key] || []).concat(pt)
                    }
                }
            }
        }

        console.timeEnd('VisionSimulation: 解析数据')

        console.time('VisionSimulation: 生成墙壁')

        this.elevationValues.forEach(elevation => {
            this.treeWalls[elevation] = {}
            setTreeWalls(
                this.treeWalls[elevation],
                elevation,
                this.tree,
                this.treeElevations,
                this.treeState,
                this.treeBlocks
            )
        })

        // elevationWalls 使用懒加载：在 updateVisibility 时首次访问某高度才生成
        // 这样避免初始化时遍历 11个高度 × 576万点

        console.timeEnd('VisionSimulation: 生成墙壁')

        // 注意：移除了 grid 数组的 576 万次初始化循环
        // key2ptCache 由 xy2pt() 函数按需填充

        this.ready = true
        console.log(`VisionSimulation: 初始化完成 (${this.gridWidth}x${this.gridHeight} 网格, ${Object.keys(this.tree).length} 棵树, ${Object.keys(this.treeRelations).length} 个阻挡点)`)
    }

    _parseImage(imageHandler, offset, pixelHandler) {
        const grid = {}
        imageHandler.scan(offset, this.gridWidth, this.gridHeight, pixelHandler, grid)
        return grid
    }

    _blackPixelHandler(x, y, p, grid) {
        const pt = this.ImageXYtoGridXY(x, y)
        if (p[0] === 0) {
            grid[pt.x + ',' + pt.y] = pt
        }
    }

    _elevationPixelHandler(x, y, p, grid) {
        const pt = this.ImageXYtoGridXY(x, y)
        pt.z = p[0]
        grid[pt.x + ',' + pt.y] = pt
        if (!this.elevationValues.includes(p[0])) {
            this.elevationValues.push(p[0])
        }
    }

    /**
     * 阶段1：收集树木像素（不立即创建树对象）
     */
    _treePixelCollector(x, y, p, grid) {
        // 树木标记：R 通道有值，G 和 B 为 0
        if (p[1] === 0 && p[2] === 0 && p[0] > 0) {
            const pt = this.ImageXYtoGridXY(x, y)
            this._rawTreePixels.push({
                x: pt.x,
                y: pt.y,
                z: p[0] + 40  // 树木高度
            })
        }
    }

    /**
     * 阶段2：聚类树木像素，相邻像素合并为一棵树
     * 使用 Union-Find 算法高效聚类
     */
    _clusterTreePixels() {
        const pixels = this._rawTreePixels
        if (pixels.length === 0) return

        // 建立像素索引（用于快速查找相邻像素）
        const pixelMap = new Map()  // key -> index
        pixels.forEach((p, i) => pixelMap.set(`${p.x},${p.y}`, i))

        // Union-Find 数据结构
        const parent = pixels.map((_, i) => i)
        const rank = pixels.map(() => 0)

        function find(x) {
            if (parent[x] !== x) parent[x] = find(parent[x])
            return parent[x]
        }

        function union(x, y) {
            const px = find(x), py = find(y)
            if (px === py) return
            if (rank[px] < rank[py]) parent[px] = py
            else if (rank[px] > rank[py]) parent[py] = px
            else { parent[py] = px; rank[px]++ }
        }

        // 合并相邻像素（8-邻域）
        const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
        pixels.forEach((p, i) => {
            dirs.forEach(([dx, dy]) => {
                const nk = `${p.x + dx},${p.y + dy}`
                if (pixelMap.has(nk)) union(i, pixelMap.get(nk))
            })
        })

        // 按簇分组
        const clusters = new Map()  // rootIndex -> [pixelIndices]
        pixels.forEach((_, i) => {
            const root = find(i)
            if (!clusters.has(root)) clusters.set(root, [])
            clusters.get(root).push(i)
        })

        // 每个簇创建一棵树
        clusters.forEach((indices, _) => {
            const clusterPixels = indices.map(i => pixels[i])

            // 计算簇中心作为树的原点
            let sumX = 0, sumY = 0, maxZ = 0
            clusterPixels.forEach(p => {
                sumX += p.x
                sumY += p.y
                maxZ = Math.max(maxZ, p.z)
            })
            const centerX = sumX / clusterPixels.length
            const centerY = sumY / clusterPixels.length

            const treeOrigin = xy2pt(centerX, centerY)
            const kC = treeOrigin.key

            this.tree[kC] = treeOrigin
            this.treeElevations[kC] = maxZ
            this.treeBlocks[kC] = []
            this.treeState[kC] = true

            // 所有簇内像素都作为树木阻挡区域
            clusterPixels.forEach(p => {
                const blockPt = xy2pt(p.x, p.y)
                this.treeBlocks[kC].push(blockPt)
                this.treeRelations[blockPt.key] =
                    (this.treeRelations[blockPt.key] || []).concat(treeOrigin)
            })
        })

        console.log(`VisionSimulation: 聚类完成 (${pixels.length} 像素 -> ${clusters.size} 棵树)`)
    }

    /**
     * 更新指定位置的可见性
     * @param {number} gX - 网格 X 坐标
     * @param {number} gY - 网格 Y 坐标
     * @param {number} radius - 视野半径（可选）
     */
    updateVisibility(gX, gY, radius) {
        const key = xy2key(gX, gY)
        radius = radius || this.radius
        console.log(`updateVisibility: gX=${gX}, gY=${gY}, radius=${radius}`)

        this.elevation = this.elevationGrid[key]?.z || 0
        console.log(`眼位高度: ${this.elevation}`)
        this.walls = this.treeWalls[this.elevation] || {}


        if (!this.elevationWalls[this.elevation]) {
            this.elevationWalls[this.elevation] = generateElevationWalls(this.elevationGrid, this.elevation)
        }

        // 记录被阴影遮挡的同高度点
        this._shadowedSamples = []

        this.fov.walls = this.walls
        this.lights = {}

        this.area = this.fov.compute(gX, gY, radius, (x2, y2, r, vis) => {
            const key = xy2key(x2, y2)
            // 调试：检查多少点被跳过
            if (!this._debugSkipCount) this._debugSkipCount = 0
            if (!this._debugHitCount) this._debugHitCount = 0

            // 注意：即使没有 elevationGrid 数据，也不跳过
            // 因为这些点可能只是数据缺失，但仍然是有效的可视区域
            this._debugHitCount++

            // 检查树木遮挡
            // 在 Dota 中，树木始终阻挡视野（无论高度差）
            const treePts = this.treeRelations[key]
            let treeBlocking = false

            if (!this._treeBlockDebug) this._treeBlockDebug = { checked: 0, blocked: 0 }

            if (treePts) {
                for (const treePt of treePts) {
                    this._treeBlockDebug.checked++
                    // 只要树木存在就阻挡
                    if (this.treeState[treePt.key]) {
                        treeBlocking = true
                        this._treeBlockDebug.blocked++
                        break
                    }
                }
            }

            // 采样记录被阴影遮挡的同高度点（vis=false 且高度相同）
            if (!vis && this._shadowedSamples.length < 20) {
                const ptZ = this.elevationGrid[key]?.z
                if (ptZ === this.elevation || ptZ === undefined) {
                    this._shadowedSamples.push({
                        x: x2, y: y2,
                        pointElevation: ptZ,
                        eyeElevation: this.elevation,
                        distance: r,
                        reason: 'shadowcast'
                    })
                }
            }

            // 检查高度阻挡：高于眼位的点不可见（但光线可以穿过）
            const ptZ = this.elevationGrid[key]?.z
            const elevBlocking = (ptZ !== undefined && ptZ > this.elevation)

            // vis 可能是 true（布尔）或 1（数字），用 !!vis 统一转换
            // 条件：1. FOV算法认为可见  2. 不被FOW阻挡  3. 不被树木阻挡  4. 不高于眼位
            if (vis && !this.entFowBlockerNode[key] && !treeBlocking && !elevBlocking) {
                this.lights[key] = 255
            }
        })

        this.lightArea = Object.keys(this.lights).length
        console.log(`updateVisibility: skip=${this._debugSkipCount}, hit=${this._debugHitCount}, lights=${this.lightArea}`)
        console.log(`lightPassesCallback: elevWall=${this._lightBlockCounts.elevWall}, fowNode=${this._lightBlockCounts.fowNode}, treeWall=${this._lightBlockCounts.treeWall}, pass=${this._lightBlockCounts.pass}`)
        console.log(`treeBlocking: checked=${this._treeBlockDebug?.checked || 0}, blocked=${this._treeBlockDebug?.blocked || 0}`)
        if (this._blockedSamples.length > 0) {
            console.log('被阻挡点采样 (前20个):', JSON.stringify(this._blockedSamples, null, 2))
        }
        if (this._shadowedSamples.length > 0) {
            console.log('被阴影遮挡的同高度点 (前20个):', JSON.stringify(this._shadowedSamples, null, 2))
        }
        this._debugSkipCount = 0
        this._debugHitCount = 0
        this._lightBlockCounts = { elevWall: 0, fowNode: 0, treeWall: 0, pass: 0 }
        this._treeBlockDebug = { checked: 0, blocked: 0 }
        this._blockedSamples = []
        this._shadowedSamples = []
    }

    /**
     * 检查坐标是否有效（可放置眼位等）
     */
    isValidXY(x, y, bCheckGridnav = false, bCheckToolsNoWards = false, bCheckTreeState = false) {
        if (!this.ready) return false

        const key = xy2key(x, y)
        let treeBlocking = false

        if (bCheckTreeState) {
            const treePts = this.treeRelations[key]
            if (treePts) {
                for (const treePt of treePts) {
                    treeBlocking = this.treeState[treePt.key]
                    if (treeBlocking) break
                }
            }
        }

        return x >= 0 && x < this.gridWidth &&
            y >= 0 && y < this.gridHeight &&
            (!bCheckGridnav || !this.gridnav[key]) &&
            (!bCheckToolsNoWards || !this.toolsNoWards[key]) &&
            (!bCheckTreeState || !treeBlocking)
    }

    /**
     * 切换树木状态（砍树/恢复树木）
     */
    toggleTree(x, y) {
        const key = xy2key(x, y)
        const isTree = !!this.treeRelations[key]

        if (isTree) {
            const treePts = this.treeRelations[key]

            for (const pt of treePts) {
                this.treeState[pt.key] = !this.treeState[pt.key]

                this.elevationValues.forEach(elevation => {
                    if (elevation < this.treeElevations[pt.key]) {
                        this.treeBlocks[pt.key].forEach(ptB => {
                            for (let j = this.treeWalls[elevation][ptB.key]?.length - 1; j >= 0; j--) {
                                if (pt.x === this.treeWalls[elevation][ptB.key][j][1] &&
                                    pt.y === this.treeWalls[elevation][ptB.key][j][2]) {
                                    this.treeWalls[elevation][ptB.key].splice(j, 1)
                                }
                            }
                        })

                        if (this.treeState[pt.key]) {
                            this.treeBlocks[pt.key].forEach(ptB => {
                                this.treeWalls[elevation][ptB.key] =
                                    (this.treeWalls[elevation][ptB.key] || []).concat([['tree', pt.x, pt.y, Math.SQRT2]])
                            })
                        }
                    }
                })
            }
        }

        return isTree
    }

    /**
     * 设置默认视野半径
     */
    setRadius(r) {
        this.radius = r
    }

    // ============ 坐标转换函数 ============

    /**
     * 世界坐标 -> 网格坐标
     */
    WorldXYtoGridXY(wX, wY, bNoRound = false) {
        let x = (wX - this.worldMinX) / this.gridCellSize
        let y = (wY - this.worldMinY) / this.gridCellSize

        if (!bNoRound) {
            x = Math.round(x)
            y = Math.round(y)
        }

        return { x, y, key: x + ',' + y }
    }

    /**
     * 网格坐标 -> 世界坐标
     */
    GridXYtoWorldXY(gX, gY) {
        return {
            x: gX * this.gridCellSize + this.worldMinX,
            y: gY * this.gridCellSize + this.worldMinY
        }
    }

    /**
     * 网格坐标 -> 图像坐标
     */
    GridXYtoImageXY(gX, gY) {
        return { x: gX, y: this.gridHeight - gY - 1 }
    }

    /**
     * 图像坐标 -> 网格坐标
     */
    ImageXYtoGridXY(x, y) {
        const gY = this.gridHeight - y - 1
        return { x, y: gY, key: x + ',' + gY }
    }

    /**
     * 世界坐标 -> 图像坐标
     */
    WorldXYtoImageXY(wX, wY) {
        const pt = this.WorldXYtoGridXY(wX, wY)
        return this.GridXYtoImageXY(pt.x, pt.y)
    }
}

export default VisionSimulation
