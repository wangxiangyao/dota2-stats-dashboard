# 世界数据分析模块实现计划

## 概述
新建 `/pages/world/index.vue` 页面，使用统一的 ChartLayout 布局，包含 7 个分析维度。

---

## 1. 地图与移速

### 功能描述
交互式地图寻路计算器：用户在 Dota 地图上点击两个点，自动计算路径并显示移动时间。

### 技术方案

#### 数据来源
- **dota-map-coordinates** (GitHub) - 提供 `gridnavdata.json`

#### 实现步骤
1. **数据获取**：使用 dota-map-coordinates 生成 gridnavdata.json
2. **地图渲染**：Canvas 渲染地图底图 + 网格叠加层
3. **交互逻辑**：点击设置起点/终点
4. **寻路算法**：A* 算法计算最短路径
5. **时间计算**：路径长度(单位) ÷ 移速 = 时间

#### 参考资源
- [devilesk/dota-interactive-map](https://github.com/devilesk/dota-interactive-map) - 交互式地图参考
- [dota-map-coordinates](https://github.com/devilesk/dota-map-coordinates) - NavMesh 数据提取

### 展示形式
- 地图背景 + 可行走区域可视化
- 点击两点显示路径线
- 移速输入框 + 时间计算结果
- 支持拖拽调整起点/终点

---

## 2. 兵线金钱与经验

### 数据来源
从 VPK 提取：`scripts/npc/npc_units.txt`
- 包含所有兵线单位：`npc_dota_creep_*`
- 字段：`BountyGoldMin`, `BountyGoldMax`, `BountyXP`, `StatusHealth`, `AttackDamageMin/Max` 等

### 数据结构
```json
{
  "melee_creep": {
    "nameZh": "近战小兵",
    "baseGold": 42,
    "goldPerMin": 0.14,
    "baseXP": 57,
    "xpPerMin": 0.09,
    "spawnCount": 3,
    "hp": 550,
    "hpPerMin": 8,
    "damage": [21, 23],
    "damagePerMin": 0.5
  },
  "ranged_creep": { ... },
  "siege_creep": { ... },
  "super_creep": { ... }
}
```

### 展示形式
- **时间轴滑块**：0-60 分钟，步长 1 分钟
- 显示当前分钟的：
  - 每只兵的金钱/经验
  - 一波兵总价值
  - 每分钟全收兵的理论收益
- 曲线图：金钱/经验随时间变化趋势

---

## 3. 野怪金钱与经验

### 数据来源
从 VPK 提取：`scripts/npc/npc_units.txt`
- 包含所有野怪单位：`npc_dota_neutral_*`

### 数据结构
```json
{
  "camps": {
    "small": {
      "nameZh": "小野",
      "respawnTime": 60,
      "creeps": ["kobold", "kobold_tunneler"]
    },
    "medium": { ... },
    "large": { ... },
    "ancient": { ... }
  },
  "creeps": {
    "kobold": {
      "nameZh": "狗头人",
      "baseGold": [26, 30],
      "baseXP": 20,
      "hp": 550
    }
  }
}
```

### 展示形式
- 四种营地分类展示
- 时间轴滑块联动
- 计算：每分钟刷 N 波野的理论收益

---

## 4. 建筑基本属性

### 数据来源
从 VPK 提取：`scripts/npc/npc_units.txt`
- 建筑单位：`npc_dota_tower`, `npc_dota_barracks`, `npc_dota_fort`, `npc_dota_fountain`

### 数据结构
```json
{
  "towers": {
    "tier1": { "hp": 1800, "armor": 17, "damage": [110, 110], "attackSpeed": 0.95 },
    "tier2": { "hp": 2500, "armor": 19, "damage": [196, 196] },
    "tier3": { "hp": 2500, "armor": 22, "damage": [196, 196] },
    "tier4": { "hp": 2600, "armor": 29, "damage": [330, 330] }
  },
  "barracks": {
    "melee": { "hp": 2200, "armor": 15, "hpRegen": 5 },
    "ranged": { "hp": 1300, "armor": 10, "hpRegen": 5 }
  },
  "ancient": { "hp": 4500, "armor": 15, "hpRegen": 12 },
  "fountain": { "damage": 275, "attackSpeed": 0.15, "trueStrike": true }
}
```

### 展示形式
- 表格：塔/兵营/基地对比
- 计算器：输入 DPS 计算推塔时间

---

## 5. 中立资源刷新机制

### 关注资源（数据来源：Liquipedia）
| 资源 | 刷新时间 | 奖励 |
|------|----------|------|
| 赏金符文 | 0:00 起每 **4 分钟** | `40 + 6 × ⌊游戏时间/5⌋` 金（全队每人） |
| 莲花池 | 每 **3 分钟** 生成 1 朵，最多 6 朵（共需 18 分钟填满） | 恢复莲花（生命/魔法恢复） |
| 智慧神龛 | **7:00** 起每 **7 分钟**激活（7/14/21/28...） | 站立采集经验（敌人在场暂停采集） |

### 展示形式
- 时间轴标注刷新点
- 公式展示奖励计算

---

## 6. 战略资源刷点

### 肉山（Roshan）
**数据来源**：[Liquipedia - Roshan](https://liquipedia.net/dota2/Roshan)

| 属性 | 数值 |
|------|------|
| 首次刷新 | 0:00 |
| 复活时间 | 击杀后 **8-11 分钟**（随机，玩家不可见） |
| 击杀金钱 | 击杀者 200-290 金 + 全队每人 135 金 |
| 击杀经验 | 400 + 20 × 击杀次数（附近队友分） |
| 复活位置 | 白天在西北(Dire侧)，夜晚在东南(Radiant侧) |

**掉落物规则**：
- **第 1 次**：神盾
- **第 2 次**：神盾 + 奶酪
- **第 3 次**：神盾 + 奶酪 + 肉山旗帜 或 刷新碎片（交替）

### 折磨者（Tormentor）
**数据来源**：[Liquipedia - Tormentor](https://liquipedia.net/dota2/Tormentor)

| 属性 | 数值 |
|------|------|
| 首次刷新 | **20:00** |
| 复活时间 | 击杀后 **10 分钟** |
| 位置 | 白天在西北角，夜晚在东南角 |
| 击杀奖励 | 队内最低净值且无 A 杖碎片的英雄获得 **免费 A 杖碎片** |
| 团队金钱 | 175 金（全员有碎片时额外 +280 金） |

### 展示形式
- 卡片 + 时间线

---

## 7. 总体时间轴

### 功能描述
将所有随时间变化的数据整合到一个交互式时间轴中。

### 展示形式
- **时间轴滑块**：0-60 分钟
- **面板显示**：
  - 当前分钟的兵线价值
  - 当前分钟的野怪价值
  - 即将刷新的资源
  - 建筑状态（塔是否强化）
  - 赏金符计算

---

## 文件结构

```
pages/
  world/
    index.vue              # 主页面
components/
  world/
    MapMoveSpeed.vue       # 地图与移速
    CreepEconomy.vue       # 兵线经济
    NeutralEconomy.vue     # 野怪经济
    BuildingStats.vue      # 建筑属性
    NeutralResources.vue   # 中立资源
    StrategicPoints.vue    # 战略刷点
    GlobalTimeline.vue     # 总体时间轴
public/
  data/
    world/
      creeps.json          # 兵线数据
      neutrals.json        # 野怪数据
      buildings.json       # 建筑数据
      resources.json       # 资源刷新数据
      timeline.json        # 时间轴事件
```

---

## 实施顺序

1. **数据准备**：创建 JSON 数据文件
2. **页面骨架**：创建 world/index.vue 和基础布局
3. **模块实现**：按 1-7 顺序逐个实现组件
4. **时间轴整合**：第 7 步整合所有数据

---
