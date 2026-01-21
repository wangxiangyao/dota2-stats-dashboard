/**
 * GET /api/items/basic
 * 获取已标记的基础物品列表
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async () => {
    const filePath = join(process.cwd(), 'public', 'data', 'items', 'basic-items.json')

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
