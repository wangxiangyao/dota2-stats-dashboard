<script setup lang="ts">
import { ref, computed } from 'vue'

// 战略资源数据（Liquipedia 订正）
const resources = {
  tormentor: {
    nameZh: '折磨者',
    nameEn: 'Tormentor',
    firstSpawn: 1200, // 20:00 (7.35 后改为 20 分钟)
    respawn: 600,     // 10 分钟
    drop: '阿哈利姆神杖碎片',
    location: '地图两侧各一个（近己方基地）',
    notes: '反弹所有伤害，需要团队配合击杀'
  },
  lotus: {
    nameZh: '莲花池',
    nameEn: 'Lotus Pool',
    respawn: 180,    // 3 分钟
    healHp: 125,
    healMana: 125,
    location: '河道中央',
    notes: '每次恢复 125 HP/MP，共 6 朵莲花，可被敌人破坏'
  },
  wisdom: {
    nameZh: '智慧神龛',
    nameEn: 'Shrine of Wisdom',
    firstSpawn: 420, // 7:00 开始激活
    respawn: 420,    // 7 分钟
    xpFormula: '280 + 280 × ⌊时间/7⌋',
    location: '地图左右两侧边缘各一个',
    notes: '7.38版本替代了Wisdom Rune'
  },
  powerRune: {
    nameZh: '强化神符',
    nameEn: 'Power Rune',
    firstSpawn: 360, // 6:00
    respawn: 120,    // 2 分钟
    types: ['增伤', '奥术', '加速', '幻象', '隐身', '恢复', '护盾'],
    location: '河道两侧'
  }
}

const currentMinute = ref(10)

// 经验神龛当前收益（Liquipedia 公式: 280 + 280 × ⌊t/7⌋）
const wisdomXp = computed(() => {
  const firstMin = resources.wisdom.firstSpawn / 60
  if (currentMinute.value < firstMin) return { count: 0, xp: 0 }
  
  // 公式: 280 + 280 × floor(分钟 / 7)
  const xp = 280 + 280 * Math.floor(currentMinute.value / 7)
  const count = Math.floor((currentMinute.value - firstMin) / 7) + 1
  return { count, xp }
})

// 折磨者刷新次数
const tormentorSpawns = computed(() => {
  const firstMin = resources.tormentor.firstSpawn / 60
  if (currentMinute.value < firstMin) return 0
  return Math.floor((currentMinute.value - firstMin) / 10) + 1
})
</script>

<template>
  <div class="resources-grid">
    <!-- 时间控制 -->
    <div class="time-control full-width">
      <label>游戏时间：</label>
      <input 
        type="range" 
        v-model.number="currentMinute" 
        min="0" 
        max="60" 
        step="1"
      >
      <span class="time-display">{{ currentMinute }}:00</span>
    </div>

    <!-- 折磨者 -->
    <div class="resource-card tormentor">
      <h4>👹 {{ resources.tormentor.nameZh }}</h4>
      <div class="info-row">
        <span>首次刷新</span>
        <strong>{{ resources.tormentor.firstSpawn / 60 }}:00</strong>
      </div>
      <div class="info-row">
        <span>刷新间隔</span>
        <strong>{{ resources.tormentor.respawn / 60 }} 分钟</strong>
      </div>
      <div class="info-row">
        <span>已刷新次数</span>
        <strong class="highlight">{{ tormentorSpawns }} 次</strong>
      </div>
      <div class="drop-tag">🎁 {{ resources.tormentor.drop }}</div>
      <p class="note">{{ resources.tormentor.notes }}</p>
    </div>

    <!-- 莲花池 -->
    <div class="resource-card lotus">
      <h4>🪷 {{ resources.lotus.nameZh }}</h4>
      <div class="info-row">
        <span>刷新间隔</span>
        <strong>{{ resources.lotus.respawn / 60 }} 分钟</strong>
      </div>
      <div class="info-row">
        <span>恢复生命</span>
        <strong class="hp">+{{ resources.lotus.healHp }}</strong>
      </div>
      <div class="info-row">
        <span>恢复魔法</span>
        <strong class="mana">+{{ resources.lotus.healMana }}</strong>
      </div>
      <p class="note">{{ resources.lotus.notes }}</p>
    </div>

    <!-- 经验神龛 -->
    <div class="resource-card wisdom">
      <h4>📚 {{ resources.wisdom.nameZh }}</h4>
      <div class="info-row">
        <span>首次刷新</span>
        <strong>{{ resources.wisdom.firstSpawn / 60 }}:00</strong>
      </div>
      <div class="info-row">
        <span>刷新间隔</span>
        <strong>{{ resources.wisdom.respawn / 60 }} 分钟</strong>
      </div>
      <div class="info-row">
        <span>当前经验</span>
        <strong class="xp">{{ wisdomXp.xp }} XP</strong>
      </div>
      <div class="formula">{{ resources.wisdom.xpFormula }}</div>
    </div>

    <!-- 强化神符 -->
    <div class="resource-card powerrune">
      <h4>💫 {{ resources.powerRune.nameZh }}</h4>
      <div class="info-row">
        <span>首次刷新</span>
        <strong>{{ resources.powerRune.firstSpawn / 60 }}:00</strong>
      </div>
      <div class="info-row">
        <span>刷新间隔</span>
        <strong>{{ resources.powerRune.respawn / 60 }} 分钟</strong>
      </div>
      <div class="rune-types">
        <span 
          v-for="type in resources.powerRune.types" 
          :key="type"
          class="rune-type"
        >
          {{ type }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.full-width {
  grid-column: 1 / -1;
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
  font-weight: 600;
  min-width: 4rem;
}

.resource-card {
  padding: 1.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border-left: 4px solid var(--primary);
}

.resource-card.tormentor { border-left-color: #e74c3c; }
.resource-card.lotus { border-left-color: #2ecc71; }
.resource-card.wisdom { border-left-color: #3498db; }
.resource-card.powerrune { border-left-color: #9b59b6; }

.resource-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-of-type {
  border-bottom: none;
}

.info-row span {
  color: var(--text-secondary);
}

.info-row strong {
  color: var(--text-primary);
}

.info-row .highlight { color: var(--primary); }
.info-row .hp { color: #2ecc71; }
.info-row .mana { color: #3498db; }
.info-row .xp { color: #9b59b6; }

.drop-tag {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(241, 196, 15, 0.2);
  border-radius: 4px;
  font-weight: 500;
  text-align: center;
}

.formula {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  text-align: center;
}

.note {
  margin: 0.75rem 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.rune-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.rune-type {
  padding: 0.25rem 0.75rem;
  background: rgba(155, 89, 182, 0.2);
  border-radius: 12px;
  font-size: 0.85rem;
}
</style>
