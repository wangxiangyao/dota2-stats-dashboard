<script setup lang="ts">
import type { Ability } from '~/types/dota'

const props = defineProps<{
  abilities: Ability[]
}>()

const { filterDamageAbilities, groupBySlotType } = useAbilityCalculator()

// 过滤伤害技能
const damageAbilities = computed(() => filterDamageAbilities(props.abilities))

// 按槽位分组
const slotGroups = computed(() => {
  const groups = groupBySlotType(damageAbilities.value)
  return {
    normal: groups.normal.filter(a => !a.is_ultimate),
    ultimate: groups.ultimate.filter(a => a.is_ultimate)
  }
})

// 统计数据
const stats = computed(() => ({
  total: damageAbilities.value.length,
  normal: slotGroups.value.normal.length,
  ultimate: slotGroups.value.ultimate.length
}))
</script>

<template>
  <div class="data-source-badge">
    <div class="badge-icon">📊</div>
    <div class="badge-content">
      <div class="badge-title">数据来源：主动伤害技能</div>
      <div class="badge-detail">
        已排除被动技能和非伤害技能
        <span class="divider">|</span>
        总计 <strong>{{ stats.total }}</strong> 个技能
        <span class="divider">|</span>
        普通伤害技能 <strong class="normal">{{ stats.normal }}</strong> 个
        <span class="divider">|</span>
        伤害型大招 <strong class="ultimate">{{ stats.ultimate }}</strong> 个
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-source-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  padding: 16px 20px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  margin-bottom: 20px;
}

.badge-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.badge-content {
  flex: 1;
}

.badge-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.95;
}

.badge-detail {
  font-size: 13px;
  opacity: 0.85;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.divider {
  margin: 0 4px;
  opacity: 0.5;
}

.badge-detail strong {
  font-weight: 600;
  font-size: 14px;
}

.badge-detail strong.normal {
  color: #ffd700;
}

.badge-detail strong.ultimate {
  color: #ff6b6b;
}
</style>
