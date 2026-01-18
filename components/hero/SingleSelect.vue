<script setup lang="ts">
import type { Hero, PrimaryAttribute } from '~/types/dota'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  modelValue: string
  excludeHeroes?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

// 过滤英雄
const filteredHeroes = computed(() => {
  if (!props.heroes) return []
  const excludeSet = new Set(props.excludeHeroes || [])
  return props.heroes.filter(h => !excludeSet.has(h.localizedName || h.name) && !excludeSet.has(h.name))
})

// 按主属性分组
const heroGroups = computed(() => {
  const groups: Record<PrimaryAttribute, Hero[]> = {
    strength: [],
    agility: [],
    intelligence: [],
    universal: []
  }

  filteredHeroes.value.forEach(hero => {
    const attr = hero.primaryAttribute
    if (groups[attr]) {
      groups[attr].push(hero)
    }
  })

  return groups
})
</script>

<template>
  <el-select
    v-model="selected"
    placeholder="请选择英雄"
    filterable
    class="hero-single-select"
  >
    <el-option-group
      v-for="(heroes, attr) in heroGroups"
      :key="attr"
      :label="`${ATTRIBUTE_NAMES[attr as PrimaryAttribute]}英雄 (${heroes.length})`"
    >
      <el-option
        v-for="hero in heroes"
        :key="hero.name"
        :label="hero.localizedName || hero.name"
        :value="hero.name"
      >
        <span :style="{ color: ATTRIBUTE_COLORS[attr as PrimaryAttribute] }">
          {{ hero.localizedName || hero.name }}
        </span>
      </el-option>
    </el-option-group>
  </el-select>
</template>

<style scoped>
.hero-single-select {
  min-width: 180px;
}
</style>
