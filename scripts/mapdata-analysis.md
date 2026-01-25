# mapdata.json 实体分析报告

## 实体总览

| 实体类型 (ClassName) | 中文名称 | 数量 | 说明 |
|----------------------|----------|------|------|
| npc_dota_neutral_spawner | 野怪刷新点 | 28 | 28 个野怪营地位置 |
| npc_dota_watch_tower | 前哨 | 2 | 双方各 1 个 |
| ent_dota_fountain | 泉水 | 2 | 双方基地泉水 |
| ent_dota_tree | 树木 | 2456 | 地图上所有树木 |
| npc_dota_tower | 防御塔 | 22 | T1-T4 共 22 座塔 |
| npc_dota_healer | 治疗者(?) | 0 | ⚠️ 空数据，可能是旧版莲花池 |
| npc_dota_roshan_spawner | 肉山 | 1 | 肉山刷新点 |
| dota_item_rune_spawner_powerup | 功能神符 | 2 | 河道 2 个功能神符点 |
| dota_item_rune_spawner_bounty | 赏金符 | 2 | 野区 2 个赏金符点 |
| trigger_multiple | 触发区域 | 28 | 野怪营地拉野范围 |
| ent_dota_shop | 商店 | 4 | 2 泉水商店 + 2 神秘商店 |
| npc_dota_barracks | 兵营 | 12 | 6 近战 + 6 远程兵营 |
| npc_dota_filler | 普通建筑 | 14 | 高地塔旁的普通建筑 |
| npc_dota_fort | 基地遗迹 | 2 | 双方主基地 |

### ❌ 缺失的实体

| 目标实体 | 可能的 ClassName | 如何查找 |
|----------|------------------|----------|
| 折磨者 (Tormentor) | `npc_dota_miniboss` | 需在游戏中验证 |
| 莲花池 (Lotus Pool) | `ent_dota_lotus_pool` / 新类名 | `npc_dota_healer` 为空，可能改名了 |
| 智慧神龛 (Wisdom Rune) | `dota_item_rune_spawner_xp` | 需在游戏中验证 |


---

## npc_dota_roshan_spawner (肉山刷新点)

```json
[
  {
    "bounds": [
      0,
      0
    ],
    "x": 2831,
    "y": -2740,
    "team": 0
  }
]
```

## npc_dota_watch_tower (前哨)

```json
[
  {
    "bat": 0,
    "x": -4096,
    "y": -448,
    "bounds": [
      96,
      96
    ],
    "name": "npc_dota_watch_tower_bottom",
    "dayVision": 0,
    "nightVision": 0,
    "healthRegen": 0,
    "health": 450,
    "armor": 0,
    "team": 2
  },
  {
    "bat": 0,
    "x": 3392,
    "y": -448,
    "bounds": [
      96,
      96
    ],
    "name": "npc_dota_watch_tower_top",
    "dayVision": 0,
    "nightVision": 0,
    "healthRegen": 0,
    "health": 450,
    "armor": 0,
    "team": 2
  }
]
```

## dota_item_rune_spawner_powerup (功能神符刷新点)

```json
[
  {
    "name": "dota_item_rune_spawner_powerup",
    "y": 1112,
    "bounds": [
      0,
      0
    ],
    "x": -1640,
    "team": 0
  },
  {
    "name": "dota_item_rune_spawner_powerup",
    "y": -1216,
    "bounds": [
      0,
      0
    ],
    "x": 1180,
    "team": 0
  }
]
```

## dota_item_rune_spawner_bounty (赏金符刷新点)

```json
[
  {
    "name": "dota_item_rune_spawner_bounty",
    "y": 4431,
    "bounds": [
      0,
      0
    ],
    "x": -996,
    "team": 0
  },
  {
    "name": "dota_item_rune_spawner_bounty",
    "y": -4660,
    "bounds": [
      0,
      0
    ],
    "x": 595,
    "team": 0
  }
]
```

## npc_dota_healer (治疗者/莲花池?)

```json
[]
```

## ent_dota_fountain (泉水)

```json
[
  {
    "bat": 0.15000000596046,
    "x": 7408,
    "y": 6848,
    "bounds": [
      144,
      144
    ],
    "name": "ent_dota_fountain_bad",
    "damageMax": 310,
    "damageMin": 290,
    "dayVision": 1800,
    "nightVision": 1800,
    "healthRegen": 0,
    "health": 500,
    "armor": 0,
    "team": 3
  },
  {
    "bat": 0.15000000596046,
    "x": -7456,
    "y": -6938,
    "bounds": [
      144,
      144
    ],
    "name": "ent_dota_fountain_good",
    "damageMax": 310,
    "damageMin": 290,
    "dayVision": 1800,
    "nightVision": 1800,
    "healthRegen": 0,
    "health": 500,
    "armor": 0,
    "team": 2
  }
]
```

