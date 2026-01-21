<template>
  <div class="chart-layout">
    <!-- 左侧目录 -->
    <nav class="chart-toc">
      <div class="toc-title">目录</div>
      <ul class="toc-list">
        <li 
          v-for="item in tocItems" 
          :key="item.id" 
          :class="['toc-item', `level-${item.level}`, { active: activeId === item.id }]"
          @click="scrollToSection(item.id)"
        >
          {{ item.title }}
        </li>
      </ul>
    </nav>
    
    <!-- 右侧内容区 -->
    <main ref="contentRef" class="chart-content" @scroll="onScroll">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
export interface TocItem {
  id: string
  title: string
  level: 1 | 2 | 3
}

const props = defineProps<{
  tocItems: TocItem[]
}>()

const contentRef = ref<HTMLElement | null>(null)
const activeId = ref<string>('')
const isScrolling = ref(false)  // 防止点击滚动时触发高亮更新

// 滚动到指定区块
const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  if (el && contentRef.value) {
    // 标记正在滚动，暂停检测
    isScrolling.value = true
    activeId.value = id
    
    // 获取元素相对于内容区域的偏移
    const containerRect = contentRef.value.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const scrollTop = contentRef.value.scrollTop
    const targetTop = scrollTop + elRect.top - containerRect.top - 16
    
    contentRef.value.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    })
    
    // 滚动动画结束后恢复检测
    setTimeout(() => {
      isScrolling.value = false
    }, 600)
  }
}

// 监听滚动，高亮当前区块
const onScroll = () => {
  if (!contentRef.value || isScrolling.value) return  // 点击滚动时跳过
  
  const containerRect = contentRef.value.getBoundingClientRect()
  const containerTop = containerRect.top
  const containerHeight = containerRect.height
  let currentId = props.tocItems[0]?.id || ''
  let closestDistance = Infinity
  
  // 找到距离容器顶部最近的、已经滚动过顶部的元素
  for (const item of props.tocItems) {
    const el = document.getElementById(item.id)
    if (el) {
      const elRect = el.getBoundingClientRect()
      const relativeTop = elRect.top - containerTop
      
      // 元素顶部已经滚动到视口上半部分（距顶部 0-50% 位置）
      if (relativeTop <= containerHeight * 0.4 && relativeTop > -elRect.height) {
        const distance = Math.abs(relativeTop)
        if (distance < closestDistance) {
          closestDistance = distance
          currentId = item.id
        }
      }
    }
  }
  
  activeId.value = currentId
}

onMounted(() => {
  if (props.tocItems.length > 0) {
    activeId.value = props.tocItems[0].id
  }
})
</script>

<style scoped>
.chart-layout {
  display: flex;
  height: 100%;
  gap: 0;
}

.chart-toc {
  width: 200px;
  flex-shrink: 0;
  background: #f8fafc;
  border-right: 1px solid #e5e7eb;
  padding: 16px 0;
  position: sticky;
  top: 0;
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.toc-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0 16px 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-item {
  padding: 8px 16px;
  font-size: 0.85rem;
  color: #4b5563;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s;
}

.toc-item:hover {
  background: #f1f5f9;
  color: #1f2937;
}

.toc-item.active {
  background: #eff6ff;
  color: #2563eb;
  border-left-color: #2563eb;
  font-weight: 500;
}

/* 一级标题：加粗、加大、加上边距、深色背景 */
.toc-item.level-1 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
  background: #f1f5f9;
  margin-top: 8px;
  padding-top: 10px;
  padding-bottom: 10px;
}

.toc-item.level-1:first-child {
  margin-top: 0;
}

.toc-item.level-1:hover {
  background: #e2e8f0;
}

.toc-item.level-1.active {
  background: #dbeafe;
  color: #1d4ed8;
  border-left-color: #2563eb;
}

/* 二级标题 */
.toc-item.level-2 {
  padding-left: 28px;
  font-size: 0.8rem;
}

/* 三级标题 */
.toc-item.level-3 {
  padding-left: 40px;
  font-size: 0.75rem;
  color: #6b7280;
}

.chart-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  height: calc(100vh - 180px);
}
</style>

