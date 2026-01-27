/**
 * utils/creepAI.ts - 小兵 AI 行为逻辑
 * 
 * 实现小兵的状态机和行为决策
 */

import type { Point } from '@/types/map'
import type { Creep, CreepBehaviorState, Unit } from '@/types/unit'
import {
    AGGRO_COOLDOWN,
    CHASE_DURATION,
    AGGRO_TRIGGER_RANGE,
    EARLY_GAME_AGGRO_IMMUNITY_END,
    getDistance,
    isInAttackRange,
    isInAcquisitionRange,
    canAttack,
    calculatePhysicalDamage
} from './combat'

// ===== 类型定义 =====

export interface LanePathData {
    spawner: Point
    waypoints: Point[]
}

/**
 * 计算边缘距离（中心距离 - 两个碰撞半径）
 * Dota 2 中攻击/索敌距离都是基于边缘距离
 */
function getEdgeDistance(
    pos1: Point, radius1: number,
    pos2: Point, radius2: number
): number {
    const centerDist = getDistance(pos1.x, pos1.y, pos2.x, pos2.y)
    return Math.max(0, centerDist - radius1 - radius2)
}

export interface CreepAIContext {
    creep: Creep
    gameSeconds: number
    deltaSeconds: number
    allUnits: Unit[]
    lanePath: LanePathData
    onDamage?: (targetId: string, damage: number) => void
    /** 寻路函数（A*算法） */
    findPath?: (start: Point, end: Point, options?: { collisionRadius?: number }) => Point[]
}

// ===== 状态机更新 =====

/**
 * 更新小兵状态
 */
export function updateCreepBehavior(ctx: CreepAIContext): void {
    const { creep, gameSeconds } = ctx

    // 死亡状态不处理
    if (creep.behaviorState === 'dead' || !creep.isAlive) {
        return
    }

    // 根据当前状态执行对应逻辑
    switch (creep.behaviorState) {
        case 'idle':
            updateIdleState(ctx)
            break
        case 'lane_move':
            updateLaneMoveState(ctx)
            break
        case 'chase':
            updateChaseState(ctx)
            break
        case 'attack':
            updateAttackState(ctx)
            break
        case 'seek_last':
            updateSeekLastState(ctx)
            break
        case 'return':
            updateReturnState(ctx)
            break
    }
}

// ===== 各状态逻辑 =====

function updateIdleState(ctx: CreepAIContext): void {
    const { creep, lanePath } = ctx

    // 尝试索敌
    const target = findTarget(ctx)
    if (target) {
        creep.aggroTarget = target.id
        creep.behaviorState = 'attack'
        return
    }

    // 没有敌人，开始沿路径移动
    if (lanePath.waypoints.length > 0) {
        // 不重置 lanePathIndex，保持当前进度
        creep.behaviorState = 'lane_move'
    }
}

function updateLaneMoveState(ctx: CreepAIContext): void {
    const { creep, deltaSeconds, lanePath } = ctx

    // 检查是否有敌人进入索敌范围
    const target = findTarget(ctx)
    if (target) {
        // 使用中心点距离判定攻击范围
        const centerDist = getDistance(
            creep.position.x, creep.position.y,
            target.position.x, target.position.y
        )

        // 如果在攻击范围内，直接进入攻击状态（不继续移动）
        if (centerDist <= creep.combat.attackRange) {
            creep.rememberedPosition = { ...creep.position }
            creep.aggroTarget = target.id
            creep.behaviorState = 'attack'
            return
        }

        // 目标在索敌范围内但不在攻击范围内 -> 向敌人移动
        creep.aggroTarget = target.id
        creep.behaviorState = 'attack'
        return
    }

    // 检查视野范围内是否有敌人（比索敌范围更远）
    const enemyInVision = findEnemyInVision(ctx)
    if (enemyInVision) {
        // 视野内发现敌人，离开路径向敌人移动
        creep.aggroTarget = enemyInVision.id
        creep.behaviorState = 'attack'
        return
    }

    // 继续沿路径移动
    const waypoint = lanePath.waypoints[creep.lanePathIndex]
    if (!waypoint) {
        // 到达终点
        creep.behaviorState = 'idle'
        return
    }

    const distance = getDistance(
        creep.position.x, creep.position.y,
        waypoint.x, waypoint.y
    )

    if (distance < 50) {
        // 到达当前路径点，前往下一个
        creep.lanePathIndex++
        if (creep.lanePathIndex >= lanePath.waypoints.length) {
            creep.behaviorState = 'idle'
        }
    } else {
        // 移动向目标点（使用寻路）
        moveTowardWithPathfinding(ctx, waypoint)
    }
}

