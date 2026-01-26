<script setup lang="ts">
/**
 * EntityPopup.vue - 实体详情浮窗
 * 
 * 显示野怪营地、防御塔等实体的详细信息
 */

import type { SelectedEntity } from '@/types/map'

interface Props {
  entity: SelectedEntity | null
  position: { x: number, y: number } | null
  buildingsData?: any
  neutralsData?: any
  campSpawnsData?: any
  gameTime?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
}>()

// 营地类型名称
function getCampTypeName(type: string | null | undefined): string {
  const names: Record<string, string> = {
    small: '小野',
    medium: '中野',
    large: '大野',
    ancient: '远古'
  }
  return type ? names[type] || type : '未标注'
}

// 从防御塔数据获取等级 key
function getTowerTierKey(data: any): string {
  // 优先使用 MapUnitName（新数据格式）
  const mapUnitName = data?.MapUnitName || ''
  // 也检查 targetname
  const targetName = data?.targetname || data?.name || ''
  const combined = mapUnitName + targetName
  
  if (combined.includes('tower1')) return 'tier1'
  if (combined.includes('tower2')) return 'tier2'
  if (combined.includes('tower3')) return 'tier3'
  if (combined.includes('tower4')) return 'tier4'
  return 'tier1'
}

// 塔等级显示名
function getTowerTier(data: any): string {
  const tierKey = getTowerTierKey(data)
  const tierNames: Record<string, string> = {
    tier1: '一塔',
    tier2: '二塔',
    tier3: '高地塔',
    tier4: '门塔'
  }
  return tierNames[tierKey] || '未知'
}

// 获取防御塔属性
function getTowerStats(data: any) {
  if (!props.buildingsData?.towers) return null
  const tierKey = getTowerTierKey(data)
  return props.buildingsData.towers[tierKey]?.stats
}

// 阵营名称
function getTeamName(team: number | undefined): string {
  if (team === 2) return '天辉'
  if (team === 3) return '夜魇'
  return '中立'
}

// 获取营地统计数据
function getCampStats(type: string | null | undefined) {
  if (!type || !props.neutralsData?.camps?.[type]) return null
  return props.neutralsData.camps[type]
}

// 获取遗迹属性
function getAncientStats() {
  return props.buildingsData?.ancient?.stats
}

// 获取泉水属性
function getFountainStats() {
  return props.buildingsData?.fountain?.stats
}

// 青蛙组合ID列表
const FROG_CAMP_IDS = ['pollywog', 'froglet', 'frog', 'ancient_frog']

// 获取野怪组合（对进化营地使用当前进化后的等级）
function getCampCombinations(baseTier: string | null | undefined, isFrog?: boolean, gameTimeSeconds?: number) {
  if (!baseTier || !props.campSpawnsData) return []
  
  // 确定实际使用的等级
  let actualTier = baseTier
  
  // 如果是进化营地，根据游戏时间计算当前等级
  if (isFrog && gameTimeSeconds !== undefined) {
    const evoState = getEvolutionState(baseTier, gameTimeSeconds)
    actualTier = evoState.currentTier
  }
  
  // 检查该等级是否有组合数据
  if (!props.campSpawnsData[actualTier]) return []
  
  const combinations = props.campSpawnsData[actualTier].combinations || []
  
  // 如果是青蛙营地,只返回青蛙组合
  if (isFrog) {
    return combinations.filter((c: any) => FROG_CAMP_IDS.includes(c.id))
  }
  
  // 非青蛙营地,过滤掉青蛙组合
  return combinations.filter((c: any) => !FROG_CAMP_IDS.includes(c.id))
}

// 进化等级顺序
const TIER_ORDER = ['small', 'medium', 'large', 'ancient']
const TIER_NAMES: Record<string, string> = {
  small: '小野',
  medium: '中野', 
  large: '大野',
  ancient: '远古野'
}

