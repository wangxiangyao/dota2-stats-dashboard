# Dota2 数值分析系统 - 架构文档

## 项目概述

这是一个基于 Nuxt 3 的单页应用，用于分析 Dota2 游戏中的英雄数值、技能数据、物品数据等，通过可视化图表揭示游戏设计的底层逻辑。

## 技术栈

- **框架**: Nuxt 3 (Vue 3)
- **图表库**: ECharts (通过 vue-echarts)
- **UI组件**: Element Plus
- **语言**: TypeScript

## 项目结构

```
dota2-analysis/
├── components/
│   ├── analysis/          # 分析组件
│   │   ├── KeyLevelTable.vue     # 关键等级数值表格
│   │   ├── CurveAnalysisBox.vue  # 曲线变化分析盒子
│   │   └── AnalysisBox.vue       # 数据分析盒子
│   ├── common/            # 通用UI组件
│   │   ├── EChart.vue            # ECharts包装器
│   │   ├── LevelSlider.vue       # 等级滑块选择器
│   │   └── SummaryBox.vue        # 总结盒子
│   └── hero/              # 英雄相关组件
│       ├── charts/               # 英雄图表组件（与英雄强耦合）
│       │   ├── BarChart.vue      # 柱状图
│       │   ├── LineChart.vue     # 折线图
│       │   └── BoxplotChart.vue  # 箱线图
│       ├── Selector.vue          # 多选英雄选择器
│       ├── SingleSelect.vue      # 单选英雄选择器
│       ├── AttackRangeChart.vue  # 攻击距离图表
│       ├── AttributeGrowthChart.vue  # 属性成长图表
│       ├── AttributeScatter.vue      # 属性散点图
│       ├── BATDistributionChart.vue  # BAT分布图
│       ├── MeleeRangedCompareChart.vue # 近战远程对比图
│       ├── MoveSpeedChart.vue        # 移速分布图
│       ├── PrimaryAttrPieChart.vue   # 主属性饼图
│       └── SpeedVsRangeChart.vue     # 移速vs攻击距离散点图
├── composables/
│   ├── useDataLoader.ts    # 数据加载器
│   └── useHeroCalculator.ts # 英雄数值计算器
├── pages/
│   ├── abilities.vue       # 技能分析页（待开发）
│   ├── heroes.vue          # 英雄数值分析页
│   ├── index.vue           # 首页
│   ├── items.vue           # 物品分析页（待开发）
│   ├── synthesis.vue       # 综合分析页（待开发）
│   └── world.vue           # 世界数据页（待开发）
├── plugins/
│   └── echarts.client.ts   # ECharts客户端插件
├── public/data/            # 数据文件
│   ├── heroes.json         # 英雄基础数据
│   ├── abilities.json      # 所有技能数据（含非英雄）
│   ├── heroesAbilities.json # 英雄技能数据（过滤后）
│   └── items.json          # 物品数据
├── types/
│   └── dota.ts             # TypeScript类型定义
├── docs/                   # 文档
│   ├── ARCHITECTURE.md     # 架构文档（本文件）
│   └── ABILITY_PLAN.md     # 技能分析计划
└── nuxt.config.ts          # Nuxt配置
```

## 核心设计模式

### 1. 图表组件 + valueGetter 模式

各业务域的图表组件遵循统一的模式，通过 valueGetter 注入计算逻辑：

```vue
<!-- 英雄图表 -->
<HeroBarChart
  :heroes="heroes"
  :level="selectedLevel"
  :value-getter="calculateHP"
  title="英雄生命值排行"
  unit=" HP"
>
</HeroBarChart>

<!-- 技能图表（类似模式） -->
<AbilityBarChart
  :abilities="abilities"
  :level="selectedLevel"
  :value-getter="calculateDamage"
  title="技能伤害排行"
  unit=" 伤害"
>
</AbilityBarChart>
```

- **valueGetter**: `(item: T, level: number) => number`
- 图表组件与数据类型强耦合，但通过 valueGetter 实现计算逻辑的复用
- 不同业务域的图表组件可以独立演进，互不影响

### 2. 数据层分离

- **useDataLoader**: 负责从 JSON 文件加载数据并缓存
- **useHeroCalculator**: 提供英雄数值计算函数
- **useAbilityCalculator**: (待创建) 提供技能数值计算函数

### 3. 组件分类

| 文件夹 | 用途 | 示例 |
|--------|------|------|
| `hero/` | 英雄相关组件（含charts子文件夹） | BarChart, Selector, 各种英雄图表 |
| `ability/` | 技能相关组件（含charts子文件夹） | (待创建) |
| `item/` | 物品相关组件（含charts子文件夹） | (待创建) |
| `analysis/` | 分析组件 | KeyLevelTable, CurveAnalysisBox, AnalysisBox |
| `common/` | 通用UI组件 | LevelSlider, SummaryBox, EChart |

