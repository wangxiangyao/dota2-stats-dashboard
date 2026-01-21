<template>
  <div class="level-selector">
    <span class="level-label">{{ label }}：</span>
    <div class="level-slider-container">
      <input 
        :value="modelValue" 
        type="range" 
        :min="min" 
        :max="max" 
        step="1" 
        :class="['level-slider', themeClass]"
        @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="level-marks">
        <span 
          v-for="lvl in max - min + 1" 
          :key="lvl" 
          :class="{ active: modelValue === min + lvl - 1 }"
        >
          {{ min + lvl - 1 }}
        </span>
      </div>
    </div>
    <span class="level-value">Lv.{{ modelValue }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  label?: string
  theme?: 'normal' | 'ultimate'
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()

const themeClass = computed(() => props.theme === 'ultimate' ? 'ultimate' : '')
</script>

<style scoped>
.level-selector {
  background: white;
  padding: 14px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 16px;
  /* 吸顶效果 */
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.level-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.level-slider-container {
  flex: 1;
  max-width: 280px;
  position: relative;
}

.level-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.level-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.level-slider.ultimate::-webkit-slider-thumb {
  background: #ef4444;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
}

.level-marks {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 2px;
}

.level-marks span {
  font-size: 0.7rem;
  color: #9ca3af;
}

.level-marks span.active {
  color: #3b82f6;
  font-weight: 600;
}

.level-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
  min-width: 45px;
}

@media (max-width: 768px) {
  .level-selector {
    flex-wrap: wrap;
  }
  .level-slider-container {
    order: 3;
    width: 100%;
    max-width: none;
    margin-top: 8px;
  }
}
</style>
