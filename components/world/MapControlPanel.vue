<script setup lang="ts">
/**
 * MapControlPanel.vue - 地图控制面板（精简版）
 * 
 * 明亮样式，视野功能优先，按钮组交互
 */

import type { Team, TeamView } from '@/types/map'

// Props
interface Props {
  // 日夜（显示用）
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
  showLanePaths: boolean
  creepSimEnabled: boolean
  
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

defineProps<Props>()

// Emits
const emit = defineEmits<{
  // 图层
  'update:showTowers': [value: boolean]
  'update:showNeutralCamps': [value: boolean]
  'update:showRunes': [value: boolean]
  'update:showTrees': [value: boolean]
  'update:showNavGrid': [value: boolean]
  'update:showBuildings': [value: boolean]
  'update:showFogOfWar': [value: boolean]
  'update:showVisionCircles': [value: boolean]
  'update:showLanePaths': [value: boolean]
  'update:creepSimEnabled': [value: boolean]
  'update:moveSpeed': [value: number]
  'update:currentTeam': [value: Team]
  'update:currentView': [value: TeamView]
  'resetPath': []
  'resetZoom': []
  'resetTrees': []
  'clearWards': []
}>()

// 移速预设
const speedPresets = [300, 350, 420, 550]
</script>

<template>
  <aside class="panel">
    <!-- 视野控制（优先显示） -->
    <div class="section" v-if="visionReady">
      <h3>👁 视野</h3>
      
      <!-- 阵营选择：按钮组 -->
      <div class="control-group">
        <span class="label">阵营</span>
        <div class="btn-group team-btns">
          <button 
            class="radiant"
            :class="{ active: currentTeam === 'radiant' }"
            @click="emit('update:currentTeam', 'radiant')"
          >天辉</button>
          <button 
            class="dire"
            :class="{ active: currentTeam === 'dire' }"
            @click="emit('update:currentTeam', 'dire')"
          >夜魇</button>
        </div>
      </div>
      
      <!-- 视角选择：按钮组 -->
      <div class="control-group">
        <span class="label">视角</span>
        <div class="btn-group view-btns">
          <button 
            class="radiant"
            :class="{ active: currentView === 'radiant' }"
            @click="emit('update:currentView', 'radiant')"
          >天辉</button>
          <button 
            class="dire"
            :class="{ active: currentView === 'dire' }"
            @click="emit('update:currentView', 'dire')"
          >夜魇</button>
          <button 
            class="both"
            :class="{ active: currentView === 'both' }"
            @click="emit('update:currentView', 'both')"
          >双方</button>
        </div>
      </div>
      
      <!-- 视野图层 -->
      <div class="toggle-row">
        <label>
          <input type="checkbox" :checked="showFogOfWar" @change="emit('update:showFogOfWar', !showFogOfWar)">
          迷雾
        </label>
        <label>
          <input type="checkbox" :checked="showVisionCircles" @change="emit('update:showVisionCircles', !showVisionCircles)">
          视野圈
        </label>
      </div>
      
      <div class="info-row">
        <span>眼位: {{ wardCount }}</span>
        <span>{{ isDaytime ? '☀ 白天' : '🌙 夜晚' }}</span>
      </div>
      
      <button class="action-btn" @click="emit('clearWards')">清除眼位</button>
      <small class="hint">右键放置眼位</small>
    </div>

    <!-- 寻路控制 -->
    <div class="section">
      <h3>🚶 寻路</h3>
      
      <div class="control-group">
        <span class="label">移速</span>
        <div class="speed-presets">
          <button 
            v-for="speed in speedPresets" 
            :key="speed"
            :class="{ active: moveSpeed === speed }"
            @click="emit('update:moveSpeed', speed)"
          >{{ speed }}</button>
        </div>
      </div>
      
      <div class="info-row" v-if="hasPath">
        <span>距离: {{ pathLength }}</span>
        <span>时间: {{ formattedTime }}</span>
      </div>
      
      <div class="btn-row">
        <button class="action-btn" @click="emit('resetPath')">清除路径</button>
        <button class="action-btn" @click="emit('resetZoom')">重置视图</button>
      </div>
      <small class="hint">左键设置起点/终点</small>
    </div>

