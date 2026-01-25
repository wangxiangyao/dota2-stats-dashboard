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

### ❌ 缺失位置数据（已找到）

| 实体 | ClassName / Prefab | 坐标 | 来源 |
|------|-------------------|------|------|
| 折磨者 (Tormentor) | `npc_dota_miniboss_spawner` | 待提取 | vmap.txt ✅ |
| 智慧神龛 (Wisdom Rune) | `npc_dota_xp_fountain` | 待提取 | vmap.txt ✅ |
| 莲花池 Dire | `structure_fountain_of_life_dire` | (-192, 4664) | vmap.txt ✅ |
| 莲花池 Radiant | `structure_fountain_of_life_radiant` | ⚠️ 待验证 | vmap.txt |

> 莲花池是 Prefab 类型，需通过 vmap.txt 或 Hammer 提取坐标。

---

## 任务清单

### Phase 1：数据准备

#### 1.1 缺失位置手动标注

- [ ] **折磨者**：2 个位置
- [ ] **莲花池**：2 个位置
- [ ] **智慧神龛**：2 个位置

> 可从 Liquipedia 或游戏内截图获取坐标

#### 1.2 商店坐标分类

需要区分泉水商店和神秘商店（根据位置判断）：
- 泉水商店：`(6697, 6809)` 夜魇、`(-7542, -6171)` 天辉
- 神秘商店：`(4886, -1208)`、`(-5080, 1948)`

### Phase 2：图标渲染

| 实体 | 图标 | 来源 | 备注 |
|------|------|------|------|
| 肉山 | `roshan` | npc_dota_roshan_spawner | ✅ 有坐标 |
| 兵营 | `barracks_melee` / `barracks_ranged` | npc_dota_barracks | ✅ 区分近战/远程 |
| 泉水商店 | `shop_home` | ent_dota_shop | ✅ 按位置区分 |
| 神秘商店 | `shop_secret` | ent_dota_shop | ✅ 按位置区分 |
| 折磨者 | `tormentor` | 手动标注 | Phase 1 完成后 |
| 莲花池 | `lotus_pool` | 手动标注 | Phase 1 完成后 |
| 智慧神龛 | `wisdom_rune` | 手动标注 | Phase 1 完成后 |
| 普通建筑 | `filler_building` | npc_dota_filler | ✅ 有坐标 |

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

#### 3.3 拉野区域显示

- [ ] 点击野怪营地图标时，显示该营地的拉野区域
- [ ] 使用黄色矩形框表示（数据来自 `trigger_multiple`）
- [ ] 点击其他位置时隐藏

### Phase 4：前哨视野功能

- [ ] **图标显示**：使用前哨图标，区分天辉/夜魇
- [ ] **右键菜单**：添加「占领」/「放弃」选项
- [ ] **视野效果**：
  - 占领后提供视野（白天/夜间范围不同）
  - 视野纳入阵营战争迷雾计算
- [ ] **阵营区分**：天辉/夜魇占领状态

### Phase 5：多点路径规划

- [ ] **多节点路径**：支持设置多个 waypoint
- [ ] **节点操作**：点击添加、右键删除
- [ ] **路径计算**：相邻节点 A* 寻路
- [ ] **时间计算**：移速输入 + 总距离 + 总时间

---

## 工作量估算

| 任务 | 工作量 |
|------|--------|
| Phase 1 新增图标 | 2 小时 |
| Phase 2 手动标注 | 0.5 小时 |
| Phase 3 详情浮窗 | 3-4 小时 |
| Phase 4 前哨视野 | 2-3 小时 |
| Phase 5 多点路径 | 3-4 小时 |

**总计**：约 1.5-2 天

---

## 相关文档

- [sandbox-system-plan.md](./sandbox-system-plan.md) - 沙盘系统远期规划
- [scripts/mapdata-analysis.md](../scripts/mapdata-analysis.md) - mapdata.json 分析报告
