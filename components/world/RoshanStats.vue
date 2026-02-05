<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 肉山数据
interface RoshanData {
  stats: {
    hp: number
    armor: number
    magicResist: number
    attackMin: number
    attackMax: number
    goldMin: number
    goldMax: number
    xp: number
  }
  respawn: { min: number; max: number }
  drops: {
    first: string[]
    second: string[]
    thirdPlus: string[]
  }
  goldBounty: { killer: string; team: number }
  xpBounty: string
}

const roshanData = ref<RoshanData | null>(null)
const loading = ref(true)
const killCount = ref(1)

onMounted(async () => {
  try {
    const response = await fetch('/data/world/buildings.json')
    const data = await response.json()
    roshanData.value = data.roshan
  } finally {
    loading.value = false
  }
})

// 当前掉落物
const currentDrops = computed(() => {
  if (!roshanData.value) return []
  const n = killCount.value
  if (n === 1) return roshanData.value.drops.first
  if (n === 2) return roshanData.value.drops.second
  return roshanData.value.drops.thirdPlus
})

// 格式化掉落物
const formatDrop = (drop: string) => {
  const map: Record<string, string> = {
    'aegis': '🛡️ 不朽之守护',
    'cheese': '🧀 奶酪',
    'refresher_shard|aghs_shard': '💎 刷新碎片/A杖碎片'
  }
  return map[drop] || drop
}
</script>

<template>
  <div class="roshan-section">
    <div v-if="loading" class="loading">加载中...</div>
    
    <template v-else-if="roshanData">
      <!-- 击杀次数选择 -->
      <div class="kill-control">
        <label>击杀次数：</label>
        <div class="kill-buttons">
          <button 
            v-for="n in 5" 
            :key="n"
            :class="{ active: killCount === n }"
            @click="killCount = n"
          >
            第 {{ n }} 次
          </button>
        </div>
      </div>

      <!-- 属性卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">生命值</div>
          <div class="stat-value">{{ roshanData.stats.hp }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">护甲</div>
          <div class="stat-value">{{ roshanData.stats.armor }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">魔抗</div>
          <div class="stat-value">{{ roshanData.stats.magicResist }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">攻击力</div>
          <div class="stat-value">{{ roshanData.stats.attackMin }}-{{ roshanData.stats.attackMax }}</div>
        </div>
      </div>

      <!-- 掉落物 -->
      <div class="drops-section">
        <h4>第 {{ killCount }} 次击杀掉落</h4>
        <div class="drops-list">
          <div 
            v-for="drop in currentDrops" 
            :key="drop"
            class="drop-item"
          >
            {{ formatDrop(drop) }}
          </div>
        </div>
      </div>

      <!-- 奖励 -->
      <div class="rewards-section">
        <h4>奖励</h4>
        <div class="rewards-grid">
          <div class="reward-item">
            <span class="label">击杀者金钱</span>
            <span class="value gold">{{ roshanData.goldBounty.killer }}</span>
          </div>
          <div class="reward-item">
            <span class="label">团队金钱</span>
            <span class="value gold">{{ roshanData.goldBounty.team }}</span>
          </div>
          <div class="reward-item">
            <span class="label">经验</span>
            <span class="value xp">{{ roshanData.xpBounty }}</span>
          </div>
        </div>
      </div>

      <!-- 刷新时间 -->
      <div class="respawn-info">
        <h4>刷新时间</h4>
        <div class="respawn-range">
          <span>{{ Math.floor(roshanData.respawn.min / 60) }} 分钟</span>
          <span class="separator">~</span>
          <span>{{ Math.floor(roshanData.respawn.max / 60) }} 分钟</span>
        </div>
        <p class="note">肉山被击杀后，在 8-11 分钟内随机刷新</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.roshan-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.kill-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.kill-buttons {
  display: flex;
  gap: 0.5rem;
}

.kill-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.kill-buttons button:hover {
  border-color: var(--primary);
}

.kill-buttons button.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drops-section,
.rewards-section,
.respawn-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.drops-section h4,
.rewards-section h4,
.respawn-info h4 {
  margin: 0 0 1rem 0;
}

.drops-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.drop-item {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(230, 126, 34, 0.2));
  border-radius: 8px;
  border-left: 3px solid #f1c40f;
  font-weight: 500;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.reward-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.reward-item .label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.reward-item .value {
  font-size: 1.1rem;
  font-weight: 600;
}

.reward-item .value.gold { color: #f1c40f; }
.reward-item .value.xp { color: #3498db; }

.respawn-range {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.3rem;
  font-weight: 700;
}

.respawn-range .separator {
  color: var(--text-secondary);
}

.respawn-info .note {
  margin: 1rem 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
</style>
