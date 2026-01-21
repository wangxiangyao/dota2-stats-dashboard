/**
 * POST /api/items/traits
 * 保存物品自定义属性
 * 支持两种模式：
 * 1. mode: 'replace' + data: {...} - 覆盖整个文件
 * 2. name + traits: {...} - 更新单个物品
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'

interface ItemAttributes {
    strength?: number
    agility?: number
    intellect?: number
    allStats?: number
    damage?: number
    attackSpeed?: number
    armor?: number
    health?: number
    mana?: number
    healthRegen?: number
    manaRegen?: number
    moveSpeed?: number
    evasion?: number
    magicResist?: number
    lifesteal?: number
    spellLifesteal?: number
    critChance?: number
}

interface ItemTraits {
    isBasic?: boolean
    attributes?: ItemAttributes
}

type RequestBody =
    | { mode: 'replace'; data: Record<string, ItemTraits> }
    | { name: string; traits: ItemTraits }

export default defineEventHandler(async (event) => {
    const body = await readBody<RequestBody>(event)
    const filePath = join(process.cwd(), 'public', 'data', 'items', 'traits.json')
    const dir = dirname(filePath)

    // 确保目录存在
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }

    // 模式1: 覆盖整个文件
    if ('mode' in body && body.mode === 'replace') {
        writeFileSync(filePath, JSON.stringify(body.data || {}, null, 2), 'utf-8')
        return { success: true, count: Object.keys(body.data || {}).length }
    }

    // 模式2: 更新单个物品
    if ('name' in body && 'traits' in body) {
        // 读取现有数据
        let allTraits: Record<string, ItemTraits> = {}
        if (existsSync(filePath)) {
            try {
                const content = readFileSync(filePath, 'utf-8')
                allTraits = JSON.parse(content)
            } catch (e) {
                // 忽略解析错误
            }
        }

        // 更新该物品的 traits
        allTraits[body.name] = { ...allTraits[body.name], ...body.traits }

        // 写入文件
        writeFileSync(filePath, JSON.stringify(allTraits, null, 2), 'utf-8')
        return { success: true, traits: allTraits[body.name] }
    }

    throw createError({
        statusCode: 400,
        message: '请求体格式错误'
    })
})
