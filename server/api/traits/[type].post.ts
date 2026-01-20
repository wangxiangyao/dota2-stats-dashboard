import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * POST /api/traits/[type]
 * 保存特征数据到 JSON 文件
 */
export default defineEventHandler(async (event) => {
    const type = getRouterParam(event, 'type')

    if (!type) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing trait type'
        })
    }

    // 支持的特征类型
    const validTypes = ['damage', 'stun', 'slow']
    if (!validTypes.includes(type)) {
        throw createError({
            statusCode: 400,
            statusMessage: `Invalid trait type: ${type}. Valid types: ${validTypes.join(', ')}`
        })
    }

    const body = await readBody(event)

    if (!body || typeof body !== 'object') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid request body'
        })
    }

    // 构建文件路径
    const filePath = join(process.cwd(), 'public', 'data', 'abilities', 'traits', `${type}.json`)

    try {
        // 写入文件
        writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8')

        return {
            success: true,
            message: `Saved ${type} trait data`,
            count: Object.keys(body).length
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to save file: ${error.message}`
        })
    }
})
