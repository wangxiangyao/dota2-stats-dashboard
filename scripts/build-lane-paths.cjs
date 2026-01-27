/**
 * build-lane-paths.cjs - 构建兵线路径数据
 * 
 * 从 path_corner.json 和 spawner 文件中提取并构建完整的兵线路径
 */

const fs = require('fs')
const path = require('path')

// 路径配置
const DATA_DIR = path.join(__dirname, '../public/data/map/7.40b/entities')
const OUTPUT_DIR = path.join(__dirname, '../public/data/world')

// 读取 JSON 文件
function readJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

// 构建路径点查找表
function buildPathCornerMap(pathCorners) {
    const map = new Map()
    for (const corner of pathCorners) {
        map.set(corner.targetname, corner)
    }
    return map
}

// 从起点遍历链表构建完整路径
function buildPath(startName, cornerMap) {
    const waypoints = []
    const visited = new Set()
    let currentName = startName

    while (currentName && !visited.has(currentName)) {
        visited.add(currentName)
        const corner = cornerMap.get(currentName)

        if (!corner) {
            console.warn(`路径点未找到: ${currentName}`)
            break
        }

        waypoints.push({
            x: corner.x,
            y: corner.y
        })

        // 移动到下一个点
        currentName = corner.target

        // 如果 target 指向自己，说明是终点
        if (currentName === corner.targetname) {
            break
        }
    }

    return waypoints
}

// 主函数
function main() {
    console.log('开始构建兵线路径数据...')

    // 读取路径点数据
    const pathCorners = readJSON(path.join(DATA_DIR, 'path_corner.json'))
    const cornerMap = buildPathCornerMap(pathCorners)
    console.log(`已加载 ${pathCorners.length} 个路径点`)

    // 刷兵点配置
    const spawnerConfigs = [
        { team: 'radiant', lane: 'top', file: 'npc_dota_spawner_good_top.json' },
        { team: 'radiant', lane: 'mid', file: 'npc_dota_spawner_good_mid.json' },
        { team: 'radiant', lane: 'bot', file: 'npc_dota_spawner_good_bot.json' },
        { team: 'dire', lane: 'top', file: 'npc_dota_spawner_bad_top.json' },
        { team: 'dire', lane: 'mid', file: 'npc_dota_spawner_bad_mid.json' },
        { team: 'dire', lane: 'bot', file: 'npc_dota_spawner_bad_bot.json' },
    ]

    // 构建输出结构
    const lanePaths = {
        meta: {
            source: 'path_corner.json + npc_dota_spawner_*.json',
            generatedAt: new Date().toISOString(),
            version: '7.40b'
        },
        radiant: {},
        dire: {}
    }

    // 处理每个刷兵点
    for (const config of spawnerConfigs) {
        const spawnerData = readJSON(path.join(DATA_DIR, config.file))
        const spawner = spawnerData[0]

        const firstWaypoint = spawner.NPCFirstWaypoint
        const waypoints = buildPath(firstWaypoint, cornerMap)

        lanePaths[config.team][config.lane] = {
            spawner: {
                x: spawner.x,
                y: spawner.y
            },
            firstWaypoint: firstWaypoint,
            waypoints: waypoints,
            waypointCount: waypoints.length
        }

        console.log(`${config.team} ${config.lane}: ${waypoints.length} 个路径点`)
    }

    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    // 写入输出文件
    const outputPath = path.join(OUTPUT_DIR, 'lane-paths.json')
    fs.writeFileSync(outputPath, JSON.stringify(lanePaths, null, 2))
    console.log(`\n已输出到: ${outputPath}`)

    // 统计
    console.log('\n路径统计:')
    for (const team of ['radiant', 'dire']) {
        for (const lane of ['top', 'mid', 'bot']) {
            const path = lanePaths[team][lane]
            console.log(`  ${team} ${lane}: 起点(${path.spawner.x}, ${path.spawner.y}) → ${path.waypointCount} 点`)
        }
    }
}

main()