function updateChaseState(ctx: CreepAIContext): void {
    const { creep, gameSeconds, deltaSeconds, allUnits } = ctx

    // 检查追击是否超时
    if (creep.chaseStartTime !== null) {
        const chaseTime = gameSeconds - creep.chaseStartTime
        if (chaseTime >= CHASE_DURATION) {
            // 追击超时，返回记忆点
            creep.aggroTarget = null
            creep.chaseStartTime = null
            creep.behaviorState = 'return'
            return
        }
    }

    // 找到追击目标
    const target = allUnits.find(u => u.id === creep.aggroTarget)
    if (!target || !target.isAlive) {
        // 目标不存在或死亡
        creep.aggroTarget = null
        creep.behaviorState = 'return'
        return
    }

    // 检查是否在攻击范围内
    if (isInAttackRange(
        creep.position.x, creep.position.y,
        target.position.x, target.position.y,
        creep.combat.attackRange
    )) {
        creep.behaviorState = 'attack'
    } else {
        // 继续追击（使用寻路）
        moveTowardWithPathfinding(ctx, target.position)
    }
}

function updateAttackState(ctx: CreepAIContext): void {
    const { creep, gameSeconds, deltaSeconds, allUnits, onDamage } = ctx

    // 找到攻击目标
    const target = allUnits.find(u => u.id === creep.aggroTarget)
    if (!target || !target.isAlive) {
        // 目标不存在或死亡，重新索敌
        creep.aggroTarget = null
        const newTarget = findTarget(ctx)
        if (newTarget) {
            creep.aggroTarget = newTarget.id
        } else {
            creep.behaviorState = 'return'
        }
        return
    }

    // 使用中心点距离判定攻击范围
    // 攻击范围 = 自身攻击范围 + 目标碰撞半径（因为碰撞检测是边缘到中心）
    const centerDist = getDistance(
        creep.position.x, creep.position.y,
        target.position.x, target.position.y
    )
    const effectiveAttackRange = creep.combat.attackRange + target.collisionRadius

    // 检查是否在攻击范围内
    if (centerDist > effectiveAttackRange) {
        // 目标移出攻击范围，向敌人移动
        moveTowardWithPathfinding(ctx, target.position)
        return
    }

    // 检查是否可以攻击
    if (canAttack(creep.attackState, creep.combat, gameSeconds)) {
        // 执行攻击
        creep.attackState.lastAttackTime = gameSeconds
        creep.attackState.attackAnimProgress = 0
        creep.attackState.target = target.id

        // 计算伤害
        if (onDamage) {
            const damage = calculatePhysicalDamage(creep.combat, target.combat)
            onDamage(target.id, damage)
        }
    }

    // 更新攻击动画进度
    const animDuration = 0.2  // 攻击动画持续时间
    if (creep.attackState.attackAnimProgress < 1) {
        creep.attackState.attackAnimProgress = Math.min(
            1,
            creep.attackState.attackAnimProgress + deltaSeconds / animDuration
        )
    }
}

function updateSeekLastState(ctx: CreepAIContext): void {
    const { creep, deltaSeconds } = ctx

    if (!creep.targetLastSeenAt) {
        creep.behaviorState = 'return'
        return
    }

    const distance = getDistance(
        creep.position.x, creep.position.y,
        creep.targetLastSeenAt.x, creep.targetLastSeenAt.y
    )

    if (distance < 50) {
        // 到达目标最后位置，尝试索敌
        creep.targetLastSeenAt = null
        const target = findTarget(ctx)
        if (target) {
            creep.aggroTarget = target.id
            creep.behaviorState = 'attack'
        } else {
            creep.behaviorState = 'return'
        }
    } else {
        moveTowardWithPathfinding(ctx, creep.targetLastSeenAt!)
    }
}

function updateReturnState(ctx: CreepAIContext): void {
    const { creep, lanePath } = ctx

    // 检查路上是否有敌人
    const target = findTarget(ctx)
    if (target) {
        creep.aggroTarget = target.id
        creep.behaviorState = 'attack'
        return
    }

    // 战斗结束后，找到当前位置之后最近的路径点，继续前进
    // 不回到记忆点，而是直接向前推进
    const nearestIndex = findNearestForwardWaypoint(creep, lanePath)
    if (nearestIndex >= 0) {
        creep.lanePathIndex = nearestIndex
    }

    creep.rememberedPosition = null
    creep.behaviorState = 'lane_move'
}

/**
 * 找到当前位置之后最近的路径点索引
 */
