<template>
  <AnalysisLayout
    title="技能分析"
    subtitle="基于 293 个伤害技能的数据分析"
    :tabs="tabs"
    default-tab="damage"
  >
    <template #damage>
      <div class="analysis-section">
        <h2>伤害分布分析</h2>
        <p class="section-desc">普通技能 vs 大招的伤害对比</p>
        
        <!-- 占位内容，后续实现 -->
        <div class="placeholder-card">
          <p>📊 伤害分布直方图</p>
          <p>• 普通技能 vs 大招对比</p>
          <p>• 分位数标记（25%、50%、75%、90%）</p>
        </div>
        
        <div class="placeholder-card">
          <p>📋 按英雄属性分组</p>
          <p>• 力量 / 敏捷 / 智力 / 全能</p>
          <p>• 验证设计假设</p>
        </div>
        
        <div class="placeholder-card">
          <p>🎯 按目标类型分组</p>
          <p>• 单体技能 vs 范围技能</p>
          <p>• 范围与伤害的权衡</p>
        </div>
      </div>
    </template>
    
    <template #dps>
      <div class="analysis-section">
        <h2>出伤效率分析</h2>
        <p class="section-desc">不同时间窗口下的 DPS 对比</p>
        
        <div class="placeholder-card">
          <p>⏱️ 时间窗口 DPS</p>
          <p>• 3秒 DPS（爆发）</p>
          <p>• 10秒 DPS（团战）</p>
          <p>• 30秒 DPS（持续战斗）</p>
        </div>
        
        <div class="placeholder-card">
          <p>📈 DPS 排行榜</p>
          <p>• 按各时间窗口排序</p>
          <p>• 爆发型 vs 持续型技能</p>
        </div>
        
        <div class="placeholder-card">
          <p>🔮 CD vs 伤害散点图</p>
          <p>• X轴=CD，Y轴=单次伤害</p>
          <p>• 点大小=DPS</p>
        </div>
      </div>
    </template>
    
    <template #kill>
      <div class="analysis-section">
        <h2>击杀效率分析</h2>
        <p class="section-desc">技能伤害与英雄生命值的关系</p>
        
        <div class="placeholder-card">
          <p>💀 击杀潜力</p>
          <p>• 技能伤害 vs 英雄 HP</p>
          <p>• 不同等级的击杀效率</p>
        </div>
        
        <div class="placeholder-card">
          <p>🛡️ 考虑魔抗/护甲</p>
          <p>• 有效伤害计算</p>
          <p>• 不同伤害类型的实际效率</p>
        </div>
      </div>
    </template>
  </AnalysisLayout>
</template>

<script setup lang="ts">
const tabs = [
  { name: 'damage', label: '伤害分析' },
  { name: 'dps', label: '出伤效率' },
  { name: 'kill', label: '击杀效率' }
]
</script>

<style scoped>
.analysis-section h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.section-desc {
  margin: 0 0 24px;
  color: #6b7280;
}

.placeholder-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.placeholder-card p {
  margin: 8px 0;
  color: #374151;
}

.placeholder-card p:first-child {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
