/**
 * 属性值解析工具函数
 * 用于解析 Dota2 数据中的各种属性值格式
 */

/**
 * 解析属性值
 * @param value - 原始值，可能是字符串、字符串数组或数字
 * @param level - 技能等级（1-based）
 * @returns 解析后的数字
 */
export function parseValue(
  value: string | string[] | number | undefined | null,
  level: number
): number {
  if (value === undefined || value === null) {
    return 0
  }

  // 如果已经是数字，直接返回
  if (typeof value === 'number') {
    return value
  }

  // 处理数组（多级数值）
  if (Array.isArray(value)) {
    if (value.length === 0) return 0
    const idx = Math.min(level - 1, value.length - 1)
    value = value[idx]
  }

  // 转换为字符串并处理
  const strValue = String(value)
    .trim()
    .replace(/%/g, '') // 去除百分比
    .replace(/[秒秒米]/g, '') // 去除单位
    .replace(/−/g, '-') // 替换特殊减号

  const parsed = parseFloat(strValue)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * 解析范围值（如 "300-400"）
 * @param value - 范围字符串
 * @returns 平均值
 */
export function parseRangeValue(value: string | undefined | null): number {
  if (!value) return 0

  const match = value.match(/(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)/)
  if (match) {
    const min = parseFloat(match[1])
    const max = parseFloat(match[2])
    return (min + max) / 2
  }

  return parseValue(value, 1)
}

/**
 * 检查属性值是否包含特定单位
 */
export function hasUnit(value: string | string[], unit: string): boolean {
  const str = Array.isArray(value) ? value[0] : value
  return str.toLowerCase().includes(unit.toLowerCase())
}

/**
 * 提取属性数组中的所有值
 */
export function parseAllLevels(
  value: string | string[] | number | undefined | null
): number[] {
  if (value === undefined || value === null) {
    return [0]
  }

  if (typeof value === 'number') {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.map((v) => parseValue(v, 1))
  }

  return [parseValue(value, 1)]
}
