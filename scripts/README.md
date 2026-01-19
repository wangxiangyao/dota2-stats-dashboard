# Scripts 说明

## 数据处理流程

```
VPK原始数据 → parse-valve-data.cjs → abilities.json (932个)
                                          ↓
                              filter-damage-abilities.cjs → damage-abilities.json (293个)
                                                                ↓
                                                 apply-direct-damage-marks.cjs → 添加 isDamagePurpose 标记
```

## 脚本列表

### parse-valve-data.cjs
**功能**：从 Dota2 VPK 提取的原始数据生成技能 JSON

**输入**：
- `public/source/heroes/*.txt` - 从 VPK 提取的原始英雄技能数据
- `public/data/translations/ability-names.json` - 技能中文名映射
- `public/data/translations/hero-names.json` - 英雄中文名映射

**输出**：
- `public/data/abilities.json` - 所有技能数据（932个）

**运行**：
```bash
node scripts/parse-valve-data.cjs
```

---

### filter-damage-abilities.cjs
**功能**：从所有技能中筛选出主动伤害类技能

**输入**：
- `public/data/abilities.json`

**输出**：
- `public/data/damage-abilities.json` - 主动伤害技能（293个）

**筛选规则**：
- 排除被动技能、先天技能
- 排除幻象/召唤/增益类技能
- 排除非直接伤害的 damageKey
- 通过白名单/黑名单手动调整

**运行**：
```bash
node scripts/filter-damage-abilities.cjs
```

---

### analyze-damage-types.cjs
**功能**：分析伤害技能的分类，生成概览文档供人工审核

**输入**：
- `public/data/damage-abilities.json`

**输出**：
- `docs/技能分类概览.md` - 按分类列出所有技能，带"直接伤害"标记列
- `public/data/damage-abilities-classified.json` - 带 damageCategory 字段

**分类**：
- simple（简单直接伤害）
- dot（持续伤害）
- multi（多段伤害）
- percent（百分比伤害）
- complex（复杂技能）
- special（特殊技能）

**运行**：
```bash
node scripts/analyze-damage-types.cjs
```

---

### apply-direct-damage-marks.cjs
**功能**：从 `技能分类概览.md` 读取人工标注的 ✓ 标记，更新到 JSON

**输入**：
- `docs/技能分类概览.md` - 人工标注后的文档
- `public/data/damage-abilities.json`

**输出**：
- `public/data/damage-abilities.json` - 添加 `isDamagePurpose` 字段

**使用流程**：
1. 运行 `analyze-damage-types.cjs` 生成概览文档
2. 手动在 `技能分类概览.md` 中用 ✓ 标记"以伤害为主要目的"的技能
3. 运行 `apply-direct-damage-marks.cjs` 同步标记到 JSON

**运行**：
```bash
node scripts/apply-direct-damage-marks.cjs
```
