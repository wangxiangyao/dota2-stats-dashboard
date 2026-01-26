<script setup lang="ts">
/**
 * TimeBar.vue - 时间条组件
 * 
 * 放置在地图上方，日夜切换样式
 */

interface Props {
  gameTime: number
  isPlaying: boolean
  playSpeed: number
  isDaytime: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:gameTime': [value: number]
  'update:playSpeed': [value: number]
  'togglePlay': []
}>()

// 格式化游戏时间
function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="time-bar" :class="{ daytime: isDaytime, nighttime: !isDaytime }">
    <div class="time-content">
      <!-- 日夜图标 -->
      <span class="day-icon">{{ isDaytime ? '☀️' : '🌙' }}</span>
      
      <!-- 时间显示 -->
      <span class="time-display">{{ formatGameTime(gameTime) }}</span>
      
      <!-- 播放控制 -->
      <button class="play-btn" @click="emit('togglePlay')">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      
      <!-- 倍速按钮 -->
      <div class="speed-btns">
        <button 
          v-for="speed in [1, 2, 4]" 
          :key="speed"
          :class="{ active: playSpeed === speed }"
          @click="emit('update:playSpeed', speed)"
        >{{ speed }}×</button>
      </div>
      
      <!-- 时间滑块 -->
      <input 
        type="range" 
        class="time-slider" 
        :value="gameTime" 
        @input="emit('update:gameTime', Number(($event.target as HTMLInputElement).value))"
        min="0" 
        max="3600" 
        step="1"
      >
    </div>
  </div>
</template>

<style scoped>
.time-bar {
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

/* 白天样式 - 明亮金色 */
.time-bar.daytime {
  background: linear-gradient(135deg, #fff8e1 0%, #ffe082 100%);
  border: 1px solid #ffc107;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
}

/* 夜晚样式 - 深蓝紫色 */
.time-bar.nighttime {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #3f51b5;
  box-shadow: 0 2px 8px rgba(63, 81, 181, 0.3);
}

.time-bar.daytime .time-display,
.time-bar.daytime .play-btn,
.time-bar.daytime .speed-btns button {
  color: #5d4037;
}

.time-bar.nighttime .time-display,
.time-bar.nighttime .play-btn,
.time-bar.nighttime .speed-btns button {
  color: #e0e0e0;
}

.time-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.day-icon {
  font-size: 1.2rem;
}

.time-display {
  font-size: 1.1rem;
  font-weight: bold;
  font-family: 'Consolas', monospace;
  min-width: 50px;
}

.play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.2s;
}

.daytime .play-btn {
  background: #ffc107;
}

.nighttime .play-btn {
  background: #3f51b5;
}

.play-btn:hover {
  transform: scale(1.1);
}

.speed-btns {
  display: flex;
  gap: 0.25rem;
}

.speed-btns button {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.daytime .speed-btns button {
  border-color: #ffc107;
}

.daytime .speed-btns button.active {
  background: #ffc107;
  color: #5d4037;
}

.nighttime .speed-btns button {
  border-color: #3f51b5;
}

.nighttime .speed-btns button.active {
  background: #3f51b5;
  color: #fff;
}

.time-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 3px;
  outline: none;
  min-width: 150px;
}

.daytime .time-slider {
  background: #ffe082;
}

.nighttime .time-slider {
  background: #1a1a2e;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
}

.daytime .time-slider::-webkit-slider-thumb {
  background: #ff8f00;
}

.nighttime .time-slider::-webkit-slider-thumb {
  background: #7c4dff;
}
</style>
