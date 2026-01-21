<script setup lang="ts">
import type { DamageTraitDataMap } from '~/types/traits'

/**
 * 数据管理页面
 * 功能：整合技能/英雄/物品数据管理，使用页签切换
 */

// 当前页签
const activeTab = ref('abilities')

// 技能数据
const abilities = ref<any[]>([])
const damageTraitData = ref<DamageTraitDataMap>({})
const loading = ref(true)
const parsing = ref(false)
const parseResult = ref<{ success: boolean; message: string } | null>(null)

// 物品数据
const items = ref<any[]>([])
const itemsLoading = ref(true)

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [abilitiesData, damageData] = await Promise.all([
      $fetch<any[]>('/data/abilities/abilities.json'),
      $fetch<DamageTraitDataMap>('/api/traits/damage').catch(() => ({}))
    ])
    abilities.value = abilitiesData || []
    damageTraitData.value = damageData || {}
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

// 加载物品数据
const loadItems = async () => {
  itemsLoading.value = true
  try {
    const data = await $fetch<any[]>('/data/items/items.json')
    items.value = data || []
  } catch (e) {
    console.error('加载物品数据失败:', e)
  } finally {
    itemsLoading.value = false
  }
}

onMounted(() => {
  loadData()
  loadItems()
})

// 执行 VPK 解析
const parseVPK = async () => {
  parsing.value = true
  parseResult.value = null
  
  try {
    const result = await $fetch<{ success: boolean; message: string; output: string }>('/api/parse/abilities', {
      method: 'POST'
    })
    parseResult.value = { success: true, message: result.output || '解析完成' }
    await loadData()
  } catch (e: any) {
    parseResult.value = { success: false, message: e.data?.message || '解析失败' }
  } finally {
    parsing.value = false
  }
}

// 技能统计
const abilityStats = computed(() => {
  const total = abilities.value.length
  const passive = abilities.value.filter(a => a.isPassive).length
  const innate = abilities.value.filter(a => a.isInnate).length
  const ultimate = abilities.value.filter(a => a.isUltimate).length
  const active = total - passive - innate
  const heroes = new Set(abilities.value.map(a => a.heroName)).size
  
  return { total, active, passive, innate, ultimate, heroes }
})

// 伤害特征统计
const damageStats = computed(() => {
  const entries = Object.entries(damageTraitData.value)
  const total = entries.length
  const simpleFormula = entries.filter(([, v]) => v.formulaExpected === 'damage').length
  const complexFormula = total - simpleFormula
  const hasCustomParams = entries.filter(([, v]) => v.customParams !== null).length
  
  return { total, simpleFormula, complexFormula, hasCustomParams }
})
</script>

<template>
  <div class="data-page">
    <!-- 页签导航 -->
    <el-tabs v-model="activeTab" class="data-tabs">
      <!-- 技能页签 -->
      <el-tab-pane label="技能数据" name="abilities">
        <div class="tab-header">
          <h2>技能数据管理</h2>
          <el-button 
            type="primary" 
            size="small"
            :loading="parsing"
            @click="parseVPK"
          >
            {{ parsing ? '解析中...' : 'VPK → JSON' }}
          </el-button>
        </div>

        <!-- 解析结果提示 -->
        <el-alert
          v-if="parseResult"
          :type="parseResult.success ? 'success' : 'error'"
          :title="parseResult.success ? '解析成功' : '解析失败'"
          :description="parseResult.message"
          show-icon
          closable
          style="margin-bottom: 16px;"
          @close="parseResult = null"
        />

        <div v-if="loading" class="loading">
          <el-skeleton :rows="3" animated />
        </div>

        <template v-else>
          <!-- 统计信息 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ abilityStats.total }}</div>
              <div class="stat-label">技能总数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ abilityStats.active }}</div>
              <div class="stat-label">主动技能</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ abilityStats.passive }}</div>
              <div class="stat-label">被动技能</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ abilityStats.ultimate }}</div>
              <div class="stat-label">大招</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ abilityStats.heroes }}</div>
              <div class="stat-label">英雄数</div>
            </div>
          </div>

          <!-- 特征管理 -->
          <div class="section-title">特征管理</div>
          <div class="trait-cards">
            <NuxtLink to="/data/abilities/damage" class="trait-card">
              <div class="trait-icon">💥</div>
              <div class="trait-info">
                <div class="trait-title">伤害特征</div>
                <div class="trait-desc">管理伤害技能列表和公式配置</div>
                <div class="trait-stats">
                  <span class="trait-stat">已审核 {{ damageStats.total }}</span>
                  <span class="trait-stat">简单公式 {{ damageStats.simpleFormula }}</span>
                  <span class="trait-stat">复杂公式 {{ damageStats.complexFormula }}</span>
                </div>
              </div>
              <div class="trait-arrow">→</div>
            </NuxtLink>
            
            <div class="trait-card disabled">
              <div class="trait-icon">💫</div>
              <div class="trait-info">
                <div class="trait-title">眩晕特征</div>
                <div class="trait-desc">管理控制技能和持续时间</div>
              </div>
              <div class="trait-badge">规划中</div>
            </div>
            
            <div class="trait-card disabled">
              <div class="trait-icon">🐌</div>
              <div class="trait-info">
                <div class="trait-title">减速特征</div>
                <div class="trait-desc">管理减速技能和减速比例</div>
              </div>
              <div class="trait-badge">规划中</div>
            </div>
          </div>
        </template>
      </el-tab-pane>

      <!-- 英雄页签 -->
      <el-tab-pane label="英雄数据" name="heroes">
        <div class="placeholder">
          <div class="placeholder-icon">🦸</div>
          <div class="placeholder-text">英雄数据管理 - 开发中</div>
        </div>
      </el-tab-pane>

      <!-- 物品页签 -->
      <el-tab-pane label="物品数据" name="items">
        <ItemList
          :items="items"
          :loading="itemsLoading"
          @reload="loadItems"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.data-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.data-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
  margin: 0;
  padding: 0 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.data-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}

.data-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tab-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.loading {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 14px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 2px;
}

/* Section Title */
.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid #3b82f6;
}

/* Trait Cards */
.trait-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trait-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  position: relative;
}

.trait-card:hover:not(.disabled) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.trait-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.trait-icon {
  font-size: 1.3rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 6px;
}

.trait-info {
  flex: 1;
}

.trait-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1f2937;
  margin-bottom: 2px;
}

.trait-desc {
  font-size: 0.8rem;
  color: #6b7280;
}

.trait-stats {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.trait-stat {
  font-size: 0.7rem;
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 3px;
}

.trait-arrow {
  font-size: 1rem;
  color: #9ca3af;
}

.trait-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 0.65rem;
  padding: 2px 5px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 3px;
}

/* Placeholder */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.placeholder-text {
  font-size: 1rem;
}
</style>
