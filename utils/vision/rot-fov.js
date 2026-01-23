/**
 * ROT.js Field of View (FOV) - Precise Shadowcasting Algorithm
 * 
 * 基于 rot.js v0.6 的精确阴影投射算法，用于计算视野范围。
 * 已转换为 ES Module 格式，移除了不需要的 polyfill。
 * 
 * @license BSD-3-Clause
 * @see https://github.com/ondras/rot.js
 */

/**
 * 网格缩放因子
 * 原版使用 64 单位网格，现在也使用 64 单位网格，所以缩放因子为 1
 */
const GRID_SCALE = 1

/** 方向常量 */
export const DIRS = {
    '4': [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0]
    ],
    '8': [
        [0, -1],
        [1, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1]
    ],
    '6': [
        [-1, -1],
        [1, -1],
        [2, 0],
        [1, 1],
        [-1, 1],
        [-2, 0]
    ]
}

// ============ 辅助函数 ============

function isBefore(A1, A2) {
    if (A1 > 0 && A2 < 0) return true   // A1 在下半部分，A2 在上半部分
    if (A2 > 0 && A1 < 0) return false  // A1 在上半部分，A2 在下半部分
    return A1 < A2
}

function isAfter(A1, A2) {
    return !isBefore(A1, A2)
}

function isBetween(b, A1, A2) {
    if (A1 < A2) {
        return (A1 <= b) && (b <= A2)
    } else {
        return (A1 <= b && b <= Math.PI) || (-Math.PI <= b && b <= A2)
    }
}

function normalize(x) {
    if (x > Math.PI) return -(2 * Math.PI - x)
    if (x < -Math.PI) return 2 * Math.PI + x
    return x
}

function diff(A1, A2) {
    if (A1 > 0 && A2 < 0) {
        return Math.abs((Math.PI - A1) - (-Math.PI - A2))
    }
    if (A2 > 0 && A1 < 0) {
        return Math.abs(-A1 + A2)
    }
    if (A1 <= 0 && A2 <= 0) {
        if (isAfter(A1, A2)) {
            return -A1 + Math.PI - (-Math.PI - A2)
        }
        return Math.abs(A2 - A1)
    }
    if (isAfter(A1, A2)) {
        return Math.PI + (Math.PI - A1) + A2
    }
    return Math.abs(A2 - A1)
}

function diffSum(shadows) {
    let sum = 0
    for (const shadow of shadows) {
        sum += diff(shadow[0], shadow[1])
    }
    return sum
}

// ============ FOV 基类 ============

/**
 * 抽象 FOV 算法基类
 */
class FOV {
    constructor(lightPassesCallback, options = {}) {
        this._lightPasses = lightPassesCallback
        this._options = {
            topology: 8,
            ...options
        }
    }

    /**
     * 计算 360 度视野
     * @param {number} x 中心 X
     * @param {number} y 中心 Y
     * @param {number} R 最大视野半径
     * @param {function} callback 回调函数 (x, y, r, visibility)
     */
    compute(x, y, R, callback) { }

    /**
     * 获取同心环上的所有邻居
     */
    _getCircle(cx, cy, r) {
        const result = []
        let dirs, countFactor, startOffset

        switch (this._options.topology) {
            case 4:
                countFactor = 1
                startOffset = [0, 1]
                dirs = [DIRS['8'][7], DIRS['8'][1], DIRS['8'][3], DIRS['8'][5]]
                break
            case 6:
                dirs = DIRS['6']
                countFactor = 1
                startOffset = [-1, 1]
                break
            case 8:
            default:
                dirs = DIRS['4']
                countFactor = 2
                startOffset = [-1, 1]
                break
        }

        let x = cx + startOffset[0] * r
        let y = cy + startOffset[1] * r

        for (let i = 0; i < dirs.length; i++) {
            for (let j = 0; j < r * countFactor; j++) {
                result.push([x, y])
                x += dirs[i][0]
                y += dirs[i][1]
            }
        }

        return result
    }
}

// ============ 精确阴影投射算法 ============

/**
 * 精确阴影投射算法
 * 这是 Dota 2 视野系统使用的核心算法
 */
