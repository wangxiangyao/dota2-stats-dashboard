# Scripts 说明

## 数据处理流程

```
VPK原始数据 → parse-valve-data.cjs → abilities.json (932个)
                                          ↓
                              filter-damage-abilities.cjs → damage-abilities.json (254个，isDamagePurpose=true)
                                                                ↓
                                         generate-hero-damage-docs-v2.cjs → docs/damage-formulas/*.md (人工审核公式)
                                                                                     ↓
                                                           extract-formulas-to-json.cjs → damage-formulas-config.json
                                                                                               ↓
                                                                           calculate-damage.cjs → 计算各等级伤害
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
- `public/data/damage-abilities.json` - 伤害技能（含 `isDamagePurpose` 标记）

**筛选规则**：
- 排除被动技能、先天技能
- 排除幻象/召唤/增益类技能
- 排除非直接伤害的 damageKey
- 通过白名单/黑名单手动调整
- `isDamagePurpose=true` 表示以伤害为主要目的（共254个）

**运行**：
```bash
node scripts/filter-damage-abilities.cjs
```

---

### generate-hero-damage-docs-v2.cjs
**功能**：为每个英雄生成独立的伤害公式文档，供人工审核

**输入**：
- `public/data/damage-abilities.json`

**输出**：
- `docs/damage-formulas/*.md` - 每个英雄一个文档，列出技能的原始数据和公式定义

**运行**：
```bash
node scripts/generate-hero-damage-docs-v2.cjs
```

---

### extract-formulas-to-json.cjs
**功能**：从已审核的 MD 文档中提取公式，生成 JSON 配置

**输入**：
- `docs/damage-formulas/*.md` - 人工审核后的文档（`reviewed: ✅`）

**输出**：
- `public/data/damage-formulas-config.json` - 技能公式配置

**JSON 结构**：
```json
{
  "ability_internal_name": {
    "nameZh": "技能名",
    "damageType": "MAGICAL",
    "effectiveType": "MAGICAL",
    "formulaMin": null,           // 最小伤害公式
    "formulaExpected": "damage × 2", // 期望伤害公式
    "formulaMax": null,           // 最大伤害公式
    "customParams": { "hero_strength": "50 90 130" },
    "notes": null,
    "reviewed": true
  }
}
```

**运行**：
```bash
node scripts/extract-formulas-to-json.cjs
```

---

### calculate-damage.cjs
**功能**：根据公式计算各等级伤害

**输入**：
- `docs/damage-formulas/*.md` 或 `public/data/damage-formulas-config.json`
- `public/data/damage-abilities.json`

**参数**：
- `<英雄名>` - 要计算的英雄名称

**输出**：
- 控制台输出各技能的各等级伤害值

**运行**：
```bash
node scripts/calculate-damage.cjs 矮人直升机
```

**示例输出**：
```
=== 矮人直升机 伤害计算 ===

【火箭弹幕】
  公式: rocket_damage × rockets_per_second × barrage_duration
  审核: ✅
  各等级伤害: 240 / 420 / 600 / 780
```
