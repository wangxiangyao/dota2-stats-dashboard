<script setup lang="ts">
import { ref, computed } from 'vue'

// 被动工资公式（Liquipedia）：每秒1金，起始90 GPM，每分钟+2
const currentMinute = ref(10)

const passiveGold = computed(() => {
  // GPM = 90 + 2 × 分钟
  const gpm = 90 + 2 * currentMinute.value
  return {
    perSecond: gpm / 60,
    perMinute: gpm
  }
})

// 累计被动收入
const totalPassive = computed(() => {
  // 积分：从0到t分钟的 (90 + 2t) dt = 90t + t²
  const t = currentMinute.value
  return Math.round(90 * t + t * t)
})
</script>

<template>
  <div class="salary-section">
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
      <div class="formula">
        <span class="formula-label">公式：</span>
        <code>GPM = 90 + 2 × 分钟</code>
      </div>
      <div class="result">
        <span>当前 {{ currentMinute }} 分钟：</span>
        <strong>{{ passiveGold.perMinute.toFixed(0) }} 金/分钟</strong>
        <span class="sub">（{{ passiveGold.perSecond.toFixed(2) }} 金/秒）</span>
      </div>
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-title">累计被动收入</div>
        <div class="card-value gold-value">💰 {{ totalPassive }} 金</div>
        <div class="card-note">从游戏开始到 {{ currentMinute }}:00</div>
      </div>
    </div>

    <div class="key-info">
      <h4>📋 关键信息</h4>
      <ul>
        <li>游戏开始时 GPM = <strong>90</strong>（每秒 1.5 金）</li>
        <li>每分钟增加 <strong>2 金</strong> 的收入速率</li>
        <li>10分钟时 GPM = <strong>110</strong></li>
        <li>30分钟时 GPM = <strong>150</strong></li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.salary-section {
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
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.1), rgba(46, 204, 113, 0.1));
  border-radius: 8px;
  border-left: 4px solid #f1c40f;
}

.formula {
  margin-bottom: 1rem;
}

.formula-label {
  color: var(--text-secondary);
}

.formula code {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.result {
  font-size: 1.1rem;
}

.result strong {
  color: #f1c40f;
  font-size: 1.3rem;
}

.result .sub {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-left: 0.5rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.gold-value { color: #f1c40f; }

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
