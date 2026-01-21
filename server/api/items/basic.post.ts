/**
 * POST /api/items/basic
 * 保存基础物品列表
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

export default defineEventHandler(async (event) => {
    const body = await readBody<string[]>(event)

    if (!Array.isArray(body)) {
        throw createError({
            statusCode: 400,
            message: '请求体必须是数组'
        })
    }

    const filePath = join(process.cwd(), 'public', 'data', 'items', 'basic-items.json')
    const dir = dirname(filePath)

    // 确保目录存在
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }

    // 写入文件
    writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8')

    return { success: true, count: body.length }
})
