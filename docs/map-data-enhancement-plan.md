# 交互地图数据增强计划

> 近期任务：为 Dota 2 新手视频攻略完善交互地图的数据展示能力

---

## 数据现状（基于 mapdata.json 分析）

### ✅ 已有位置数据

| 实体 | 数量 | 说明 |
|------|------|------|
| npc_dota_roshan_spawner | 1 | 肉山 (2831, -2740) |
| npc_dota_watch_tower | 2 | 前哨 |
| dota_item_rune_spawner_powerup | 2 | 功能神符 |
| dota_item_rune_spawner_bounty | 2 | 赏金符 |
| npc_dota_tower | 22 | 防御塔（含详细属性） |
| ent_dota_shop | 4 | 商店（2个泉水商店 + 2个神秘商店） |
| ent_dota_fountain | 2 | 泉水 |
| npc_dota_fort | 2 | 基地遗迹 |
| npc_dota_barracks | 12 | 兵营（6近战 + 6远程） |
| npc_dota_neutral_spawner | 28 | 野怪刷新点 |
| npc_dota_filler | 14 | 普通建筑（高地塔旁） |
| trigger_multiple | 28 | 拉野区域（野怪营地范围框） |

### ✅ 已补充位置数据

| 实体 | ClassName / Prefab | 坐标 | 状态 |
|------|-------------------|------|------|
| 折磨者 (Tormentor) | `npc_dota_miniboss_spawner` | worlddata.json | ✅ 已补充 |
| 智慧神龛 (Wisdom Rune) | `npc_dota_xp_fountain` | worlddata.json | ✅ 已补充 |
| 莲花池 | `structure_fountain_of_life` | worlddata.json | ✅ 已补充 |
| 双子门 (Twin Gates) | - | worlddata.json | ✅ 已补充 |

---

## 任务清单

### ✅ Phase 1：数据准备（已完成）

#### 1.1 缺失位置手动标注

- [x] **折磨者**：2 个位置 ✅
- [x] **莲花池**：2 个位置 ✅
- [x] **智慧神龛**：2 个位置 ✅
- [x] **双子门**：2 个位置 ✅

#### 1.2 商店坐标分类 ✅

通过 `shoptype` 字段区分：
- `shoptype: "0"` → 泉水商店
- `shoptype: "2"` → 神秘商店

### ✅ Phase 2：图标渲染（已完成）

| 实体 | 图标 | 状态 | 备注 |
|------|------|------|------|
| 肉山 | `roshan` | ✅ | basePixelSize: 65 (Marker Scale) |
| 兵营 | `barracks_mid` / `barracks_side` | ✅ | 半径 250 (Physical Scale) |
| 泉水商店 | `shop_base` | ✅ | basePixelSize: 70, 金色着色 |
| 神秘商店 | `shop_secret` | ✅ | basePixelSize: 70, 金色着色 |
| 折磨者 | `pain_cube` | ✅ | 半径 300 (Physical Scale) |
| 莲花池 | `lotus_pool` | ✅ | basePixelSize: 55 (Marker Scale) |
| 智慧神龛 | `wisdom_shrine` | ✅ | 半径 220 (Physical Scale) |
| 普通建筑 | `building_base` | ✅ | 半径 180 (Physical Scale) |
| 前哨 | `outpost` | ✅ | 半径 320, 根据位置判断阵营 |
| 双子门 | `twin_gate` | ✅ | 半径 350 (Physical Scale) |
| 防御塔 | `tower_mid` / `tower_side` | ✅ | 半径 144 (Physical Scale) |
| 基地 | `ancient` | ✅ | 半径 350 (Physical Scale) |
| 赏金符 | `rune_bounty` | ✅ | Marker Scale |
| 强化符 | `rune_spot` | ✅ | Marker Scale |
| 野怪营地 | `camp_small/medium/large/ancient` | ✅ | Marker Scale (24-36) |

#### 图标尺寸策略优化 ✅

实现了两种尺寸策略：

1. **Physical Scale**（实体类）- 与世界坐标真实尺寸保持一致
   - 建筑：前哨、双子门、痛苦魔方、兵营、普通建筑、基地、防御塔、智慧神龛
   
2. **Marker Scale**（标记类）- 自适应视距，保持屏幕可读性
   - 标记：野怪营地、商店、莲花池、神符、肉山
   - 最小尺寸：28px（比树木大）
   - 最大尺寸：150px
   - 地图缩小时放大图标，地图放大时缩小图标

#### 阵营颜色修正 ✅

- 实现了 `getEntityTeam()` 辅助函数，智能判定实体阵营：
  - 优先读取 `team` / `teamnumber` 字段
  - 回退到 `MapUnitName` 名称推断（goodguys/badguys）
  - 前哨通过南北位置划分阵营
