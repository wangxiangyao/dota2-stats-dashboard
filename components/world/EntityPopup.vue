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

// 塔等级
function getTowerTier(name: string | undefined): string {
  if (!name) return '未知'
  if (name.includes('tower1')) return '一塔'
  if (name.includes('tower2')) return '二塔'
  if (name.includes('tower3')) return '高地塔'
  if (name.includes('tower4')) return '门塔'
  return '未知'
}

// 阵营名称
function getTeamName(team: number | undefined): string {
  if (team === 2) return '天辉'
  if (team === 3) return '夜魇'
  return '中立'
}

// 营地金币（基于类型的估算）
function getCampGold(type: string | null | undefined): string {
  const goldRange: Record<string, string> = {
    small: '75-95',
    medium: '95-125',
    large: '140-180',
    ancient: '170-220'
  }
  return type ? goldRange[type] || '-' : '-'
}

// 营地经验（基于类型的估算）
function getCampXp(type: string | null | undefined): string {
  const xpValues: Record<string, string> = {
    small: '85',
    medium: '140',
    large: '185',
    ancient: '300+'
  }
  return type ? xpValues[type] || '-' : '-'
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
        <div class="popup-row" v-if="entity.campType">
          <span class="label">💰 金币</span>
          <span class="value">{{ getCampGold(entity.campType) }}</span>
        </div>
        <div class="popup-row" v-if="entity.campType">
          <span class="label">⭐ 经验</span>
          <span class="value">{{ getCampXp(entity.campType) }}</span>
        </div>
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
          <span class="value">{{ getTowerTier(entity.data.name) }}</span>
        </div>
        <div class="popup-row coords">
          <span class="label">📍</span>
          <span class="value">({{ Math.round(entity.data.x) }}, {{ Math.round(entity.data.y) }})</span>
        </div>
      </template>
      
      <!-- 泉水/遗迹/前哨详情 -->
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