// 获取进化营地当前状态（基于初始等级，最多升级两次）
function getEvolutionState(baseTier: string, gameTimeSeconds: number) {
  const minutes = Math.floor(gameTimeSeconds / 60)
  const baseTierIndex = TIER_ORDER.indexOf(baseTier)
  
  // 最大可升级次数 = 2次，但不能超过ancient
  const maxUpgrades = Math.min(2, TIER_ORDER.length - 1 - baseTierIndex)
  
  // 计算已完成的升级轮数（每15分钟完成一轮，每轮3只野怪都进化一次）
  const completedUpgrades = Math.min(maxUpgrades, Math.floor(minutes / 15))
  
  // 当前等级 = 初始等级 + 已完成升级次数
  const currentTierIndex = Math.min(baseTierIndex + completedUpgrades, TIER_ORDER.length - 1)
  const currentTier = TIER_ORDER[currentTierIndex]
  
  // 当前轮次内已进化几只（每5分钟进化一只，共3只）
  const currentRoundMinutes = minutes % 15
  const evolutionsInRound = Math.min(3, Math.floor(currentRoundMinutes / 5))
  
  // 下次全部升级时间
  const nextUpgradeTime = completedUpgrades < maxUpgrades ? (completedUpgrades + 1) * 15 : null
  
  // 最终等级和完全升级时间
  const finalTierIndex = Math.min(baseTierIndex + maxUpgrades, TIER_ORDER.length - 1)
  const finalTier = TIER_ORDER[finalTierIndex]
  const fullyEvolvedTime = maxUpgrades * 15
  
  return {
    baseTier,
    baseTierName: TIER_NAMES[baseTier],
    currentTier,
    currentTierName: TIER_NAMES[currentTier],
    evolutionsInRound,
    completedUpgrades,
    maxUpgrades,
    nextUpgradeTime,
    finalTier,
    finalTierName: TIER_NAMES[finalTier],
    fullyEvolvedTime,
    isFullyEvolved: completedUpgrades >= maxUpgrades
  }
}

