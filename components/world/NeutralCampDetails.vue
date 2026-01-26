<template>
  <div v-if="camp" class="camp-details-overlay" @click.self="$emit('close')">
    <div class="camp-details">
      <div class="header">
        <h3>【{{ camp.typeZh }}营地】</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      
      <!-- 进化营地特殊显示 -->
      <div v-if="camp.isFrog" class="evolution-banner">
        🌊 进化营地 - 随时间成长
      </div>
      
      <div class="info">
        <div class="info-item">
          <span class="label">刷新时间:</span>
          <span>{{ camp.respawnTime }}秒</span>
        </div>
        <div class="info-item">
          <span class="label">堆叠窗口:</span>
          <span>{{ camp.stackingWindow }}</span>
        </div>
      </div>
      
      <div class="combinations">
        <h4>可能的野怪组合</h4>
        <div 
          v-for="(combo, index) in camp.possibilities" 
          :key="combo.id"
          class="combo-card"
        >
          <div class="combo-header">
            <span class="combo-number">{{ index + 1 }}</span>
            <span class="combo-name">{{ combo.name }}</span>
          </div>
          <div class="combo-stats">
            <div class="stat">
              <span class="icon">💰</span>
              <span>{{ combo.totalGold.min }}-{{ combo.totalGold.max }}</span>
              <span class="avg">(平均{{ combo.totalGold.avg }})</span>
            </div>
            <div class="stat">
              <span class="icon">⭐</span>
              <span>{{ combo.totalXP }} 经验</span>
            </div>
          </div>
          <div class="units">
            <span 
              v-for="(unit, i) in combo.units" 
              :key="`${unit}-${i}`"
              class="unit-tag"
            >{{ formatUnitName(unit) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  camp: {
    typeZh: string
    isFrog?: boolean
    possibilities: any[]
    respawnTime: number
    stackingWindow: string
  } | null
}>()

defineEmits<{
  close: []
}>()

function formatUnitName(id: string): string {
  // 简化显示，去掉前缀
  return id.replace(/_/g, ' ')
}
</script>

<style scoped>
.camp-details-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.camp-details {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  padding: 24px;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.evolution-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  margin-bottom: 16px;
}

.info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  padding: 8px 0;
  font-size: 14px;
}

.info-item .label {
  font-weight: 600;
  margin-right: 8px;
  color: #666;
}

.combinations h4 {
  margin: 16px 0 12px;
  color: #2c3e50;
  font-size: 16px;
}

.combo-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border-left: 4px solid #3498db;
}

.combo-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.combo-number {
  background: #3498db;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
  flex-shrink: 0;
}

.combo-name {
  font-weight: 600;
  color: #2c3e50;
}

.combo-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.stat .icon {
  font-size: 16px;
}

.stat .avg {
  color: #7f8c8d;
  font-size: 12px;
}

.units {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.unit-tag {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
  border: 1px solid #ddd;
}
</style>