## npc_dota_tower (防御塔)

```json
[
  {
    "bat": 0.89999997615814,
    "x": -3952,
    "y": -6112,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower3_bot",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -4640,
    "y": -4144,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower3_mid",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -6592,
    "y": -3408,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower3_top",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -360,
    "y": -6256,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower2_bot",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": 4904,
    "y": -6198,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower1_bot",
    "damageMax": 92,
    "damageMin": 88,
    "dayVision": 1900,
    "nightVision": 800,
    "healthRegen": 0,
    "health": 1800,
    "armor": 12,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -3190,
    "y": -2926,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower2_mid",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -6501,
    "y": -872,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower2_top",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -6336,
    "y": 1856,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower1_top",
    "damageMax": 92,
    "damageMin": 88,
    "dayVision": 1900,
    "nightVision": 800,
    "healthRegen": 0,
    "health": 1800,
    "armor": 12,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -5712,
    "y": -4864,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower4_top",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2600,
    "armor": 21,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": 4944,
    "y": 4776,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower4_top",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2600,
    "armor": 21,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": -128,
    "y": 6016,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower2_top",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": -5275,
    "y": 5928,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower1_top",
    "damageMax": 92,
    "damageMin": 88,
    "dayVision": 1900,
    "nightVision": 800,
    "healthRegen": 0,
    "health": 1800,
    "armor": 12,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 2496,
    "y": 2112,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower2_mid",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 524,
    "y": 652,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower1_mid",
    "damageMax": 92,
    "damageMin": 88,
    "dayVision": 1900,
    "nightVision": 800,
    "healthRegen": 0,
    "health": 1800,
    "armor": 12,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 6400,
    "y": 384,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower2_bot",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 6336,
    "y": 3032,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower3_bot",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 3552,
    "y": 5776,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower3_top",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 4272,
    "y": 3759,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower3_mid",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2500,
    "armor": 16,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": 5280,
    "y": 4432,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower4_bot",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2600,
    "armor": 21,
    "team": 3
  },
  {
    "bat": 0.89999997615814,
    "x": -5392,
    "y": -5192,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower4_bot",
    "damageMax": 174,
    "damageMin": 170,
    "dayVision": 1900,
    "nightVision": 1100,
    "healthRegen": 0,
    "health": 2600,
    "armor": 21,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": -1544,
    "y": -1408,
    "bounds": [
      144,
      144
    ],
    "name": "dota_goodguys_tower1_mid",
    "damageMax": 92,
    "damageMin": 88,
    "dayVision": 1900,
    "nightVision": 800,
    "healthRegen": 0,
    "health": 1800,
    "armor": 12,
    "team": 2
  },
  {
    "bat": 0.89999997615814,
    "x": 6269,
    "y": -2240,
    "bounds": [
      144,
      144
    ],
    "name": "dota_badguys_tower1_bot",
    "damageMax": 92,
    "damageMin": 88,
    "dayVision": 1900,
    "nightVision": 800,
    "healthRegen": 0,
    "health": 1800,
    "armor": 12,
    "team": 3
  }
]
```

## npc_dota_fort (基地遗迹)

```json
[
  {
    "bat": 0,
    "x": 5528,
    "y": 5000,
    "bounds": [
      373.96197509766,
      373.96197509766
    ],
    "name": "dota_badguys_fort",
    "dayVision": 2600,
    "nightVision": 2600,
    "healthRegen": 12,
    "health": 4500,
    "armor": 23,
    "team": 3
  },
  {
    "bat": 0,
    "x": -5920,
    "y": -5352,
    "bounds": [
      298.72647094727,
      298.72647094727
    ],
    "name": "dota_goodguys_fort",
    "dayVision": 2600,
    "nightVision": 2600,
    "healthRegen": 12,
    "health": 4500,
    "armor": 23,
    "team": 2
  }
]
```

## ent_dota_shop (商店)

```json
[
  {
    "bat": 1.7000000476837,
    "x": 6697,
    "y": 6809,
    "bounds": [
      24,
      24
    ],
    "name": "ent_dota_shop",
    "dayVision": 575,
    "nightVision": 575,
    "healthRegen": 0,
    "health": 150,
    "armor": 0,
    "team": 5
  },
  {
    "bat": 1.7000000476837,
    "x": -7542,
    "y": -6171,
    "bounds": [
      24,
      24
    ],
    "name": "ent_dota_shop",
    "dayVision": 575,
    "nightVision": 575,
    "healthRegen": 0,
    "health": 150,
    "armor": 0,
    "team": 5
  },
  {
    "bat": 1.7000000476837,
    "x": 4886,
    "y": -1208,
    "bounds": [
      24,
      24
    ],
    "name": "ent_dota_shop",
    "dayVision": 575,
    "nightVision": 575,
    "healthRegen": 0,
    "health": 150,
    "armor": 0,
    "team": 5
  },
  {
    "bat": 1.7000000476837,
    "x": -5080,
    "y": 1948,
    "bounds": [
      24,
      24
    ],
    "name": "ent_dota_shop",
    "dayVision": 575,
    "nightVision": 575,
    "healthRegen": 0,
    "health": 150,
    "armor": 0,
    "team": 5
  }
]
```

