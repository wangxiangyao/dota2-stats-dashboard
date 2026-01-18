/**
 * 数据加载器 Composable
 * 负责从JSON文件加载所有游戏数据
 */

import type { Hero, Ability, Item, WorldData, GameData } from '~/types/dota'

// 全局缓存
const cache = new Map<string, any>()

export const useDataLoader = () => {
  /**
   * 加载JSON数据
   */
  const loadJson = async <T>(filename: string): Promise<T | null> => {
    if (cache.has(filename)) {
      return cache.get(filename) as T
    }

    try {
      const data = await $fetch<T>(`/data/${filename}`)
      cache.set(filename, data)
      return data
    } catch (error) {
      console.error(`Error loading ${filename}:`, error)
      return null
    }
  }

  /**
   * 加载英雄数据
   */
  const loadHeroes = () => loadJson<Hero[]>('heroes.json')

  /**
   * 加载技能数据
   */
  const loadAbilities = () => loadJson<Ability[]>('abilities.json')

  /**
   * 加载英雄技能数据（过滤后的）
   */
  const loadHeroAbilities = () => loadJson<Ability[]>('heroesAbilities.json')

  /**
   * 加载物品数据
   */
  const loadItems = () => loadJson<Item[]>('items.json')

  /**
   * 加载世界数据
   */
  const loadWorld = () => loadJson<WorldData>('world.json')

  /**
   * 加载所有数据
   */
  const loadAll = async (): Promise<GameData> => {
    const [heroes, abilities, items, world] = await Promise.all([
      loadHeroes(),
      loadAbilities(),
      loadItems(),
      loadWorld()
    ])
    return { heroes, abilities, items, world }
  }

  /**
   * 清除缓存
   */
  const clearCache = () => {
    cache.clear()
  }

  return {
    loadJson,
    loadHeroes,
    loadAbilities,
    loadHeroAbilities,
    loadItems,
    loadWorld,
    loadAll,
    clearCache
  }
}
