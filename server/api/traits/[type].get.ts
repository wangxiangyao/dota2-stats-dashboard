import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * GET /api/traits/[type]
 * 读取特征数据
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

    // 构建文件路径
    const filePath = join(process.cwd(), 'public', 'data', 'abilities', 'traits', `${type}.json`)

    if (!existsSync(filePath)) {
        // 文件不存在时返回空对象
        return {}
    }

    try {
        const content = readFileSync(filePath, 'utf-8')
        return JSON.parse(content)
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to read file: ${error.message}`
        })
    }
})