// 格式化单位名称
function formatUnitName(id: string): string {
  return id.replace(/_/g, ' ')
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="entity && position"
      class="entity-popup"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
    >
      <div class="popup-header">
        <h3>
          <template v-if="entity.type === 'camp'">🐺 野怪营地 #{{ entity.index }}</template>
          <template v-else-if="entity.type === 'tower'">🗼 防御塔</template>
          <template v-else-if="entity.type === 'fountain'">⛲ 泉水</template>
          <template v-else-if="entity.type === 'fort'">🏰 遗迹</template>
          <template v-else-if="entity.type === 'outpost'">🔭 前哨</template>
          <template v-else-if="entity.type === 'rune'">✨ 神符</template>
        </h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      
      <template v-if="entity.type === 'camp'">
        <div class="popup-row">
          <span class="label">类型</span>
          <span class="value" :class="entity.campType || 'unknown'">
            {{ getCampTypeName(entity.campType) }}
            <span v-if="entity.isFrog" class="frog-badge">🐸 进化</span>
          </span>
        </div>
        <div class="popup-row">
          <span class="label">🔄 刷新</span>
          <span class="value">60秒 | 堆叠:53-55</span>
        </div>
        
        <!-- 进化营地状态 -->
        <template v-if="entity.isFrog && gameTime !== undefined">
          <div class="evolution-header">🌊 进化状态</div>
          <div class="evolution-status">
            <div class="evolution-row">
              <span class="evo-label">初始等级</span>
              <span class="evo-value">{{ getEvolutionState(entity.campType || 'small', gameTime).baseTierName }}</span>
            </div>
            <div class="evolution-row">
              <span class="evo-label">当前等级</span>
              <span class="evo-value highlight">{{ getEvolutionState(entity.campType || 'small', gameTime).currentTierName }}</span>
            </div>
            <div class="evolution-row">
              <span class="evo-label">本轮进化</span>
              <span class="evo-value">{{ getEvolutionState(entity.campType || 'small', gameTime).evolutionsInRound }}/3 只</span>
            </div>
            <div class="evolution-row" v-if="!getEvolutionState(entity.campType || 'small', gameTime).isFullyEvolved">
              <span class="evo-label">下次升级</span>
              <span class="evo-value">{{ getEvolutionState(entity.campType || 'small', gameTime).nextUpgradeTime }}:00</span>
            </div>
            <div class="evolution-row">
              <span class="evo-label">最终形态</span>
              <span class="evo-value" :class="{ complete: getEvolutionState(entity.campType || 'small', gameTime).isFullyEvolved }">
                {{ getEvolutionState(entity.campType || 'small', gameTime).finalTierName }}
                <span v-if="!getEvolutionState(entity.campType || 'small', gameTime).isFullyEvolved">
                  ({{ getEvolutionState(entity.campType || 'small', gameTime).fullyEvolvedTime }}:00)
                </span>
                <span v-else>✓</span>
              </span>
            </div>
          </div>
        </template>
        
        <!-- 野怪组合列表 -->
        <template v-if="getCampCombinations(entity.campType, entity.isFrog, gameTime).length > 0">
          <div class="combinations-header">{{ entity.isFrog ? '青蛙野怪' : '野怪组合' }}</div>
          <div 
            v-for="(combo, index) in getCampCombinations(entity.campType, entity.isFrog, gameTime)" 
            :key="combo.id"
            class="combo-item"
          >
            <div class="combo-name">{{ Number(index) + 1 }}. {{ combo.name }}</div>
            <div class="combo-stats">
              <span class="stat-gold">💰 {{ combo.totalGold.min }}-{{ combo.totalGold.max }}</span>
              <span class="stat-xp">⭐ {{ combo.totalXP }}</span>
            </div>
          </div>
        </template>
        
        <div class="popup-row coords">
          <span class="label">📍</span>
          <span class="value">({{ Math.round(entity.data.x) }}, {{ Math.round(entity.data.y) }})</span>
        </div>
      </template>
      
      <!-- 防御塔详情 -->
      <template v-else-if="entity.type === 'tower'">
        <div class="popup-row">
          <span class="label">阵营</span>
          <span class="value" :class="entity.data.team === 2 ? 'radiant' : 'dire'">
            {{ getTeamName(entity.data.team) }}
          </span>
        </div>
        <div class="popup-row">
          <span class="label">等级</span>
          <span class="value">{{ getTowerTier(entity.data) }}</span>
        </div>
        <template v-if="getTowerStats(entity.data)">
          <div class="popup-row">
            <span class="label">❤️ 血量</span>
            <span class="value">{{ getTowerStats(entity.data)?.hp }}</span>
          </div>
          <div class="popup-row">
            <span class="label">🛡️ 护甲</span>
            <span class="value">{{ getTowerStats(entity.data)?.armor }}</span>
          </div>
          <div class="popup-row">
            <span class="label">⚔️ 攻击</span>
            <span class="value">{{ getTowerStats(entity.data)?.attackMin }}-{{ getTowerStats(entity.data)?.attackMax }}</span>
          </div>
          <div class="popup-row">
            <span class="label">🎯 射程</span>
            <span class="value">{{ getTowerStats(entity.data)?.attackRange }}</span>
          </div>
        </template>
        <div class="popup-row coords">
          <span class="label">📍</span>
          <span class="value">({{ Math.round(entity.data.x) }}, {{ Math.round(entity.data.y) }})</span>
        </div>
      </template>
      
      <!-- 遗迹详情 -->
      <template v-else-if="entity.type === 'fort'">
        <div class="popup-row" v-if="entity.data.team">
          <span class="label">阵营</span>
          <span class="value" :class="entity.data.team === 2 ? 'radiant' : 'dire'">
            {{ getTeamName(entity.data.team) }}
          </span>
        </div>
        <template v-if="getAncientStats()">
          <div class="popup-row">
            <span class="label">❤️ 血量</span>
            <span class="value">{{ getAncientStats()?.hp }}</span>
          </div>
          <div class="popup-row">
            <span class="label">🛡️ 护甲</span>
            <span class="value">{{ getAncientStats()?.armor }}</span>
          </div>
          <div class="popup-row">
            <span class="label">💚 回血</span>
            <span class="value">{{ getAncientStats()?.hpRegen }}/秒</span>
          </div>
        </template>
        <div class="popup-row coords">
          <span class="label">📍</span>
          <span class="value">({{ Math.round(entity.data.x) }}, {{ Math.round(entity.data.y) }})</span>
        </div>
      </template>
      
      <!-- 泉水详情 -->
      <template v-else-if="entity.type === 'fountain'">
        <div class="popup-row" v-if="entity.data.team">
          <span class="label">阵营</span>
          <span class="value" :class="entity.data.team === 2 ? 'radiant' : 'dire'">
            {{ getTeamName(entity.data.team) }}
          </span>
        </div>
        <template v-if="getFountainStats()">
          <div class="popup-row">
            <span class="label">⚔️ 攻击</span>
            <span class="value">{{ getFountainStats()?.attackMin }}-{{ getFountainStats()?.attackMax }}</span>
          </div>
          <div class="popup-row">
            <span class="label">🎯 射程</span>
            <span class="value">{{ getFountainStats()?.attackRange }}</span>
          </div>
          <div class="popup-row">
            <span class="label">⚡ 攻速</span>
            <span class="value">{{ getFountainStats()?.attackRate }}</span>
          </div>
        </template>
        <div class="popup-row coords">
          <span class="label">📍</span>
          <span class="value">({{ Math.round(entity.data.x) }}, {{ Math.round(entity.data.y) }})</span>
        </div>
      </template>
      
      <!-- 其他实体 -->
      <template v-else>
        <div class="popup-row" v-if="entity.data.team">
          <span class="label">阵营</span>
          <span class="value" :class="entity.data.team === 2 ? 'radiant' : 'dire'">
            {{ getTeamName(entity.data.team) }}
          </span>
        </div>
        <div class="popup-row coords">
          <span class="label">📍</span>
          <span class="value">({{ Math.round(entity.data.x) }}, {{ Math.round(entity.data.y) }})</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.entity-popup {
  position: fixed;
  background: #1e2a3a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0;
  min-width: 200px;
  max-width: 280px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #eee;
  font-size: 0.9rem;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #333;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px 8px 0 0;
}

.popup-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.close-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 4px;
}

