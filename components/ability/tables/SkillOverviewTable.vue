<script setup lang="ts">
import type { Ability } from '~/types/dota'

const props = defineProps<{
  abilities: Ability[]
  level?: number
}>()

const { calculateGroupStats } = useAbilityCalculator()

const level = computed(() => props.level || 1)

// 按is_ultimate字段分组
const normalAbilities = computed(() => {
  return props.abilities.filter(a => !a.is_ultimate)
})

const ultimateAbilities = computed(() => {
  return props.abilities.filter(a => a.is_ultimate)
})

// 计算统计
const normalStats = computed(() => calculateGroupStats(normalAbilities.value, level.value))
const ultimateStats = computed(() => calculateGroupStats(ultimateAbilities.value, level.value))

// 计算比例
const ratios = computed(() => {
  const n = normalStats.value
  const u = ultimateStats.value

  if (n.count === 0 || u.count === 0) {
    return { damage: '-', cooldown: '-', manaCost: '-', dps: '-', dpm: '-' }
  }

  return {
    damage: (u.avgDamage / n.avgDamage).toFixed(2),
    cooldown: (u.avgCooldown / n.avgCooldown).toFixed(2),
    manaCost: (u.avgManaCost / n.avgManaCost).toFixed(2),
    dps: (u.avgDPS / n.avgDPS).toFixed(2),
    dpm: (u.avgDPS / n.avgDPS).toFixed(2)
  }
})

// 格式化数值
const formatNumber = (num: number, decimals: number = 1): string => {
  if (num === 0) return '-'
  return num.toFixed(decimals)
}
</script>

<template>
  <div class="table-container">
    <h4>📊 普通技能 vs 大招 对比统计表</h4>
    <p class="table-desc">大招各项数值相对于普通技能的倍数关系</p>

    <el-table
      :data="[
        {
          type: '普通伤害技能',
          ...normalStats
        },
        {
          type: '伤害型大招',
          ...ultimateStats
        },
        {
          type: '大招/普通比例',
          count: '-',
          avgDamage: ratios.damage,
          avgCooldown: ratios.cooldown,
          avgManaCost: ratios.manaCost,
          avgDPS: ratios.dps,
          avgDamagePerMana: ratios.dpm
        }
      ]"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
      size="small"
    >
      <el-table-column prop="type" label="类型" width="130" />
      <el-table-column prop="count" label="技能数" width="80" align="center">
        <template #default="{ row }">
          <span v-if="typeof row.count === 'number'" class="count-badge">{{ row.count }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="avgDamage" label="平均伤害" width="90" align="right">
        <template #default="{ row }">
          <span v-if="typeof row.avgDamage === 'number'" class="damage-value">
            {{ formatNumber(row.avgDamage, 0) }}
          </span>
          <span v-else class="ratio-value">{{ row.avgDamage }}x</span>
        </template>
      </el-table-column>
      <el-table-column prop="avgCooldown" label="平均CD" width="85" align="right">
        <template #default="{ row }">
          <span v-if="typeof row.avgCooldown === 'number'">
            {{ formatNumber(row.avgCooldown, 1) }}s
          </span>
          <span v-else class="ratio-value">{{ row.avgCooldown }}x</span>
        </template>
      </el-table-column>
      <el-table-column prop="avgManaCost" label="平均蓝耗" width="85" align="right">
        <template #default="{ row }">
          <span v-if="typeof row.avgManaCost === 'number'">
            {{ formatNumber(row.avgManaCost, 0) }}
          </span>
          <span v-else class="ratio-value">{{ row.avgManaCost }}x</span>
        </template>
      </el-table-column>
      <el-table-column prop="avgDPS" label="平均DPS" width="85" align="right">
        <template #default="{ row }">
          <span v-if="typeof row.avgDPS === 'number'" class="dps-value">
            {{ formatNumber(row.avgDPS, 1) }}
          </span>
          <span v-else class="ratio-value">{{ row.avgDPS }}x</span>
        </template>
      </el-table-column>
      <el-table-column prop="avgDamagePerMana" label="平均蓝效" width="85" align="right">
        <template #default="{ row }">
          <span v-if="typeof row.avgDamagePerMana === 'number'" class="eff-value">
            {{ formatNumber(row.avgDamagePerMana, 1) }}
          </span>
          <span v-else class="ratio-value">{{ row.avgDamagePerMana }}x</span>
        </template>
      </el-table-column>
      <el-table-column prop="designLogic" label="设计逻辑">
        <template #default="{ row }">
          <span v-if="row.type === '大招/普通比例'" class="ratio-highlight">
            大招伤害约为普通技能的 <strong>{{ ratios.damage }}</strong> 倍，
            但CD约为 <strong>{{ ratios.cooldown }}</strong> 倍
          </span>
          <span v-else class="logic-placeholder">
            {{ row.type === '普通伤害技能' ? '基础技能，频繁使用' : '终极技能，长CD高伤害' }}
          </span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.table-container {
  width: 100%;
  margin-top: 20px;
}

.table-container h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.table-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.count-badge {
  display: inline-block;
  background: #409eff;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.damage-value {
  font-weight: 600;
  color: #e74c3c;
}

.dps-value {
  font-weight: 500;
  color: #27ae60;
}

.eff-value {
  font-weight: 500;
  color: #f39c12;
}

.ratio-value {
  font-weight: 600;
  color: #409eff;
}

.ratio-highlight {
  color: #409eff;
  font-size: 13px;
}

.ratio-highlight strong {
  color: #e74c3c;
  font-size: 14px;
}

.logic-placeholder {
  color: #909399;
  font-size: 12px;
}
</style>
