<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 类型定义
interface BuildingStats {
  hp: number
  hpRegen?: number
  armor: number
  attackMin: number
  attackMax: number
  attackRate: number
}

interface TowerData {
  nameZh: string
  stats: BuildingStats
  goldBounty: { killer: number; team: number }
  count?: number
}

interface BuildingData {
  towers: {
    tier1: TowerData
    tier2: TowerData
    tier3: TowerData
    tier4: TowerData
  }
  barracks: {
    melee: { nameZh: string; hp: number; armor: number; hpRegen: number }
    ranged: { nameZh: string; hp: number; armor: number; hpRegen: number }
  }
  ancient: { nameZh: string; stats: BuildingStats }
  fountain: { nameZh: string; stats: BuildingStats; notes: string }
  roshan: { nameZh: string; stats: BuildingStats }
  mechanics: {
    backdoorProtection: { hpRegen: object; damageReduction: number; notes: string }
    glyph: { duration: number; cooldown: number; notes: string }
  }
}

// 状态
const buildingData = ref<BuildingData | null>(null)
const loading = ref(true)
const inputDPS = ref(200)

// 加载数据
onMounted(async () => {
  try {
    const response = await fetch('/data/world/buildings.json')
    buildingData.value = await response.json()
  } catch (error) {
    console.error('Failed to load building data:', error)
  } finally {
    loading.value = false
  }
})

// 计算有效DPS（考虑护甲减免）
const calcEffectiveDPS = (armor: number, rawDPS: number) => {
  // Dota 护甲公式: 减免 = 0.06 × 护甲 / (1 + 0.06 × |护甲|)
  const reduction = (0.06 * armor) / (1 + 0.06 * Math.abs(armor))
  return rawDPS * (1 - reduction)
}

// 计算推塔时间
const towerDestroyTimes = computed(() => {
  if (!buildingData.value) return []
  const data = buildingData.value
  
  const towers = [
    { key: 'tier1', ...data.towers.tier1 },
    { key: 'tier2', ...data.towers.tier2 },
    { key: 'tier3', ...data.towers.tier3 },
    { key: 'tier4', ...data.towers.tier4 }
  ]
  
  return towers.map(tower => {
    const armor = tower.stats.armor
    const hp = tower.stats.hp
    const effectiveDPS = calcEffectiveDPS(armor, inputDPS.value)
    const timeSeconds = hp / effectiveDPS
    
    return {
      name: tower.nameZh,
      hp,
      armor,
      dps: `${tower.stats.attackMin}-${tower.stats.attackMax}`,
      attackRate: tower.stats.attackRate,
      goldKiller: tower.goldBounty.killer,
      goldTeam: tower.goldBounty.team,
      timeSeconds: Math.round(timeSeconds * 10) / 10,
      effectiveDPS: Math.round(effectiveDPS)
    }
  })
})

// 兵营数据
const barracksData = computed(() => {
  if (!buildingData.value) return []
  const data = buildingData.value.barracks
  
  return [
    {
      name: data.melee.nameZh,
      hp: data.melee.hp,
      armor: data.melee.armor,
      hpRegen: data.melee.hpRegen,
      timeSeconds: Math.round(data.melee.hp / calcEffectiveDPS(data.melee.armor, inputDPS.value) * 10) / 10
    },
    {
      name: data.ranged.nameZh,
      hp: data.ranged.hp,
      armor: data.ranged.armor,
      hpRegen: data.ranged.hpRegen,
      timeSeconds: Math.round(data.ranged.hp / calcEffectiveDPS(data.ranged.armor, inputDPS.value) * 10) / 10
    }
  ]
})

// 格式化时间
const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}分${secs}秒`
}
</script>

<template>
  <div class="building-stats">
    <div v-if="loading" class="loading">加载中...</div>
    
    <template v-else-if="buildingData">
      <!-- DPS 输入 -->
      <div class="dps-control">
        <label>你的 DPS：</label>
        <input 
          type="number" 
          v-model.number="inputDPS" 
          min="50" 
          max="2000"
          step="50"
        >
        <span class="dps-hint">（物理伤害，用于计算推塔时间）</span>
      </div>

      <!-- 塔属性 -->
      <div class="section">
        <h4>🏰 防御塔</h4>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>塔</th>
                <th>生命</th>
                <th>护甲</th>
                <th>攻击力</th>
                <th>攻速</th>
                <th>推塔时间</th>
                <th>赏金(击杀/团队)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tower in towerDestroyTimes" :key="tower.name">
                <td>{{ tower.name }}</td>
                <td>{{ tower.hp }}</td>
                <td>{{ tower.armor }}</td>
                <td>{{ tower.dps }}</td>
                <td>{{ tower.attackRate }}s</td>
                <td class="time-cell">{{ formatTime(tower.timeSeconds) }}</td>
                <td class="gold-cell">{{ tower.goldKiller }}/{{ tower.goldTeam }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 兵营属性 -->
      <div class="section">
        <h4>🏠 兵营</h4>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>兵营</th>
                <th>生命</th>
                <th>护甲</th>
                <th>生命恢复</th>
                <th>摧毁时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="barrack in barracksData" :key="barrack.name">
                <td>{{ barrack.name }}</td>
                <td>{{ barrack.hp }}</td>
                <td>{{ barrack.armor }}</td>
                <td>{{ barrack.hpRegen }}/s</td>
                <td class="time-cell">{{ formatTime(barrack.timeSeconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 遗迹 -->
      <div class="section">
        <h4>⚔️ 遗迹</h4>
        <div class="ancient-card">
          <div class="stat-row">
            <span>生命值</span>
            <strong>{{ buildingData.ancient.stats.hp }}</strong>
          </div>
          <div class="stat-row">
            <span>护甲</span>
            <strong>{{ buildingData.ancient.stats.armor }}</strong>
          </div>
          <div class="stat-row">
            <span>生命恢复</span>
            <strong>{{ buildingData.ancient.stats.hpRegen }}/s</strong>
          </div>
          <div class="stat-row highlight">
            <span>摧毁时间</span>
            <strong>{{ formatTime(Math.round(buildingData.ancient.stats.hp / calcEffectiveDPS(buildingData.ancient.stats.armor, inputDPS) * 10) / 10) }}</strong>
          </div>
        </div>
      </div>

      <!-- 机制说明 -->
      <div class="key-info">
        <h4>📋 建筑机制</h4>
        <ul>
          <li><strong>后门保护</strong>：T2及以上塔受攻击时每秒恢复 90 HP，遗迹恢复 180 HP，并减免 50% 伤害</li>
          <li><strong>塔增益</strong>：附近每多1个敌方英雄（超过2个），塔 +3 护甲</li>
          <li><strong>防御符文</strong>：使所有建筑和兵线无敌 6 秒，CD 300 秒；T1 塔被摧毁后刷新</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.building-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.dps-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.dps-control input {
  width: 120px;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.dps-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.section h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: center;
  border-bottom: 1px solid var(--border);
}

th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.time-cell {
  color: #e74c3c;
  font-weight: 600;
}

.gold-cell {
  color: #f1c40f;
}

.ancient-card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 4px;
}

.stat-row.highlight {
  background: rgba(231, 76, 60, 0.2);
}

.stat-row span {
  color: var(--text-secondary);
}

.stat-row strong {
  color: var(--text-primary);
}

.key-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

.key-info h4 {
  margin: 0 0 0.75rem 0;
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