- 修复了天辉建筑（基地、兵营、普通建筑）显示为夜魇红色的问题

### Phase 3：详情浮窗补充

#### 3.1 新增详情

| 实体 | 需显示信息 |
|------|------------|
| 肉山 | 刷新时间、掉落规则、击杀奖励 |
| 折磨者 | 首刷 20:00、复活 10 分钟、A杖碎片奖励 |
| 莲花池 | 每 3 分钟 1 朵、最多 6 朵 |
| 智慧神龛 | 7:00 起每 7 分钟激活 |
| 兵营 | HP/护甲/再生、近战 vs 远程差异 |
| 商店 | 类型（泉水/神秘） |

#### 3.2 补充现有详情

| 实体 | 缺少信息 |
|------|----------|
| 功能神符 | 各类神符效果说明 |
| 赏金符 | 金钱计算公式 |
| 野怪营地 | 金钱/经验奖励 |

- [ ] **防御塔详情**：显示攻击力、护甲、攻击距离
- [ ] **野怪详情**：显示该营地可能刷新的野怪组合
  - 关联 `neutrals.json` 数据
  - 显示每种组合的金钱/经验期望
  - 显示刷新时间、堆叠时间提示
- [ ] **数据关联**：将 `npc_dota_neutral_spawner` 实体与 `neutrals.json` 中的野怪数据关联

#### 3.3 拉野区域显示

- [ ] 点击野怪营地图标时，显示该营地的拉野区域
- [ ] 使用黄色矩形框表示（数据来自 `trigger_multiple`）
- [ ] 点击其他位置时隐藏

### ✅ Phase 2.5：视野系统修正（已完成）

- [x] **一塔视野修正**：修正为只有在**夜晚**时才加 144 碰撞半径
  - 白天：1900（不加 144）
  - 夜晚：600 + 144 = 744
- [x] 更新了三处代码：
  - `InteractiveMap.vue` - drawTowerRanges（视野圈显示）
  - `useVision.ts` - 视野系统计算
  - `InteractiveMap.vue` - 雾战迷雾计算

### Phase 4：兵线模拟

- [ ] **兵线路径录入**：
  - 天辉上/中/下路路径点 (Waypoints)
  - 夜魇上/中/下路路径点
  - 关键交汇点标注
- [ ] **小兵数据透视**：
  - 关联 `creeps.json` 数据
  - 显示每波兵线的构成（近战/远程/旗手/攻城车）
  - 显示随时间的属性成长（血量、攻击、金钱、经验）
- [ ] **兵线模拟动画**：
  - 在地图上模拟兵线行进
  - 可视化交战点

### Phase 5：高级路径规划

- [ ] **多点路径规划**：
  - 支持 Shift 键连续设置多个路径点 (Waypoints)
  - 右键取消上一个点
- [ ] **Shift 队列行为模拟**：
  - 模拟 "巡逻" (Patrol)
  - 模拟 "攻击移动" (Attack Move)
  - 模拟 "跟随" (Follow)
- [ ] **路径测量**：
  - 计算多段路径的总距离
  - 估算不同移速下的总耗时
  - 可视化转弯半径（可选，模拟英雄转身速率）

---

## 数据结构增强

### 1. 野怪数据关联
需要建立 `neutral_camp_type` -> `neutrals.json` 的映射关系。
- 小野 (Small) -> kobold, forest_troll, etc.
- 中野 (Medium) -> centaur, satyr, etc.
- 大野 (Large) -> satyr_hellcaller, wildkin, etc.
- 远古 (Ancient) -> black_dragon, thunder_lizard, etc.

### 2. 兵线路径数据
需新增 `lane_paths.json`：
```json
{
  "radiant": {
    "top": [{ "x": 100, "y": 200 }, ...],
    "mid": [...],
    "bot": [...]
  },
  "dire": { ... }
}
```

## 工作量估算

| 任务 | 估算 | 实际 |
|------|------|------|
| Phase 1 数据准备 | 0.5 小时 | ✅ 已完成 |
| Phase 2 图标渲染 | 2 小时 | ✅ 已完成 |
| Phase 2.5 视野修正 | - | ✅ 0.5 小时 |
| Phase 3 详情浮窗 | 3-4 小时 | 待完成 |
| Phase 4 兵线模拟 | 4-6 小时 | 待完成 |
| Phase 5 高级路径规划 | 5-7 小时 | 待完成 |

**总计**：约 3-4 天

---

## 相关文档

- [sandbox-system-plan.md](./sandbox-system-plan.md) - 沙盘系统远期规划
- [scripts/mapdata-analysis.md](../scripts/mapdata-analysis.md) - mapdata.json 分析报告
