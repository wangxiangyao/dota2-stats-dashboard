<script setup lang="ts">
const route = useRoute()

const navItems = [
  { path: '/', label: '首页' },
  { path: '/heroes', label: '英雄数值' },
  { path: '/abilities', label: '技能数值' },
  { path: '/items', label: '物品数值' },
  { path: '/world', label: '世界数值' },
  { path: '/synthesis', label: '综合分析' },
  { path: '/data', label: '数据管理' },
]

// 判断导航是否激活
const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="app-container">
    <header class="site-header">
      <h1>Dota2 底层设计逻辑分析</h1>
      <nav class="site-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="{ active: isActive(item.path) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      Dota2 底层设计逻辑分析 | 数据来源: Dota2 Wiki / OpenDota
    </footer>
  </div>
</template>

<style>
/* 全局布局 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#__nuxt {
  height: 100%;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f3f4f6;
}

/* Header */
.site-header {
  flex-shrink: 0;
  padding: 12px 20px;
  background: #1f2937;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.site-header h1 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.site-nav {
  display: flex;
  gap: 4px;
}

.site-nav a {
  padding: 6px 12px;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.85rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.site-nav a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.site-nav a.active {
  color: #fff;
  background: #3b82f6;
}

/* Main - 占满剩余高度，本身不滚动，限制最大宽度 */
.site-main {
  flex: 1;
  overflow: hidden;
  background: #fff;
  max-width: 1400px;
  width: 100%;
  margin: 10px auto;
  border-radius: 8px;
}

/* Footer - 吸底，小字 */
.site-footer {
  flex-shrink: 0;
  height: 20px;
  line-height: 20px;
  font-size: 0.7rem;
  color: #9ca3af;
  text-align: center;
  background: transparent;
}
</style>
