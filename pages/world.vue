<template>
  <AnalysisLayout
    title="世界数值分析"
    subtitle="分析地图、兵线、野怪、建筑等游戏世界核心数值"
    :tabs="tabs"
    default-tab="map"
  >
    <!-- Tab 1: 互动地图 -->
    <template #map>
      <div class="interactive-map-container">
        <WorldInteractiveMap />
      </div>
    </template>

    <!-- Tab 2: 兵线经济 -->
    <template #creeps>
      <ChartLayout :toc-items="creepsTocItems">
        <section id="creeps-intro" class="chart-section">
          <h2>🏃 兵线经济</h2>
          <p class="section-desc">分析兵线的金钱和经验价值随时间的变化，揭示游戏经济曲线。</p>
        </section>

        <section id="creeps-timeline" class="chart-section">
          <h3>经济时间轴</h3>
          <WorldCreepEconomy />
        </section>
      </ChartLayout>
    </template>

    <!-- Tab 3: 野怪经济 -->
    <template #neutrals>
      <ChartLayout :toc-items="neutralsTocItems">
        <section id="neutrals-intro" class="chart-section">
          <h2>🐺 野怪经济</h2>
          <p class="section-desc">分析野怪营地的金钱和经验价值，帮助理解刷野效率。</p>
        </section>

        <section id="neutrals-camps" class="chart-section">
          <h3>野怪营地</h3>
          <p class="placeholder">组件开发中...</p>
        </section>
      </ChartLayout>
    </template>

    <!-- Tab 4: 建筑属性 -->
    <template #buildings>
      <ChartLayout :toc-items="buildingsTocItems">
        <section id="buildings-intro" class="chart-section">
          <h2>🏰 建筑属性</h2>
          <p class="section-desc">分析塔、兵营、遗迹的属性，计算推塔时间。</p>
        </section>

        <section id="buildings-stats" class="chart-section">
          <h3>建筑数据</h3>
          <WorldBuildingStats />
        </section>
      </ChartLayout>
    </template>

    <!-- Tab 5: 战略资源 -->
    <template #resources>
      <ChartLayout :toc-items="resourcesTocItems">
        <section id="resources-intro" class="chart-section">
          <h2>💎 战略资源</h2>
          <p class="section-desc">分析肉山、折磨者、赏金符、智慧神龛等战略资源的刷新机制和价值。</p>
        </section>

        <section id="resources-runes" class="chart-section">
          <h3>资源刷新</h3>
          <p class="placeholder">组件开发中...</p>
        </section>
      </ChartLayout>
    </template>

    <!-- Tab 6: 总体时间轴 -->
    <template #timeline>
      <ChartLayout :toc-items="timelineTocItems">
        <section id="timeline-intro" class="chart-section">
          <h2>⏱️ 总体时间轴</h2>
          <p class="section-desc">将所有随时间变化的数据整合到一个交互式时间轴中。</p>
        </section>

        <section id="timeline-view" class="chart-section">
          <h3>时间轴视图</h3>
          <p class="placeholder">组件开发中...</p>
        </section>
      </ChartLayout>
    </template>
  </AnalysisLayout>
</template>

<script setup lang="ts">
import type { TocItem } from '~/components/chart/Layout.vue'
import WorldInteractiveMap from '@/components/world/InteractiveMap.vue'

// Tab配置
const tabs = [
  { name: 'map', label: '🗺️ 互动地图' },
  { name: 'creeps', label: '🏃 兵线经济' },
  { name: 'neutrals', label: '🐺 野怪经济' },
  { name: 'buildings', label: '🏰 建筑属性' },
  { name: 'resources', label: '💎 战略资源' },
  { name: 'timeline', label: '⏱️ 总体时间轴' }
]

// 各Tab的目录配置
const mapTocItems: TocItem[] = [
  { id: 'map-intro', title: '概述', level: 1 },
  { id: 'map-pathfinder', title: '寻路计算器', level: 2 }
]

const creepsTocItems: TocItem[] = [
  { id: 'creeps-intro', title: '概述', level: 1 },
  { id: 'creeps-timeline', title: '经济时间轴', level: 2 }
]

const neutralsTocItems: TocItem[] = [
  { id: 'neutrals-intro', title: '概述', level: 1 },
  { id: 'neutrals-camps', title: '野怪营地', level: 2 }
]

const buildingsTocItems: TocItem[] = [
  { id: 'buildings-intro', title: '概述', level: 1 },
  { id: 'buildings-stats', title: '建筑数据', level: 2 }
]

const resourcesTocItems: TocItem[] = [
  { id: 'resources-intro', title: '概述', level: 1 },
  { id: 'resources-runes', title: '资源刷新', level: 2 }
]

const timelineTocItems: TocItem[] = [
  { id: 'timeline-intro', title: '概述', level: 1 },
  { id: 'timeline-view', title: '时间轴视图', level: 2 }
]
</script>

<style scoped>
.chart-section {
  margin-bottom: 2rem;
}

.chart-section h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.chart-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #374151;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-desc {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

.placeholder {
  color: #9ca3af;
  text-align: center;
  padding: 3rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.interactive-map-container {
  display: grid;
  grid-template-rows: 1fr;
  height: 100%;
  min-height: 0;
}
</style>
