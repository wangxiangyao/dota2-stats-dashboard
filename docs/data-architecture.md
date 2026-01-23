# Dota 2 数据架构设计

> 三层数据架构：数据准备 → 数据转换 → 数据应用

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                   Layer 3: 数据应用                          │
│        统计分析 | 模拟沙盘 | 视频素材 | 对外 API             │
├─────────────────────────────────────────────────────────────┤
│                   Layer 2: 数据转换                          │
│        标准数据结构（TypeScript Schema + JSON）              │
├─────────────────────────────────────────────────────────────┤
│                   Layer 1: 数据准备                          │
│        VPK提取 | 自定义游戏 | 手动标注 | 社区数据            │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: 数据准备

### 数据来源

| 来源 | 工具/方法 | 产出 |
|------|-----------|------|
| VPK 文件 | Source 2 Viewer | `npc_*.txt`, 地图图片 |
| 自定义游戏 | Lua 脚本（dota-map-coordinates） | 坐标、网格、高度数据 |
| 手动标注 | JSON 编辑 | 营地类型、技能公式 |
| 社区数据 | API 调用 | 英雄统计等（可选） |

### 现有资产

- `dota-map-coordinates/`：地图坐标提取工具
- `dota2-analysis/public/data/`：部分已处理数据

---

## Layer 2: 数据转换

### 目标目录结构

```
dist/{version}/
├── world/
│   ├── map.json           # 地图元数据
│   ├── gridnav.json       # 可行走网格
│   ├── trees.json         # 树木位置
│   ├── neutral-camps.json # 野怪营地（含类型）
│   ├── buildings.json     # 建筑（塔/遗迹/泉水）
│   └── runes.json         # 神符位置
│
├── units/
│   ├── heroes.json        # 英雄基础属性
│   ├── creeps.json        # 兵线单位
│   └── neutrals.json      # 野怪
│
├── abilities/
│   └── abilities.json     # 技能数据
│
└── items/
    └── items.json         # 物品数据
```

### Schema 定义示例

```typescript
// world/neutral-camps.ts
interface NeutralCamp {
  id: number
  x: number
  y: number
  type: 'small' | 'medium' | 'large' | 'ancient'
  side: 'radiant' | 'dire'
  possibleCreeps: string[][] // 可能刷新的野怪组合
  goldRange: [number, number]
  xpTotal: number
  respawnTime: number // 秒
}
```

---

## Layer 3: 数据应用

### 应用场景

| 应用 | 数据需求 | 项目 |
|------|----------|------|
| 交互地图 | world/* | dota2-analysis |
| 统计分析 | heroes/items/abilities | dota2-analysis |
| 视频素材 | 可视化导出 | dota2-analysis |

---

## 技术选型

| 层次 | 技术 | 理由 |
|------|------|------|
| L1 提取 | Python | 已有脚本，社区工具支持 |
| L2 转换 | Node.js + TypeScript | 类型安全，与前端共享 |
| L3 应用 | Nuxt 3 / Vue 3 | 现有项目栈 |

---

## 迁移计划（远期）

1. 创建独立数据仓库 `dota2-data`
2. 将现有脚本整合到统一流程
3. 定义完整 TypeScript Schema
4. 应用层直接消费打包后的 JSON

> 当前专注于视频内容制作，此重构计划暂缓。
