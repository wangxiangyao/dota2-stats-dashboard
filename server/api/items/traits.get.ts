/**
 * GET /api/items/traits
 * 获取物品自定义属性
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async () => {
    const filePath = join(process.cwd(), 'public', 'data', 'items', 'traits.json')

    if (!existsSync(filePath)) {
        return {}
    }

    try {
        const content = readFileSync(filePath, 'utf-8')
        return JSON.parse(content)
    } catch (e) {
        return {}
    }
})
