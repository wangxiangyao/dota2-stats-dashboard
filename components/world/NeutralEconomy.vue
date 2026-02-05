<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 类型定义
interface NeutralCreep {
  id: string
  hp: number
  armor: number
  goldMin: number
  goldMax: number
  xp: number
}

interface NeutralCamp {
  nameZh: string
  nameEn: string
  creeps: Record<string, NeutralCreep>
}

interface NeutralsData {
  respawnTime: number
  firstSpawn: number
  stackingWindow: string
  camps: Record<string, NeutralCamp>
}

// 状态
const neutralsData = ref<NeutralsData | null>(null)
const loading = ref(true)
const selectedCampType = ref<string>('all')

// 加载数据
onMounted(async () => {
  try {
    const response = await fetch('/data/world/neutrals.json')
    neutralsData.value = await response.json()
  } finally {
    loading.value = false
  }
})

// 计算每个营地收益
const campStats = computed(() => {
  if (!neutralsData.value) return []
  
  const camps = neutralsData.value.camps
  const results: Array<{
    type: string
    nameZh: string
    creepCount: number
    goldMin: number
    goldMax: number
    goldAvg: number
    xp: number
    difficulty: number
  }> = []
  
  for (const [type, camp] of Object.entries(camps)) {
    if (selectedCampType.value !== 'all' && type !== selectedCampType.value) continue
    
    const creeps = Object.values(camp.creeps)
    const goldMin = creeps.reduce((sum, c) => sum + c.goldMin, 0)
    const goldMax = creeps.reduce((sum, c) => sum + c.goldMax, 0)
    const xp = creeps.reduce((sum, c) => sum + c.xp, 0)
    const avgHp = creeps.reduce((sum, c) => sum + c.hp, 0) / creeps.length
    
    results.push({
      type,
      nameZh: camp.nameZh,
      creepCount: creeps.length,
      goldMin,
      goldMax,
      goldAvg: Math.round((goldMin + goldMax) / 2),
      xp,
      difficulty: Math.round(avgHp / 100)
    })
  }
  
  return results.sort((a, b) => a.difficulty - b.difficulty)
})

// 叠野收益计算
const stackMultiplier = ref(1)
const stackedRewards = computed(() => {
  const total = campStats.value.reduce((sum, c) => ({
    gold: sum.gold + c.goldAvg,
    xp: sum.xp + c.xp
  }), { gold: 0, xp: 0 })
  
  return {
    gold: Math.round(total.gold * stackMultiplier.value / campStats.value.length),
    xp: Math.round(total.xp * stackMultiplier.value / campStats.value.length)
  }
})

// 每分钟最大收益（假设所有营地都能刷）
const perMinuteMax = computed(() => {
  const total = campStats.value.reduce((sum, c) => ({
    gold: sum.gold + c.goldAvg,
    xp: sum.xp + c.xp
  }), { gold: 0, xp: 0 })
  
  return {
    gold: Math.round(total.gold),
    xp: Math.round(total.xp)
  }
})
</script>

<template>
  <div class="neutral-economy">
    <div v-if="loading" class="loading">加载中...</div>
    
    <template v-else-if="neutralsData">
      <!-- 筛选控制 -->
      <div class="filter-control">
        <label>营地类型：</label>
        <select v-model="selectedCampType">
          <option value="all">全部</option>
          <option value="small">小野</option>
          <option value="medium">中野</option>
          <option value="large">大野</option>
          <option value="ancient">远古野</option>
        </select>
        <span class="respawn-info">
          刷新时间：每 {{ neutralsData.respawnTime }} 秒
        </span>
      </div>

      <!-- 营地收益表 -->
      <div class="stats-table">
        <table>
          <thead>
            <tr>
              <th>营地</th>
              <th>怪物数</th>
              <th>金钱</th>
              <th>经验</th>
              <th>难度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="camp in campStats" :key="camp.type">
              <td class="camp-name">{{ camp.nameZh }}</td>
              <td>{{ camp.creepCount }}</td>
              <td class="gold">{{ camp.goldMin }}-{{ camp.goldMax }}</td>
              <td class="xp">{{ camp.xp }}</td>
              <td>{{ '⭐'.repeat(Math.min(camp.difficulty, 5)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 叠野计算器 -->
      <div class="stack-calculator">
        <h4>叠野收益</h4>
        <div class="stack-control">
          <label>叠野层数：</label>
          <input 
            type="range" 
            v-model.number="stackMultiplier" 
            min="1" 
            max="5" 
            step="1"
          >
          <span class="stack-display">{{ stackMultiplier }} 层</span>
        </div>
        <div class="stack-result">
          <span class="gold-value">💰 {{ stackedRewards.gold }} 金（平均/营）</span>
          <span class="xp-value">✨ {{ stackedRewards.xp }} 经验（平均/营）</span>
        </div>
      </div>

      <!-- 收益汇总 -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-title">每分钟理论最大收益</div>
          <div class="card-values">
            <span class="gold-value">💰 {{ perMinuteMax.gold }} 金</span>
            <span class="xp-value">✨ {{ perMinuteMax.xp }} 经验</span>
          </div>
          <div class="card-note">（假设清完所有营地）</div>
        </div>
      </div>

      <!-- 关键信息 -->
      <div class="key-info">
        <h4>📋 关键信息</h4>
        <ul>
          <li>野怪从 <strong>1:00</strong> 开始刷新</li>
          <li>每 <strong>60 秒</strong> 刷新一次（需清空营地）</li>
          <li>叠野窗口：<strong>{{ neutralsData.stackingWindow }}</strong></li>
          <li>远古野需要更高装备和技能才能高效清理</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.neutral-economy {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.filter-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.filter-control select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
}

.respawn-info {
  margin-left: auto;
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
  padding: 0.75rem 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
}

.stats-table th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.camp-name {
  text-align: left;
  font-weight: 500;
}

.gold { color: #f1c40f; }
.xp { color: #3498db; }

.stack-calculator {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.stack-calculator h4 {
  margin: 0 0 1rem 0;
}

.stack-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stack-control input[type="range"] {
  flex: 1;
  max-width: 200px;
}

.stack-display {
  font-weight: 600;
  min-width: 4rem;
}

.stack-result {
  display: flex;
  gap: 2rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.gold-value { color: #f1c40f; }
.xp-value { color: #3498db; }

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

.card-note {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.key-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
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
