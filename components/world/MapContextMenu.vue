<script setup lang="ts">
/**
 * MapContextMenu.vue - 地图右键菜单
 */

import type { ContextMenuItem, Point } from '@/types/map'

interface Props {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}

defineProps<Props>()

const emit = defineEmits<{
  'close': []
  'select': [item: ContextMenuItem]
}>()

function handleItemClick(item: ContextMenuItem) {
  if (item.disabled) return
  item.action?.()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="context-menu-overlay"
      @click="emit('close')"
    >
      <div 
        class="context-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
        @click.stop
      >
        <div 
          v-for="(item, index) in items" 
          :key="index"
          class="menu-item"
          :class="{ disabled: item.disabled }"
          @click="handleItemClick(item)"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.context-menu {
  position: fixed;
  background: #1e2a3a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  transition: background 0.15s;
  color: #eee;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.menu-item .icon {
  font-size: 1rem;
  width: 1.5rem;
  text-align: center;
}

.menu-item .label {
  font-size: 0.9rem;
}
</style>
