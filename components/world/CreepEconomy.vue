<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 类型定义
interface CreepBase {
  hp: number
  goldMin: number
  goldMax: number
  xp: number
  attackMin: number
  attackMax: number
}

interface CreepType {
  nameZh: string
  nameEn: string
  base: CreepBase
  perUpgrade: {
    hp: number
    attack: number
    gold: number
    xp: number
  }
  spawnPerWave: number
}

interface CreepData {
  upgradeInterval: number
  maxUpgrades: number
  spawnInterval: number
  types: {
    melee: CreepType
    ranged: CreepType
    flagbearer: CreepType
    siege: CreepType
  }
}

// 状态
const creepData = ref<CreepData | null>(null)
const currentMinute = ref(10)
const loading = ref(true)

// 加载数据
onMounted(async () => {
  try {
    const response = await fetch('/data/world/creeps.json')
    creepData.value = await response.json()
  } catch (error) {
    console.error('Failed to load creep data:', error)
  } finally {
    loading.value = false
  }
})

// 计算升级次数
const upgradeCount = computed(() => {
  if (!creepData.value) return 0
  const gameSeconds = currentMinute.value * 60
  // 第一次升级在7:30 (450秒)
  if (gameSeconds < 450) return 0
  return Math.min(
    Math.floor((gameSeconds - 450) / creepData.value.upgradeInterval) + 1,
    creepData.value.maxUpgrades
  )
})

// 计算当前小兵属性
const currentCreepStats = computed(() => {
  if (!creepData.value) return []
  const data = creepData.value
  const upgrades = upgradeCount.value
  
  const types = ['melee', 'ranged', 'flagbearer'] as const
  
  return types.map(type => {
    const creep = data.types[type]
    const base = creep.base
    const perUp = creep.perUpgrade
    
    const goldMin = base.goldMin + perUp.gold * upgrades
    const goldMax = base.goldMax + perUp.gold * upgrades
    const xp = base.xp + perUp.xp * upgrades
    const hp = base.hp + perUp.hp * upgrades
    const attackMin = base.attackMin + perUp.attack * upgrades
    const attackMax = base.attackMax + perUp.attack * upgrades
    
    return {
      type,
      nameZh: creep.nameZh,
      count: creep.spawnPerWave,
      goldMin: Math.round(goldMin),
      goldMax: Math.round(goldMax),
      goldAvg: Math.round((goldMin + goldMax) / 2),
      xp: Math.round(xp),
      hp: Math.round(hp),
      attack: `${Math.round(attackMin)}-${Math.round(attackMax)}`
    }
  })
})

// 计算攻城车属性（独立计算）
const siegeStats = computed(() => {
  if (!creepData.value) return null
  const siege = creepData.value.types.siege
  const gameSeconds = currentMinute.value * 60
  
  // 5分钟后才出现
  if (gameSeconds < 300) return null
  
  // 35分钟后每波2辆
  const count = gameSeconds >= 2100 ? 2 : 1
  
  return {
    nameZh: siege.nameZh,
    count,
    goldMin: siege.base.goldMin,
    goldMax: siege.base.goldMax,
    goldAvg: Math.round((siege.base.goldMin + siege.base.goldMax) / 2),
    xp: siege.base.xp,
    hp: siege.base.hp
  }
})

// 每波总收益
const waveTotal = computed(() => {
  if (!currentCreepStats.value.length) return { gold: 0, xp: 0 }
  
  let gold = 0
  let xp = 0
  
  currentCreepStats.value.forEach(creep => {
    gold += creep.goldAvg * creep.count
    xp += creep.xp * creep.count
  })
  
  if (siegeStats.value) {
    gold += siegeStats.value.goldAvg * siegeStats.value.count
    xp += siegeStats.value.xp * siegeStats.value.count
  }
  
  return { gold: Math.round(gold), xp: Math.round(xp) }
})

// 每分钟理论最大收益（2波兵）
const perMinuteMax = computed(() => ({
  gold: waveTotal.value.gold * 2,
  xp: waveTotal.value.xp * 2
}))
</script>

<template>
  <div class="creep-economy">
    <div v-if="loading" class="loading">加载中...</div>
    
    <template v-else-if="creepData">
      <!-- 时间控制 -->
      <div class="time-control">
        <label>游戏时间：</label>
        <input 
          type="range" 
          v-model.number="currentMinute" 
          min="0" 
          max="60" 
          step="1"
        >
        <span class="time-display">{{ currentMinute }}:00</span>
        <span class="upgrade-info">
          (升级次数: {{ upgradeCount }}/{{ creepData.maxUpgrades }})
        </span>
      </div>

      <!-- 小兵属性表格 -->
      <div class="stats-table">
        <table>
          <thead>
            <tr>
              <th>兵种</th>
              <th>数量/波</th>
              <th>金钱</th>
              <th>经验</th>
              <th>生命值</th>
              <th>攻击力</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="creep in currentCreepStats" :key="creep.type">
              <td>{{ creep.nameZh }}</td>
              <td>{{ creep.count }}</td>
              <td class="gold">{{ creep.goldMin }}-{{ creep.goldMax }}</td>
              <td class="xp">{{ creep.xp }}</td>
              <td>{{ creep.hp }}</td>
              <td>{{ creep.attack }}</td>
            </tr>
            <tr v-if="siegeStats" class="siege-row">
              <td>{{ siegeStats.nameZh }}</td>
              <td>{{ siegeStats.count }}</td>
              <td class="gold">{{ siegeStats.goldMin }}-{{ siegeStats.goldMax }}</td>
              <td class="xp">{{ siegeStats.xp }}</td>
              <td>{{ siegeStats.hp }}</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 收益汇总 -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-title">每波收益</div>
          <div class="card-values">
            <span class="gold-value">💰 {{ waveTotal.gold }} 金</span>
            <span class="xp-value">⭐ {{ waveTotal.xp }} 经验</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <div class="card-title">每分钟理论最大</div>
          <div class="card-values">
            <span class="gold-value">💰 {{ perMinuteMax.gold }} 金/分</span>
            <span class="xp-value">⭐ {{ perMinuteMax.xp }} 经验/分</span>
          </div>
          <div class="card-note">（每30秒1波，全部吃掉）</div>
        </div>
      </div>

      <!-- 关键信息 -->
      <div class="key-info">
        <h4>📋 兵线机制</h4>
        <ul>
          <li>每 <strong>30秒</strong> 刷新一波</li>
          <li>每 <strong>7.5分钟</strong> 升级一次（首次在 7:30）</li>
          <li>攻城车从 <strong>5:00</strong> 开始每 5 分钟出现</li>
          <li><strong>35:00</strong> 后每波 2 辆攻城车</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.creep-economy {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.time-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.time-control input[type="range"] {
  flex: 1;
  max-width: 300px;
}

.time-display {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
  min-width: 80px;
}

.upgrade-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.stats-table {
  overflow-x: auto;
}

.stats-table table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 0.75rem;
  text-align: center;
  border-bottom: 1px solid var(--border);
}

.stats-table th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.stats-table .gold {
  color: #f1c40f;
}

.stats-table .xp {
  color: #3498db;
}

.siege-row {
  background: rgba(230, 126, 34, 0.1);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-align: center;
}

.summary-card.highlight {
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(52, 152, 219, 0.2));
  border: 1px solid var(--primary);
}

.card-title {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.card-values {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.gold-value {
  color: #f1c40f;
}

.xp-value {
  color: #3498db;
}

.card-note {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.key-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

.key-info h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
}

.key-info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.key-info li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.key-info strong {
  color: var(--primary);
}
</style>
