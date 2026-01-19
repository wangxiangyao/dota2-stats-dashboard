<script setup lang="ts">
const navItems = [
  { path: '/', label: '首页' },
  { path: '/heroes', label: '英雄数值' },
  { path: '/abilities', label: '技能数值' },
  { path: '/ability-check', label: '技能验证' },
  { path: '/items', label: '物品数值' },
  { path: '/world', label: '世界数值' },
  { path: '/synthesis', label: '综合分析' }
]
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
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <p>Dota2 底层设计逻辑分析 | 数据来源: Dota2 Wiki / OpenDota</p>
    </footer>
  </div>
</template>
