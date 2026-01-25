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
      
      <!-- 野怪营地详情 -->
      <template v-if="entity.type === 'camp'">
        <div class="popup-row">
          <span class="label">类型</span>
          <span class="value" :class="entity.campType || 'unknown'">
            {{ getCampTypeName(entity.campType) }}
          </span>
        </div>
        <template v-if="getCampStats(entity.campType)">
          <div class="popup-row">
            <span class="label">💰 金币</span>
            <span class="value">{{ getCampStats(entity.campType)?.nameZh }}</span>
          </div>
        </template>
        <div class="popup-row">
          <span class="label">🔄 刷新</span>
          <span class="value">60 秒</span>
        </div>
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
</style>
