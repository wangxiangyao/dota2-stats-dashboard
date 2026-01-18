<script setup lang="ts">
import type { Hero, PrimaryAttribute } from '~/types/dota'
import { ATTRIBUTE_COLORS, ATTRIBUTE_NAMES } from '~/types/dota'

const props = defineProps<{
  heroes: Hero[]
  modelValue: string[]
  defaultSelectAll?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// 是否折叠
const collapsed = ref(true)

// 按属性分组
const groups = computed(() => {
  const result: Record<PrimaryAttribute, Hero[]> = {
    strength: [],
    agility: [],
    intelligence: [],
    universal: []
  }
  props.heroes.forEach(hero => {
    const attr = hero.primaryAttribute
    if (result[attr]) {
      result[attr].push(hero)
    }
  })
  return result
})

// 选中的英雄名称Set
const selectedSet = computed(() => new Set(props.modelValue))

// 选中显示文本
const selectedDisplay = computed(() => {
  const names = props.modelValue
  if (names.length === 0) return '(未选择)'
  if (names.length <= 5) return names.join(', ')
  return `${names.slice(0, 5).join(', ')} 等${names.length}个`
})

// 切换英雄选中状态
const toggleHero = (name: string) => {
  const newSet = new Set(props.modelValue)
  if (newSet.has(name)) {
    newSet.delete(name)
  } else {
    newSet.add(name)
  }
  emit('update:modelValue', Array.from(newSet))
}

// 全选某属性
const selectAll = (attr: PrimaryAttribute) => {
  const newSet = new Set(props.modelValue)
  groups.value[attr].forEach(hero => newSet.add(hero.name))
  emit('update:modelValue', Array.from(newSet))
}

// 清除某属性
const clearGroup = (attr: PrimaryAttribute) => {
  const groupNames = new Set(groups.value[attr].map(h => h.name))
  const newValue = props.modelValue.filter(name => !groupNames.has(name))
  emit('update:modelValue', newValue)
}

// 清除全部
const clearAll = () => {
  emit('update:modelValue', [])
}

// 全选所有
const selectAllHeroes = () => {
  emit('update:modelValue', props.heroes.map(h => h.name))
}

// 确认并折叠
const confirm = () => {
  collapsed.value = true
}
</script>

<template>
  <div class="hero-selector-component" :class="{ collapsed }">
    <div class="selector-header" @click="collapsed = !collapsed">
      <span class="selector-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="selector-label">选择英雄对比</span>
      <span class="selector-selected">{{ selectedDisplay }}</span>
    </div>

    <div v-show="!collapsed" class="selector-body">
      <div
        v-for="(heroList, attr) in groups"
        :key="attr"
        class="selector-group"
      >
        <div class="group-header" :style="{ borderLeftColor: ATTRIBUTE_COLORS[attr as PrimaryAttribute] }">
          <span class="group-name">{{ ATTRIBUTE_NAMES[attr as PrimaryAttribute] }}英雄 ({{ heroList.length }})</span>
          <button class="group-btn" @click.stop="selectAll(attr as PrimaryAttribute)">全选</button>
          <button class="group-btn" @click.stop="clearGroup(attr as PrimaryAttribute)">清除</button>
        </div>
        <div class="group-heroes">
          <div
            v-for="hero in heroList"
            :key="hero.name"
            class="hero-chip"
            :class="{ selected: selectedSet.has(hero.name) }"
            :style="{ '--hero-color': ATTRIBUTE_COLORS[attr as PrimaryAttribute] }"
            @click="toggleHero(hero.name)"
          >
            {{ hero.name }}
          </div>
        </div>
      </div>

      <div class="selector-actions">
        <button class="btn-select-all" @click="selectAllHeroes">全选所有</button>
        <button class="btn-clear-all" @click="clearAll">清除全部</button>
        <button class="btn-confirm" @click="confirm">确认并更新图表</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-selector-component {
  margin: 1rem 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  user-select: none;
}

.selector-header:hover {
  background: #e9ecef;
}

.collapsed .selector-header {
  border-radius: 8px;
}

.selector-icon {
  color: var(--accent-primary);
  font-size: 0.8rem;
}

.selector-label {
  font-weight: 600;
  color: var(--text-primary);
}

.selector-selected {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-left: auto;
}

.selector-body {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
}

.selector-group {
  margin-bottom: 1rem;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  margin-bottom: 0.5rem;
  border-left: 3px solid;
}

.group-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.group-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid var(--border-color);
  background: #fff;
  cursor: pointer;
  border-radius: 4px;
}

.group-btn:hover {
  background: var(--accent-primary);
  color: #fff;
  border-color: var(--accent-primary);
}

.group-heroes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.hero-chip {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}

.hero-chip:hover {
  border-color: var(--hero-color);
  background: rgba(0, 0, 0, 0.02);
}

.hero-chip.selected {
  background: var(--hero-color);
  color: #fff;
  border-color: var(--hero-color);
}

.selector-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn-select-all {
  padding: 0.5rem 1rem;
  border: 1px solid var(--accent-primary);
  background: #fff;
  color: var(--accent-primary);
  cursor: pointer;
  border-radius: 4px;
}

.btn-select-all:hover {
  background: var(--accent-primary);
  color: #fff;
}

.btn-clear-all {
  padding: 0.5rem 1rem;
  border: 1px solid #e74c3c;
  background: #fff;
  color: #e74c3c;
  cursor: pointer;
  border-radius: 4px;
}

.btn-clear-all:hover {
  background: #e74c3c;
  color: #fff;
}

.btn-confirm {
  padding: 0.5rem 1rem;
  border: none;
  background: var(--accent-primary);
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
}

.btn-confirm:hover {
  background: #2980b9;
}
</style>
