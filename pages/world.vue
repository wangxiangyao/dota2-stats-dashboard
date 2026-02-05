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

    <!-- Tab 2: 经济数据 -->
    <template #economy>
      <ChartLayout :toc-items="economyTocItems">
        <section id="economy-intro" class="chart-section">
          <h2>💰 经济数据</h2>
          <p class="section-desc">分析兵线、工资、野怪、赏金神符的金钱和经验收益。</p>
        </section>

        <section id="economy-creeps" class="chart-section">
          <h3>兵线经济</h3>
          <CreepEconomy />
        </section>

        <section id="economy-salary" class="chart-section">
          <h3>被动工资</h3>
          <PassiveSalary />
        </section>

        <section id="economy-neutrals" class="chart-section">
          <h3>野怪经济</h3>
          <NeutralEconomy />
        </section>

        <section id="economy-bounty" class="chart-section">
          <h3>赏金神符</h3>
          <BountyRune />
        </section>
      </ChartLayout>
    </template>

    <!-- Tab 3: 建筑数据 -->
    <template #buildings>
      <ChartLayout :toc-items="buildingsTocItems">
        <section id="buildings-intro" class="chart-section">
          <h2>🏰 建筑数据</h2>
          <p class="section-desc">防御塔、兵营、遗迹的属性数据和机制分析。</p>
        </section>

        <section id="buildings-towers" class="chart-section">
          <h3>防御塔</h3>
          <BuildingStats />
        </section>

        <section id="buildings-barracks" class="chart-section">
          <h3>兵营</h3>
          <p class="placeholder">组件开发中...</p>
        </section>

        <section id="buildings-ancient" class="chart-section">
          <h3>遗迹</h3>
          <p class="placeholder">组件开发中...</p>
        </section>
      </ChartLayout>
    </template>

    <!-- Tab 4: 战略资源 -->
    <template #resources>
      <ChartLayout :toc-items="resourcesTocItems">
        <section id="resources-intro" class="chart-section">
          <h2>💎 战略资源</h2>
          <p class="section-desc">肉山、折磨者、莲花池、经验神龛、强化神符等战略资源的机制和价值。</p>
        </section>

        <section id="resources-roshan" class="chart-section">
          <h3>肉山</h3>
          <RoshanStats />
        </section>

        <section id="resources-others" class="chart-section">
          <h3>其他战略资源</h3>
          <StrategicResources />
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
  { name: 'economy', label: '💰 经济数据' },
  { name: 'buildings', label: '🏰 建筑数据' },
  { name: 'resources', label: '💎 战略资源' }
]

// 各Tab的目录配置
const economyTocItems: TocItem[] = [
  { id: 'economy-intro', title: '概述', level: 1 },
  { id: 'economy-creeps', title: '兵线经济', level: 2 },
  { id: 'economy-salary', title: '被动工资', level: 2 },
  { id: 'economy-neutrals', title: '野怪经济', level: 2 },
  { id: 'economy-bounty', title: '赏金神符', level: 2 }
]

const buildingsTocItems: TocItem[] = [
  { id: 'buildings-intro', title: '概述', level: 1 },
  { id: 'buildings-towers', title: '防御塔', level: 2 },
  { id: 'buildings-barracks', title: '兵营', level: 2 },
  { id: 'buildings-ancient', title: '遗迹', level: 2 }
]

const resourcesTocItems: TocItem[] = [
  { id: 'resources-intro', title: '概述', level: 1 },
  { id: 'resources-roshan', title: '肉山', level: 2 },
  { id: 'resources-others', title: '其他战略资源', level: 2 }
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