function findNearestForwardWaypoint(creep: Creep, lanePath: LanePathData): number {
    let bestIndex = creep.lanePathIndex
    let bestDistance = Infinity

    // 从当前索引开始向后搜索（向前 = 索引更大）
    for (let i = Math.max(0, creep.lanePathIndex); i < lanePath.waypoints.length; i++) {
        const wp = lanePath.waypoints[i]
        const dist = getDistance(creep.position.x, creep.position.y, wp.x, wp.y)

        if (dist < bestDistance) {
            bestDistance = dist
            bestIndex = i
        }

        // 如果距离开始增加，说明过了最近点
        if (dist > bestDistance + 100) break
    }

    return bestIndex
}

// ===== 辅助函数 =====

/**
 * 索敌：查找索敌范围内的敌人
 */
function findTarget(ctx: CreepAIContext): Unit | null {
    const { creep, allUnits, gameSeconds } = ctx

    // 5分钟前特殊规则（简化：不检查 T1 塔范围）
    if (gameSeconds < EARLY_GAME_AGGRO_IMMUNITY_END) {
        // 5分钟前只攻击小兵，不攻击英雄
        // 简化处理：正常索敌
    }

    // 筛选敌方单位
    const enemies = allUnits.filter(u =>
        u.isAlive &&
        u.team !== creep.team &&
        isInAcquisitionRange(
            creep.position.x, creep.position.y,
            u.position.x, u.position.y,
            creep.combat.acquisitionRange
        )
    )

    if (enemies.length === 0) return null

    // 按距离排序，返回最近的
    enemies.sort((a, b) => {
        const distA = getDistance(creep.position.x, creep.position.y, a.position.x, a.position.y)
        const distB = getDistance(creep.position.x, creep.position.y, b.position.x, b.position.y)
        return distA - distB
    })

    return enemies[0]
}

/**
 * 查找视野范围内的敌人（用于视野内发现敌人后向其移动）
 */
function findEnemyInVision(ctx: CreepAIContext): Unit | null {
    const { creep, allUnits } = ctx

    const visionRange = creep.vision.dayVision  // 使用日间视野

    // 筛选视野范围内的敌人
    const enemies = allUnits.filter(u =>
        u.isAlive &&
        u.team !== creep.team &&
        getDistance(creep.position.x, creep.position.y, u.position.x, u.position.y) <= visionRange
    )

    if (enemies.length === 0) return null

    // 按距离排序，返回最近的
    enemies.sort((a, b) => {
        const distA = getDistance(creep.position.x, creep.position.y, a.position.x, a.position.y)
        const distB = getDistance(creep.position.x, creep.position.y, b.position.x, b.position.y)
        return distA - distB
    })

    return enemies[0]
}

/**
 * 向目标移动（带局部避障）
 * 碰撞行为：停顿等待 → 尝试继续 → 不行再绕路
 */
const COLLISION_WAIT_THRESHOLD = 0.3  // 等待多久后开始绕路（秒）

function moveTowardWithPathfinding(ctx: CreepAIContext, target: Point): void {
    const { creep, deltaSeconds, allUnits } = ctx

    // 计算到目标的方向
    const dx = target.x - creep.position.x
    const dy = target.y - creep.position.y
    const distToTarget = Math.sqrt(dx * dx + dy * dy)

    if (distToTarget < 1) return

    // 归一化目标方向
    const dirX = dx / distToTarget
    const dirY = dy / distToTarget

    // 检测前方是否有碰撞
    let hasCollision = false
    let closestCollisionDist = Infinity
    let closestUnit: Unit | null = null

    for (const unit of allUnits) {
        if (unit.id === creep.id || !unit.isAlive) continue

        // 只对同队单位触发碰撞等待（敌人会开打，不需要等待/绕路）
        if (unit.team !== creep.team) continue

        const toDx = unit.position.x - creep.position.x
        const toDy = unit.position.y - creep.position.y

        // 快速过滤
        const checkRadius = 150
        if (Math.abs(toDx) > checkRadius || Math.abs(toDy) > checkRadius) continue

        // 只检测前进方向上的障碍物（点积 > 0 表示在前方）
        const dotProduct = toDx * dirX + toDy * dirY
        if (dotProduct < 0) continue  // 障碍物在后方，不管

        const distSq = toDx * toDx + toDy * toDy
        const collisionDist = creep.collisionRadius + unit.collisionRadius

        // 检测碰撞
        if (distSq < collisionDist * collisionDist && distSq > 0) {
            hasCollision = true
            if (distSq < closestCollisionDist) {
                closestCollisionDist = distSq
                closestUnit = unit
            }
        }
    }

    if (hasCollision) {
        // 有碰撞：增加等待时间
        creep.collisionWaitTime += deltaSeconds

        if (creep.collisionWaitTime < COLLISION_WAIT_THRESHOLD) {
            // 还在等待阶段，不移动（停顿）
            return
        }

        // 等待超时，开始绕路
        if (closestUnit) {
            const toDx = closestUnit.position.x - creep.position.x
            const toDy = closestUnit.position.y - creep.position.y
            const dist = Math.sqrt(toDx * toDx + toDy * toDy)

            if (dist > 0) {
                const toUnitX = toDx / dist
                const toUnitY = toDy / dist

                // 两个垂直方向
                const perpX1 = -toUnitY
                const perpY1 = toUnitX
                const perpX2 = toUnitY
                const perpY2 = -toUnitX

                // 选择与目标方向夹角更小的
                const dot1 = perpX1 * dirX + perpY1 * dirY
                const dot2 = perpX2 * dirX + perpY2 * dirY

                let avoidX: number, avoidY: number
                if (dot1 > dot2) {
                    avoidX = perpX1
                    avoidY = perpY1
                } else {
                    avoidX = perpX2
                    avoidY = perpY2
                }

                // 60% 避让 + 40% 目标方向
                let moveX = avoidX * 0.6 + dirX * 0.4
                let moveY = avoidY * 0.6 + dirY * 0.4

                // 归一化
                const moveLen = Math.sqrt(moveX * moveX + moveY * moveY)
                if (moveLen > 0) {
                    moveX /= moveLen
                    moveY /= moveLen
                }

                // 移动
                const moveDistance = creep.combat.moveSpeed * deltaSeconds
                creep.position.x += moveX * moveDistance
                creep.position.y += moveY * moveDistance
            }
        }
    } else {
        // 没有碰撞：重置等待时间，正常移动
        creep.collisionWaitTime = 0

        const moveDistance = creep.combat.moveSpeed * deltaSeconds
        creep.position.x += dirX * moveDistance
        creep.position.y += dirY * moveDistance
    }
}