.close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.popup-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.popup-row:last-child {
  border-bottom: none;
}

.popup-row .label {
  color: #888;
}

.popup-row .value {
  font-weight: 500;
}

.popup-row .value.small { color: #27ae60; }
.popup-row .value.medium { color: #f39c12; }
.popup-row .value.large { color: #e74c3c; }
.popup-row .value.ancient { color: #9b59b6; }
.popup-row .value.radiant { color: #2ecc71; }
.popup-row .value.dire { color: #e74c3c; }

.popup-row.coords {
  font-size: 0.8rem;
  color: #666;
}

/* 野怪组合样式 */
.combinations-header {
  padding: 0.6rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
  font-weight: 600;
  font-size: 0.85rem;
  color: #aaa;
}

.combo-item {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.combo-item:last-of-type {
  border-bottom: 1px solid #333;
}

.combo-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #eee;
  margin-bottom: 0.3rem;
}

.combo-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
}

.stat-gold {
  color: #f39c12;
}

.stat-xp {
  color: #3498db;
}

/* 进化营地样式 */
.frog-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-left: 6px;
}

.evolution-header {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
  font-weight: 600;
  font-size: 0.85rem;
  color: #9b87f5;
}

.evolution-timeline {
  padding: 0.5rem 1rem;
}

.evolution-stage {
  display: flex;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.8rem;
}

.evolution-time {
  color: #888;
  min-width: 40px;
}

.evolution-name {
  color: #aaa;
}

.evolution-name.active {
  color: #9b87f5;
  font-weight: 600;
}

.evolution-status {
  padding: 0.5rem 1rem;
}

.evolution-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.85rem;
}

.evo-label {
  color: #888;
}

.evo-value {
  color: #eee;
  font-weight: 500;
}

.evo-value.highlight {
  color: #f39c12;
  font-weight: 600;
}

.evo-value.complete {
  color: #27ae60;
  font-weight: 600;
}
</style>
