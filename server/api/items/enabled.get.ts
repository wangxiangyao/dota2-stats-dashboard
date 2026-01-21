/**
 * GET /api/items/enabled
 * 获取已启用的物品列表
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async () => {
    const filePath = join(process.cwd(), 'public', 'data', 'items', 'enabled-items.json')

    if (!existsSync(filePath)) {
        return []
    }

    try {
        const content = readFileSync(filePath, 'utf-8')
        return JSON.parse(content)
    } catch (e) {
        return []
    }
})
