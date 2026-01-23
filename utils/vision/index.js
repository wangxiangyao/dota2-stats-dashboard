/**
 * Vision Utils - 视野模块导出
 * 
 * 这个模块提供 Dota 2 视野模拟的核心功能：
 * - VisionSimulation: 主视野模拟器
 * - PreciseShadowcasting: FOV 算法
 * - getLightUnion: 视野多边形生成
 * 
 * 使用示例:
 * ```js
 * import { VisionSimulation, lightsToCanvasPath } from '@/utils/vision'
 * 
 * const worlddata = {
 *   worldMinX: -9600,
 *   worldMinY: -9600,
 *   worldMaxX: 9600,
 *   worldMaxY: 9600
 * }
 * 
 * const vs = new VisionSimulation(worlddata)
 * await vs.initialize('/images/map/7.40b/map_data.png')
 * 
 * // 更新视野
 * const gridPt = vs.WorldXYtoGridXY(wardWorldX, wardWorldY)
 * vs.updateVisibility(gridPt.x, gridPt.y, visionRadius)
 * 
 * // 渲染到 Canvas
 * const path = lightsToCanvasPath(vs, (wX, wY) => worldToCanvas(wX, wY))
 * ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
 * ctx.fill(path)
 * ```
 */

export { PreciseShadowcasting, DIRS } from './rot-fov.js'

export {
    VisionSimulation,
    key2pt,
    xy2key,
    xy2pt,
    pt2key
} from './vision-simulation.js'

export {
    getLightUnion,
    lightsToWorldPolygons,
    lightsToCanvasPath
} from './get-light-union.js'
