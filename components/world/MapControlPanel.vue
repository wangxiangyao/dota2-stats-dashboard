<script setup lang="ts">
/**
 * MapControlPanel.vue - 地图控制面板
 * 
 * 包含：时间轴、图层控制、寻路控制、树木管理、视野控制
 */

import type { Team, TeamView, WardType } from '@/types/map'

// Props
interface Props {
  // 时间系统
  gameTime: number
  isPlaying: boolean
  playSpeed: number
  isDaytime: boolean
  
  // 图层控制
  showTowers: boolean
  showNeutralCamps: boolean
  showRunes: boolean
  showTrees: boolean
  showNavGrid: boolean
  showBuildings: boolean
  showFogOfWar: boolean
  showVisionCircles: boolean
  
  // 寻路
  moveSpeed: number
  pathLength: number
  formattedTime: string
  hasPath: boolean
  
  // 树木
  treeCount: number
  destroyedTreeCount: number
  
  // 视野
  currentTeam: Team
  currentView: TeamView
  wardCount: number
  visionReady: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  // 时间系统
  'update:gameTime': [value: number]
  'update:playSpeed': [value: number]
  'togglePlay': []
  // 图层
  'update:showTowers': [value: boolean]
  'update:showNeutralCamps': [value: boolean]
  'update:showRunes': [value: boolean]
  'update:showTrees': [value: boolean]
  'update:showNavGrid': [value: boolean]
  'update:showBuildings': [value: boolean]
  'update:showFogOfWar': [value: boolean]
  'update:showVisionCircles': [value: boolean]
  'update:moveSpeed': [value: number]
  'update:currentTeam': [value: Team]
  'update:currentView': [value: TeamView]
  'resetPath': []
  'resetZoom': []
  'resetTrees': []
  'clearWards': []
}>()

// 格式化游戏时间
function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 移速预设
const speedPresets = [300, 350, 420, 550]
</script>