export class PreciseShadowcasting extends FOV {
    constructor(lightPassesCallback, options = {}) {
        super(lightPassesCallback, options)
        this.walls = {}
        this.done = false
    }

    compute(x, y, R, callback) {
        // 中心点和周围 3x3 区域始终可见
        callback(x, y, 0, 1)

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    callback(x + dx, y + dy, 0, 1)
                }
            }
        }

        // 额外的 5x5 可见区域（半径 2 内）
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                if (Math.abs(dx) === 2 || Math.abs(dy) === 2) {
                    if (Math.abs(dx) + Math.abs(dy) <= 3) {
                        callback(x + dx, y + dy, 0, 1)
                    }
                }
            }
        }

        // 如果站在不透光的位置，直接返回
        if (!this._lightPasses(x, y)) return 0

        const SHADOWS = []
        let trees = {}
        let totalNeighborCount = 1
        this.done = false

        // 从中心向外分析同心环
        for (let r = 1; r <= R; r++) {
            const neighbors = this._getCircle(x, y, r)
            const neighborCount = neighbors.length
            totalNeighborCount += neighborCount
            trees = {}

            for (let i = 0; i < neighborCount; i++) {
                const cx = neighbors[i][0]
                const cy = neighbors[i][1]
                const key = cx + ',' + cy

                // 检查是否在圆形半径内
                if ((x - cx) * (x - cx) + (y - cy) * (y - cy) >= R * R) {
                    totalNeighborCount--
                    continue
                }

                const obstacleTypes = this.walls[key]

                if (obstacleTypes && obstacleTypes.length) {
                    let skipVisibility = false
                    let visibility

                    for (let j = 0; j < obstacleTypes.length; j++) {
                        const obstacleType = obstacleTypes[j]
                        const cx2 = obstacleType[1]
                        const cy2 = obstacleType[2]
                        const radius = obstacleType[3]

                        let dx = cx2 - x
                        let dy = cy2 - y
                        let dd = Math.sqrt(dx * dx + dy * dy)

                        if (dd > 0.5) {
                            let a = Math.asin(radius / dd)
                            let b = Math.atan2(dy, dx)
                            let A1 = normalize(b - a)
                            let A2 = normalize(b + a)

                            const dx1 = cx - x
                            const dy1 = cy - y
                            const dd1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)

                            if (dd1 < dd) {
                                trees[obstacleType[1] + ',' + obstacleType[2]] = [obstacleType[1], obstacleType[2]]
                            }

                            dx = cx - x
                            dy = cy - y
                            dd = Math.sqrt(dx * dx + dy * dy)
                            a = Math.asin(radius / dd)
                            b = Math.atan2(dy, dx)
                            A1 = normalize(b - a)
                            A2 = normalize(b + a)
                            visibility = this._checkVisibility(b, A1, A2, false, SHADOWS)
                            if (!visibility) skipVisibility = true
                        }
                    }

                    if (visibility && !skipVisibility) {
                        callback(cx, cy, r, visibility)
                    }
                } else {
                    const cx2 = cx
                    const cy2 = cy
                    const radius = (Math.SQRT2 / 2) * GRID_SCALE

                    const dx = cx2 - x
                    const dy = cy2 - y
                    const dd = Math.sqrt(dx * dx + dy * dy)

                    if (dd > 0.5) {
                        const a = Math.asin(radius / dd)
                        const b = Math.atan2(dy, dx)
                        const A1 = normalize(b - a)
                        const A2 = normalize(b + a)
                        const blocks = !this._lightPasses(cx, cy)

                        const visibility = this._checkVisibility(b, A1, A2, blocks, SHADOWS)
                        if (visibility) callback(cx, cy, r, visibility)
                        if (this.done) return totalNeighborCount
                    }
                }
            }

            // 应用树木阻挡
            for (const k in trees) {
                const cx2 = trees[k][0]
                const cy2 = trees[k][1]
                const dx = cx2 - x
                const dy = cy2 - y
                const dd = Math.sqrt(dx * dx + dy * dy)
                const radius = (Math.SQRT2 - 0.01) * GRID_SCALE

                if (dd > 0.5) {
                    const a = Math.asin(radius / dd)
                    const b = Math.atan2(dy, dx)
                    const A1 = normalize(b - a)
                    const A2 = normalize(b + a)
                    this._checkVisibility(b, A1, A2, true, SHADOWS)
                    if (this.done) return totalNeighborCount
                }
            }
        }

        return totalNeighborCount
    }

    _checkVisibility(b, A1, A2, blocks, SHADOWS) {
        let visible = !blocks

        for (let i = 0; i < SHADOWS.length; i++) {
            const old = SHADOWS[i]
            if (isBetween(b, old[0], old[1])) {
                if (blocks) {
                    visible = false
                } else {
                    return false
                }
            }
        }

        if (blocks) {
            if (A1 < 0 && A2 >= 0) {
                this._mergeShadows(b, 0, A2, blocks, SHADOWS)
                this.done = false
                this._mergeShadows(b, A1, 0, blocks, SHADOWS)
            } else {
                this._mergeShadows(b, A1, A2, blocks, SHADOWS)
            }

            if (SHADOWS.length === 1 &&
                (!isBetween(A1, SHADOWS[0][0], SHADOWS[0][1]) ||
                    !isBetween(A2, SHADOWS[0][0], SHADOWS[0][1])) &&
                A1 !== SHADOWS[0][0] && A2 !== SHADOWS[0][1]) {
                this.done = true
            }
        }

        return visible
    }

    _mergeShadows(b, A1, A2, blocks, SHADOWS) {
        let index1 = 0
        let edge1 = false
        let firstIndex = 0

        while (index1 < SHADOWS.length) {
            const old = SHADOWS[index1]
            firstIndex = index1

            if (isBetween(A1, old[0], old[1])) {
                edge1 = true
                break
            }
            if (index1 > 0 && isBetween(A1, SHADOWS[index1 - 1][1], old[0])) {
                edge1 = false
                break
            }
            if (!isBefore(A1, old[1])) {
                index1++
                firstIndex = index1
                continue
            }
            if (isBefore(A1, old[0])) {
                break
            }
            index1++
        }

        let index2 = SHADOWS.length - 1
        let edge2 = false
        let secondIndex = 0

        while (index2 >= 0) {
            const old = SHADOWS[index2]
            secondIndex = index2

            if (isBetween(A2, old[0], old[1])) {
                edge2 = true
                break
            }
            if (isBefore(A2, old[0])) {
                index2--
                secondIndex = index2
                continue
            }
            if (!isBefore(A2, old[1])) {
                break
            }
            index2--
        }

        if (firstIndex === SHADOWS.length && !edge1 && secondIndex === 0 && edge2) {
            firstIndex = 0
        }

        if (SHADOWS.length === 0) {
            SHADOWS.push([A1, A2])
        } else {
            const newShadow = [
                edge1 ? SHADOWS[firstIndex][0] : A1,
                edge2 ? SHADOWS[secondIndex][1] : A2
            ]

            secondIndex = Math.max(firstIndex, secondIndex)
            const sum1 = diffSum(SHADOWS)
            let doShift = false

            if (isBetween(0, newShadow[0], newShadow[1]) && newShadow[0] !== 0 && newShadow[1] !== 0) {
                SHADOWS.splice(
                    firstIndex,
                    firstIndex === secondIndex && edge1 === edge2 && !edge1 ? 0 : secondIndex - firstIndex + 1,
                    [newShadow[0], 0]
                )
                if (SHADOWS[0][0] !== 0 && SHADOWS[0][1] !== newShadow[1]) {
                    SHADOWS.splice(firstIndex + 1, 0, [0, newShadow[1]])
                }
                doShift = true
            } else {
                SHADOWS.splice(
                    firstIndex,
                    firstIndex === secondIndex && edge1 === edge2 && !edge1 ? 0 : secondIndex - firstIndex + 1,
                    newShadow
                )
            }

            const sum2 = diffSum(SHADOWS)
            if (sum2 < sum1) this.done = true

            if (newShadow[0] === 0 || doShift) {
                let count = 0
                while (SHADOWS[0][0] !== 0) {
                    SHADOWS.push(SHADOWS.shift())
                    if (count >= SHADOWS.length) break
                    count++
                }
            }
        }
    }
}

export default { DIRS, PreciseShadowcasting }