## npc_dota_barracks (兵营)

```json
[
  {
    "bat": 0,
    "x": -4672,
    "y": -4552,
    "bounds": [
      144,
      144
    ],
    "name": "good_rax_melee_mid",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 5,
    "health": 2200,
    "armor": 15,
    "team": 2
  },
  {
    "bat": 0,
    "x": -5060,
    "y": -4199,
    "bounds": [
      144,
      144
    ],
    "name": "good_rax_range_mid",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 0,
    "health": 1300,
    "armor": 9,
    "team": 2
  },
  {
    "bat": 0,
    "x": -4280,
    "y": -6360,
    "bounds": [
      144,
      144
    ],
    "name": "good_rax_melee_bot",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 5,
    "health": 2200,
    "armor": 15,
    "team": 2
  },
  {
    "bat": 0,
    "x": -4279,
    "y": -5853,
    "bounds": [
      144,
      144
    ],
    "name": "good_rax_range_bot",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 0,
    "health": 1300,
    "armor": 9,
    "team": 2
  },
  {
    "bat": 0,
    "x": -6336,
    "y": -3758,
    "bounds": [
      144,
      144
    ],
    "name": "good_rax_melee_top",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 5,
    "health": 2200,
    "armor": 15,
    "team": 2
  },
  {
    "bat": 0,
    "x": -6844,
    "y": -3759,
    "bounds": [
      144,
      144
    ],
    "name": "good_rax_range_top",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 0,
    "health": 1300,
    "armor": 9,
    "team": 2
  },
  {
    "bat": 0,
    "x": 6592,
    "y": 3392,
    "bounds": [
      144,
      144
    ],
    "name": "bad_rax_melee_bot",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 5,
    "health": 2200,
    "armor": 15,
    "team": 3
  },
  {
    "bat": 0,
    "x": 6064,
    "y": 3376,
    "bounds": [
      144,
      144
    ],
    "name": "bad_rax_range_bot",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 0,
    "health": 1300,
    "armor": 9,
    "team": 3
  },
  {
    "bat": 0,
    "x": 4336,
    "y": 4183,
    "bounds": [
      144,
      144
    ],
    "name": "bad_rax_range_mid",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 0,
    "health": 1300,
    "armor": 9,
    "team": 3
  },
  {
    "bat": 0,
    "x": 4702,
    "y": 3824,
    "bounds": [
      144,
      144
    ],
    "name": "bad_rax_melee_mid",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 5,
    "health": 2200,
    "armor": 15,
    "team": 3
  },
  {
    "bat": 0,
    "x": 3898,
    "y": 5496,
    "bounds": [
      144,
      144
    ],
    "name": "bad_rax_melee_top",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 5,
    "health": 2200,
    "armor": 15,
    "team": 3
  },
  {
    "bat": 0,
    "x": 3894,
    "y": 6025,
    "bounds": [
      144,
      144
    ],
    "name": "bad_rax_range_top",
    "dayVision": 900,
    "nightVision": 600,
    "healthRegen": 0,
    "health": 1300,
    "armor": 9,
    "team": 3
  }
]
```

## npc_dota_neutral_spawner (野怪刷新点)

```json
[
  {
    "bounds": [
      0,
      0
    ],
    "x": -852,
    "y": 4940,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 3392,
    "y": -1408,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 3951,
    "y": -5075,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 7928,
    "y": -120,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -4824,
    "y": 3915,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 4649,
    "y": -3699,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -1454,
    "y": -3356,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 186,
    "y": -5197,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -5015,
    "y": -96,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 4352,
    "y": 48,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -1983,
    "y": -4815,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 1224,
    "y": 4176,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -4013,
    "y": 992,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -785,
    "y": -7593,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 171,
    "y": 8255,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -4724,
    "y": 8368,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 1064,
    "y": 2580,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 8430,
    "y": 1263,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -8313,
    "y": -553,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -3200,
    "y": 7484,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -2596,
    "y": 3850,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 3200,
    "y": -8256,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 1922,
    "y": -3975,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -3911,
    "y": 4829,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 4895,
    "y": -8341,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -8023,
    "y": -1838,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": 2016,
    "y": 7896,
    "team": 0
  },
  {
    "bounds": [
      0,
      0
    ],
    "x": -2415,
    "y": -8402,
    "team": 0
  }
]
```