<template>
  <aside class="panel">
    <!-- 时间轴 -->
    <div class="section time-control">
      <div class="time-header">
        <span class="day-night">{{ isDaytime ? '☀️' : '🌙' }}</span>
        <span class="time-display">{{ formatGameTime(gameTime) }}</span>
        <button class="icon-btn" @click="emit('togglePlay')">{{ isPlaying ? '⏸' : '▶' }}</button>
        <select :value="playSpeed" @change="emit('update:playSpeed', Number(($event.target as HTMLSelectElement).value))" class="speed-select">
          <option :value="1">1×</option>
          <option :value="2">2×</option>
          <option :value="4">4×</option>
        </select>
      </div>
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

    <!-- 图层控制 -->
    <div class="section">
      <h3>🗂 图层</h3>
      <div class="layer-grid">
        <label>
          <input type="checkbox" :checked="showTowers" @change="emit('update:showTowers', !showTowers)"> 
          🗼 塔
        </label>
        <label>
          <input type="checkbox" :checked="showNeutralCamps" @change="emit('update:showNeutralCamps', !showNeutralCamps)">
          🐾 野怪
        </label>
        <label>
          <input type="checkbox" :checked="showRunes" @change="emit('update:showRunes', !showRunes)">
          ✨ 神符
        </label>
        <label>
          <input type="checkbox" :checked="showBuildings" @change="emit('update:showBuildings', !showBuildings)">
          🏰 建筑
        </label>
        <label>
          <input type="checkbox" :checked="showTrees" @change="emit('update:showTrees', !showTrees)">
          🌲 树木
        </label>
        <label>
          <input type="checkbox" :checked="showNavGrid" @change="emit('update:showNavGrid', !showNavGrid)">
          📐 网格
        </label>
      </div>
    </div>

    <!-- 寻路控制 -->
    <div class="section">
      <h3>🚶 寻路</h3>
      <div class="input-row">
        <label>移速:</label>
        <input 
          type="number" 
          :value="moveSpeed" 
          @input="emit('update:moveSpeed', Number(($event.target as HTMLInputElement).value))"
          min="100" 
          max="1000" 
          step="25"
        >
      </div>
      <div class="speed-presets">
        <button 
          v-for="speed in speedPresets" 
          :key="speed"
          :class="{ active: moveSpeed === speed }"
          @click="emit('update:moveSpeed', speed)"
        >{{ speed }}</button>
      </div>
      <div class="info-row" v-if="hasPath">
        <span>距离: {{ pathLength }} 单位</span>
        <span>时间: {{ formattedTime }}</span>
      </div>
      <div class="button-row">
        <button @click="emit('resetPath')">清除路径</button>
        <button @click="emit('resetZoom')">重置视图</button>
      </div>
      <small class="hint">左键设置起点/终点</small>
    </div>

    <!-- 树木管理 -->
    <div class="section">
      <h3>🌲 树木</h3>
      <div class="info-row">
        <span>总数: {{ treeCount }}</span>
        <span>已砍: {{ destroyedTreeCount }}</span>
      </div>
      <button @click="emit('resetTrees')">重置树木</button>
    </div>

    <!-- 视野控制 -->
    <div class="section" v-if="visionReady">
      <h3>👁 视野</h3>
      
      <div class="control-row">
        <label>阵营:</label>
        <select :value="currentTeam" @change="emit('update:currentTeam', ($event.target as HTMLSelectElement).value as Team)">
          <option value="radiant">天辉</option>
          <option value="dire">夜魇</option>
        </select>
      </div>
      
      <div class="control-row">
        <label>视角:</label>
        <select :value="currentView" @change="emit('update:currentView', ($event.target as HTMLSelectElement).value as TeamView)">
          <option value="radiant">天辉视野</option>
          <option value="dire">夜魇视野</option>
          <option value="both">双方视野</option>
        </select>
      </div>
      
      <div class="layer-grid">
        <label>
          <input type="checkbox" :checked="showFogOfWar" @change="emit('update:showFogOfWar', !showFogOfWar)">
          🌫 迷雾
        </label>
        <label>
          <input type="checkbox" :checked="showVisionCircles" @change="emit('update:showVisionCircles', !showVisionCircles)">
          ⭕ 视野圈
        </label>
      </div>
      
      <div class="info-row">
        <span>眼位: {{ wardCount }}</span>
        <span>{{ isDaytime ? '☀ 白天' : '🌙 夜晚' }}</span>
      </div>
      
      <div class="button-row">
        <button @click="emit('clearWards')">清除眼位</button>
      </div>
      
      <small class="hint">右键放置眼位</small>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: 280px;
  padding: 1rem;
  background: #16213e;
  overflow-y: auto;
  border-right: 1px solid #333;
}

.section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #333;
}

.section h3 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #888;
}

.layer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.layer-grid label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.control-row label {
  min-width: 50px;
  font-size: 0.85rem;
}

.control-row select {
  flex: 1;
  padding: 0.4rem;
  background: #0f3460;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.input-row input {
  flex: 1;
  padding: 0.4rem;
  background: #0f3460;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #aaa;
  margin-bottom: 0.5rem;
}

.button-row {
  display: flex;
  gap: 0.5rem;
}

button {
  flex: 1;
  padding: 0.5rem;
  background: #0f3460;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #1a4a7a;
}

.hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #666;
}

/* 移速预设 */
.speed-presets {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.speed-presets button {
  flex: 1;
  min-width: 45px;
  padding: 0.3rem;
  font-size: 0.75rem;
}

.speed-presets button.active {
  background: #3498db;
  border-color: #3498db;
}

/* 时间轴 */
.time-control {
  padding-bottom: 0.75rem;
}

.time-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.day-night {
  font-size: 1.2rem;
}

.time-display {
  flex: 1;
  font-size: 1rem;
  font-weight: bold;
  font-family: monospace;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  font-size: 1rem;
  flex: none;
}

.speed-select {
  width: 50px;
  padding: 0.3rem;
  background: #0f3460;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
}

.time-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #333;
  border-radius: 3px;
  outline: none;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
}
</style>