/**
 * 直线移动（不使用避障）
 */
function moveTowardDirect(creep: Creep, target: Point, deltaSeconds: number): void {
    const dx = target.x - creep.position.x
    const dy = target.y - creep.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 1) return

    const moveDistance = creep.combat.moveSpeed * deltaSeconds
    const ratio = Math.min(1, moveDistance / distance)

    creep.position.x += dx * ratio
    creep.position.y += dy * ratio
}

/**
 * 应用碰撞分离（防止小兵重叠）
 * 应该在每帧更新后调用
 */
export function applyCollisionSeparation(creeps: Creep[], allUnits: Unit[]): void {
    const SEPARATION_STRENGTH = 1.0  // 分离力度（更强）

    for (const creep of creeps) {
        if (!creep.isAlive) continue

        let separationX = 0
        let separationY = 0

        // 小兵之间不使用分离力，通过避障逻辑处理
        // 这样前面的小兵不会被后面的推开

        // 检测与建筑物的碰撞（简化：只检测防御塔等大型单位）
        for (const unit of allUnits) {
            if (unit.id === creep.id || !unit.isAlive) continue
            if (unit.unitType === 'creep') continue  // 已在上面处理

            const dx = creep.position.x - unit.position.x
            const dy = creep.position.y - unit.position.y

            // 快速过滤
            const maxRadius = 200
            if (Math.abs(dx) > maxRadius || Math.abs(dy) > maxRadius) continue

            const distSq = dx * dx + dy * dy
            const minDist = creep.collisionRadius + (unit.collisionRadius || 24)

            if (distSq < minDist * minDist && distSq > 0) {
                const distance = Math.sqrt(distSq)
                const overlap = minDist - distance
                const nx = dx / distance
                const ny = dy / distance
                separationX += nx * overlap * SEPARATION_STRENGTH * 2  // 建筑物分离力更强
                separationY += ny * overlap * SEPARATION_STRENGTH * 2
            }
        }

        // 应用分离
        creep.position.x += separationX
        creep.position.y += separationY
    }
}

/**
 * 触发 Type1 仇恨（英雄攻击指令）
 */
export function triggerType1Aggro(
    creep: Creep,
    heroId: string,
    heroPosition: Point,
    gameSeconds: number
): boolean {
    // 检查 CD
    if (gameSeconds - creep.lastAggroCooldown < AGGRO_COOLDOWN) {
        return false
    }

    // 检查距离
    const distance = getDistance(
        creep.position.x, creep.position.y,
        heroPosition.x, heroPosition.y
    )

    if (distance > AGGRO_TRIGGER_RANGE) {
        return false
    }

    // 触发仇恨
    creep.aggroTarget = heroId
    creep.lastAggroCooldown = gameSeconds
    creep.chaseStartTime = gameSeconds
    creep.rememberedPosition = { ...creep.position }
    creep.behaviorState = 'chase'

    return true
}
