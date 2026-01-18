<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const minLevel = computed(() => props.min ?? 1)
const maxLevel = computed(() => props.max ?? 30)
const label = computed(() => props.label ?? '选择等级')

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template>
  <div class="level-slider">
    <label>{{ label }}：</label>
    <input
      type="range"
      :min="minLevel"
      :max="maxLevel"
      :value="modelValue"
      @input="handleInput"
    />
    <span class="level-display">{{ modelValue }}级</span>
  </div>
</template>
