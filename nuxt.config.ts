// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@element-plus/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  // 自动导入组件 - 按功能模块组织
  components: [
    { path: '~/components/common', pathPrefix: false },
    { path: '~/components/hero', prefix: 'Hero' },
    { path: '~/components/item', prefix: 'Item' },
    { path: '~/components/ability', prefix: 'Ability' },
    { path: '~/components/analysis', prefix: 'Analysis' },
  ],

  // TypeScript配置
  typescript: {
    strict: false,
    shim: false
  },

  // Element Plus配置
  elementPlus: {
    importStyle: 'css'
  },

  // 应用配置
  app: {
    head: {
      title: 'Dota2 底层设计逻辑分析',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Dota2 数据分析与设计逻辑解析' }
      ],
      htmlAttrs: {
        lang: 'zh-CN'
      }
    }
  },

  compatibilityDate: '2024-11-01',

  // 确保 vue-echarts 和 echarts 被正确转译
  build: {
    transpile: ['echarts', 'vue-echarts', 'resize-detector', 'zrender']
  },

  // Vite 配置
  vite: {
    optimizeDeps: {
      include: ['echarts', 'vue-echarts']
    }
  }
})
