/**
 * POST /api/items/enabled
 * 保存已启用的物品列表
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

export default defineEventHandler(async (event) => {
    const body = await readBody<string[]>(event)

    if (!Array.isArray(body)) {
        throw createError({
            statusCode: 400,
            message: '请求体必须是物品名称数组'
        })
    }

    const filePath = join(process.cwd(), 'public', 'data', 'items', 'enabled-items.json')
    const dir = dirname(filePath)

    // 确保目录存在
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }

    // 保存物品列表
    writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8')

    return {
        success: true,
        count: body.length,
        message: `成功保存 ${body.length} 个物品`
    }
})
