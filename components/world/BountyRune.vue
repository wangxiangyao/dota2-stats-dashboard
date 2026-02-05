<script setup lang="ts">
import { ref, computed } from 'vue'

// 赏金神符公式（Liquipedia）
// 金钱：40 + 6 × ⌊时间/5⌋ （全队每人获得）
// 每 4 分钟刷新

const currentMinute = ref(10)

const bountyRune = computed(() => {
  const m = currentMinute.value
  // 公式：40 + 6 × floor(分钟 / 5)
  const gold = 40 + 6 * Math.floor(m / 5)
  return { gold }
})

// 到当前时间拾取的所有赏金符收益
const totalBounty = computed(() => {
  // 赏金符每 4 分钟刷新，从 0:00 开始
  const runeMinutes = []
  for (let t = 0; t <= currentMinute.value; t += 4) {
    runeMinutes.push(t)
  }
  
  // 每个赏金符的金钱
  const totalGold = runeMinutes.reduce((sum, m) => sum + (40 + 6 * Math.floor(m / 5)), 0)
  
  return {
    count: runeMinutes.length,
    gold: totalGold
  }
})
</script>

<template>
  <div class="bounty-section">
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
    </div>

    <div class="formula-box">
      <div class="formula-row">
        <span class="formula-label">公式：</span>
        <code>40 + 6 × ⌊分钟/5⌋</code>
        <span class="result gold-value">= {{ bountyRune.gold }} 金/人</span>
      </div>
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-title">累计赏金符收益（每人）</div>
        <div class="card-values">
          <span class="gold-value">💰 {{ totalBounty.gold }} 金</span>
        </div>
        <div class="card-note">已刷新 {{ totalBounty.count }} 次</div>
      </div>
    </div>

    <div class="rune-timeline">
      <h4>刷新时间轴</h4>
      <div class="timeline">
        <div 
          v-for="t in [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40]" 
          :key="t"
          class="timeline-item"
          :class="{ passed: t <= currentMinute }"
        >
          <div class="time">{{ t }}:00</div>
          <div class="value">{{ 40 + 6 * Math.floor(t / 5) }} 金</div>
        </div>
      </div>
    </div>

    <div class="key-info">
      <h4>📋 关键信息</h4>
      <ul>
        <li>刷新位置：双方野区各 1 个</li>
        <li>刷新时间：<strong>0:00</strong> 起，每 <strong>4 分钟</strong></li>
        <li>金钱：<strong>全队每人</strong> 获得相同金额</li>
        <li>赏金符给的是 <strong>可靠金钱</strong>（不会因死亡损失）</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.bounty-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.formula-box {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.1), rgba(52, 152, 219, 0.1));
  border-radius: 8px;
  border-left: 4px solid #f1c40f;
}

.formula-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.formula-row:last-child {
  margin-bottom: 0;
}

.formula-label {
  color: var(--text-secondary);
  min-width: 4rem;
}

.formula-row code {
  font-size: 1.1rem;
  font-weight: 600;
}

.formula-row .result {
  font-size: 1.2rem;
  font-weight: 700;
}

.gold-value { color: #f1c40f; }
.xp-value { color: #3498db; }

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1.5rem;
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
  font-size: 1.2rem;
  font-weight: 600;
}

.card-note {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.rune-timeline {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.rune-timeline h4 {
  margin: 0 0 1rem 0;
}

.timeline {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.timeline-item {
  min-width: 60px;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 4px;
  text-align: center;
  opacity: 0.5;
  transition: all 0.2s;
}

.timeline-item.passed {
  opacity: 1;
  background: rgba(241, 196, 15, 0.2);
  border: 1px solid #f1c40f;
}

.timeline-item .time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.timeline-item .value {
  font-weight: 600;
  color: #f1c40f;
}

.key-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
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
