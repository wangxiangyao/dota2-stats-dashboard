/**
 * getLightUnion - 将视野网格转换为多边形轮廓
 * 
 * 基于 dota-interactive-map 的 getLightUnion.js，用于将 VisionSimulation.lights
 * 网格数据转换为可渲染的多边形路径。
 * 
 * @license MIT
 */

import { key2pt, xy2key, xy2pt } from './vision-simulation.js'

/**
 * 将可见区域网格转换为多边形边界
 * 
 * @param {Object} grid - 网格数据（key -> point 映射）
 * @param {Object} lights - 可见区域数据（来自 VisionSimulation.lights）
 * @param {Array} lightSources - 光源列表 [{ x, y, key, area }]
 * @returns {Array[]} 多边形路径数组，每个路径是点数组 [[x1,y1], [x2,y2], ...]
 */
export function getLightUnion(grid, lights, lightSources) {
    if (!lightSources || lightSources.length === 0) return []

    // 组合所有光源的可见区域
    const union = {}
    for (const src of lightSources) {
        for (const key in lights) {
            union[key] = true
        }
    }

    // 生成边界
    const edges = []
    const edgeMap = {}

    for (const key in union) {
        const pt = key2pt(key)
        const x = pt.x
        const y = pt.y

        // 检查四周相邻点，生成边界线段
        // 上边
        if (!union[xy2key(x, y + 1)]) {
            addEdge(edges, edgeMap, x - 0.5, y + 0.5, x + 0.5, y + 0.5)
        }
        // 下边
        if (!union[xy2key(x, y - 1)]) {
            addEdge(edges, edgeMap, x + 0.5, y - 0.5, x - 0.5, y - 0.5)
        }
        // 左边
        if (!union[xy2key(x - 1, y)]) {
            addEdge(edges, edgeMap, x - 0.5, y - 0.5, x - 0.5, y + 0.5)
        }
        // 右边
        if (!union[xy2key(x + 1, y)]) {
            addEdge(edges, edgeMap, x + 0.5, y + 0.5, x + 0.5, y - 0.5)
        }
    }

    // 将边界线段连接成多边形
    const polygons = []
    const visited = new Set()

    for (const edge of edges) {
        const edgeKey = edgeToKey(edge)
        if (visited.has(edgeKey)) continue

        const polygon = []
        let current = edge
        let safety = 0
        const maxIterations = edges.length * 2

        while (current && safety < maxIterations) {
            const currentKey = edgeToKey(current)
            if (visited.has(currentKey)) break

            visited.add(currentKey)
            polygon.push([current[0], current[1]])

            // 查找下一条边
            const endKey = `${current[2]},${current[3]}`
            const nextEdges = edgeMap[endKey]

            if (!nextEdges) break

            let found = false
            for (const next of nextEdges) {
                const nextKey = edgeToKey(next)
                if (!visited.has(nextKey)) {
                    current = next
                    found = true
                    break
                }
            }

            if (!found) break
            safety++
        }

        if (polygon.length >= 3) {
            // 闭合多边形
            polygon.push(polygon[0])
            polygons.push(polygon)
        }
    }

    return polygons
}

function addEdge(edges, edgeMap, x1, y1, x2, y2) {
    const edge = [x1, y1, x2, y2]
    edges.push(edge)

    const startKey = `${x1},${y1}`
    if (!edgeMap[startKey]) edgeMap[startKey] = []
    edgeMap[startKey].push(edge)
}

function edgeToKey(edge) {
    return `${edge[0]},${edge[1]}-${edge[2]},${edge[3]}`
}

/**
 * 简化版：直接将可见区域转换为可渲染的世界坐标多边形
 * 
 * @param {VisionSimulation} vs - VisionSimulation 实例
 * @returns {Array[]} 多边形路径数组（世界坐标）
 */
export function lightsToWorldPolygons(vs) {
    const lights = vs.lights
    if (Object.keys(lights).length === 0) return []

    const polygons = getLightUnion(vs.grid, lights, [{ x: 0, y: 0, area: 1 }])

    // 转换为世界坐标
    return polygons.map(polygon => {
        return polygon.map(([gX, gY]) => {
            const world = vs.GridXYtoWorldXY(gX, gY)
            return [world.x, world.y]
        })
    })
}

/**
 * 将可见区域转换为 Canvas 绘制路径
 * 
 * @param {VisionSimulation} vs - VisionSimulation 实例
 * @param {Function} worldToCanvas - 世界坐标转 Canvas 坐标的函数 (wX, wY) => {x, y}
 * @returns {Path2D} Canvas Path2D 对象
 */
export function lightsToCanvasPath(vs, worldToCanvas) {
    const polygons = lightsToWorldPolygons(vs)
    const path = new Path2D()

    for (const polygon of polygons) {
        if (polygon.length < 3) continue

        const first = worldToCanvas(polygon[0][0], polygon[0][1])
        path.moveTo(first.x, first.y)

        for (let i = 1; i < polygon.length; i++) {
            const pt = worldToCanvas(polygon[i][0], polygon[i][1])
            path.lineTo(pt.x, pt.y)
        }

        path.closePath()
    }

    return path
}

export default { getLightUnion, lightsToWorldPolygons, lightsToCanvasPath }
