import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execAsync = promisify(exec)

/**
 * POST /api/parse/items
 * 执行物品解析脚本，生成 items.json
 */
export default defineEventHandler(async (event) => {
    const scriptPath = join(process.cwd(), 'scripts', 'parse-items.cjs')

    try {
        const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
            cwd: process.cwd(),
            timeout: 60000 // 60秒超时
        })

        return {
            success: true,
            message: 'Items parsing completed',
            output: stdout,
            warnings: stderr || null
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: `Parse failed: ${error.message}`,
            data: {
                stdout: error.stdout,
                stderr: error.stderr
            }
        })
    }
})