### 4. 类型定义

```typescript
// types/dota.ts
- Hero: 英雄数据
- Ability: 技能数据
- Item: 物品数据
- PrimaryAttribute: 主属性类型
- AttackType: 攻击类型
- HeroStats: 英雄战斗属性
```

## 数据流

```
JSON数据文件
    ↓
useDataLoader (加载并缓存)
    ↓
useHeroCalculator (数值计算)
    ↓
valueGetter (选择计算函数)
    ↓
Hero组件 (渲染图表)
```

## 图表配色方案

```typescript
const ATTRIBUTE_COLORS = {
  strength: '#e63946',    // 力量 - 红
  agility: '#2ecc71',     // 敏捷 - 绿
  intelligence: '#3498db', // 智力 - 蓝
  universal: '#9b59b6'    // 全能 - 紫
}
```

## 已完成功能

### 英雄数值分析 (pages/heroes.vue)

#### A. 生存能力
- 生命值分布与成长曲线
- 护甲分布与成长曲线
- 魔抗分布与成长曲线
- 物理EHP分布与成长曲线
- 魔法EHP分布与成长曲线

#### B. 输出能力
- 攻击力分布与成长曲线
- 攻速（BAT）分布
- 攻速分布与成长曲线
- DPS成长曲线
- DPS排行榜

#### C. 续航分析
- 魔法值分布与成长曲线
- 生命恢复分布与成长曲线
- 魔法恢复分布与成长曲线

#### D. 属性分析
- 主属性类型分布
- 近战/远程数值对比
- 属性成长分布

#### E. 其他
- 攻击距离分布
- 移动速度分布
- 移速 vs 攻击距离

#### F. 综合分析（TTK - Time To Kill）
- 被平均DPS击杀时间排行
- 被平均DPS击杀时间成长曲线（带变化分析）
- 击杀其他英雄时间排行
- 击杀其他英雄时间分布（箱线图）
- 被其他英雄击杀时间排行
- 被其他英雄击杀时间分布（箱线图）

## 待开发功能

### 技能数值分析 (pages/abilities.vue)
- 出伤效率曲线
- 技能伤害 vs 英雄生命值
- 控制效率分析
- 魔法经济分析
- 技能范围与定位

### 物品数值分析 (pages/items.vue)
- 基础属性价格
- 物品价格分布
- 特殊效果分类分析

### 综合分析 (pages/synthesis.vue)
- 数据交叉分析
- 底层逻辑抽象

## 开发规范

### 组件组织原则

**核心原则**：避免过度抽象，按功能域组织组件

每个业务域（hero/ability/item）有自己的 `charts/` 子文件夹，存放该域相关的图表组件。这些组件可能与其他域相似，但与各自的数据类型强耦合。

```
components/
├── hero/
│   ├── charts/           # 英雄专用图表
│   │   ├── BarChart.vue      # 与Hero强耦合
│   │   ├── LineChart.vue     # 与Hero强耦合
│   │   └── BoxplotChart.vue  # 与Hero强耦合
│   └── Selector.vue      # 英雄选择器
│
├── ability/              # (待创建)
│   ├── charts/           # 技能专用图表
│   │   ├── BarChart.vue      # 与Ability强耦合
│   │   └── ...
│   └── Selector.vue      # 技能选择器
│
└── item/                 # (待创建)
    ├── charts/           # 物品专用图表
    └── ...
```

### 组件命名
- 图表组件: `[Type]Chart.vue` (如 `BarChart.vue`)
- 分析组件: `[Name]Analysis.vue` 或 `[Name]Box.vue`
- 选择器: `Selector.vue` (多选) / `SingleSelect.vue` (单选)

### 代码风格
- 使用 TypeScript
- 组件使用 `<script setup>` 语法
- 优先使用 computed 进行数据计算
- 组件 props 必须定义类型

## 数据文件说明

| 文件 | 用途 | 记录数 |
|------|------|--------|
| `heroes.json` | 英雄基础数值 | ~125 |
| `abilities.json` | 所有技能（含非英雄） | ~1026 |
| `heroesAbilities.json` | 英雄技能（过滤后） | ~923 |
| `items.json` | 物品数据 | ~200+ |

## 注意事项

1. **黄点计算**: `includeBonus` 参数控制是否计算属性加成（15-22级各+2全属性）
2. **特殊英雄排除**: 部分分析需要排除特殊英雄（如美杜莎基础力量为0）
3. **客户端专用**: ECharts 相关组件必须用 `<ClientOnly>` 包裹
4. **数据缓存**: useDataLoader 使用 Map 缓存已加载的数据