    <!-- 图层控制 -->
    <div class="section">
      <h3>🗂 图层</h3>
      <div class="layer-grid">
        <label>
          <input type="checkbox" :checked="showTowers" @change="emit('update:showTowers', !showTowers)">
          塔
        </label>
        <label>
          <input type="checkbox" :checked="showNeutralCamps" @change="emit('update:showNeutralCamps', !showNeutralCamps)">
          野怪
        </label>
        <label>
          <input type="checkbox" :checked="showRunes" @change="emit('update:showRunes', !showRunes)">
          神符
        </label>
        <label>
          <input type="checkbox" :checked="showBuildings" @change="emit('update:showBuildings', !showBuildings)">
          建筑
        </label>
        <label>
          <input type="checkbox" :checked="showTrees" @change="emit('update:showTrees', !showTrees)">
          树木
        </label>
        <label>
          <input type="checkbox" :checked="showNavGrid" @change="emit('update:showNavGrid', !showNavGrid)">
          网格
        </label>
        <label>
          <input type="checkbox" :checked="showLanePaths" @change="emit('update:showLanePaths', !showLanePaths)">
          兵线
        </label>
      </div>
    </div>

    <!-- 兵线模拟 -->
    <div class="section">
      <h3>⚔ 兵线</h3>
      <div class="toggle-row">
        <label>
          <input type="checkbox" :checked="creepSimEnabled" @change="emit('update:creepSimEnabled', !creepSimEnabled)">
          开启兵线模拟
        </label>
      </div>
      <small class="hint">拖动时间条会自动关闭</small>
    </div>

    <!-- 树木管理 -->
    <div class="section">
      <h3>🌲 树木</h3>
      <div class="info-row">
        <span>总数: {{ treeCount }}</span>
        <span>已砍: {{ destroyedTreeCount }}</span>
      </div>
      <button class="action-btn" @click="emit('resetTrees')">重置树木</button>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: 240px;
  padding: 1rem;
  background: #f8f9fa;
  overflow-y: auto;
  border-right: 1px solid #e0e0e0;
  color: #333;
}

.section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.section:last-child {
  border-bottom: none;
}

.section h3 {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: #666;
  font-weight: 600;
}

/* 控制组 */
.control-group {
  margin-bottom: 0.75rem;
}

.control-group .label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 0.25rem;
}

/* 按钮组 */
.btn-group {
  display: flex;
  gap: 0.25rem;
}

.btn-group button {
  flex: 1;
  padding: 0.4rem 0.5rem;
  font-size: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-group button:hover {
  background: #e3f2fd;
  border-color: #90caf9;
}

.btn-group button.active {
  background: #1976d2;
  border-color: #1976d2;
  color: #fff;
}

/* 阵营按钮颜色 */
.team-btns button.radiant,
.view-btns button.radiant {
  border-color: #4caf50;
}

.team-btns button.radiant:hover,
.view-btns button.radiant:hover {
  background: #e8f5e9;
  border-color: #4caf50;
}

.team-btns button.radiant.active,
.view-btns button.radiant.active {
  background: #4caf50;
  border-color: #4caf50;
  color: #fff;
}

.team-btns button.dire,
.view-btns button.dire {
  border-color: #f44336;
}

.team-btns button.dire:hover,
.view-btns button.dire:hover {
  background: #ffebee;
  border-color: #f44336;
}

.team-btns button.dire.active,
.view-btns button.dire.active {
  background: #f44336;
  border-color: #f44336;
  color: #fff;
}

.view-btns button.both {
  border-color: #9c27b0;
}

.view-btns button.both:hover {
  background: #f3e5f5;
}

.view-btns button.both.active {
  background: #9c27b0;
  border-color: #9c27b0;
  color: #fff;
}

/* 开关行 */
.toggle-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.toggle-row label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  cursor: pointer;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.5rem;
}

/* 按钮行 */
.btn-row {
  display: flex;
  gap: 0.5rem;
}

/* 操作按钮 */
.action-btn {
  flex: 1;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e3f2fd;
  border-color: #90caf9;
}

/* 图层网格 */
.layer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

.layer-grid label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  cursor: pointer;
}

/* 移速预设 */
.speed-presets {
  display: flex;
  gap: 0.25rem;
}

.speed-presets button {
  flex: 1;
  padding: 0.3rem;
  font-size: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-presets button:hover {
  background: #e3f2fd;
}

.speed-presets button.active {
  background: #1976d2;
  border-color: #1976d2;
  color: #fff;
}

/* 提示 */
.hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: #999;
}
</style>
