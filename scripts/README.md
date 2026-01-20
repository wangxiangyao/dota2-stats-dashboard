# Scripts 说明

## 数据处理流程（新架构）

```
VPK原始数据 (public/source/)
       ↓ parse-valve-data.cjs 或 页面按钮 POST /api/parse/abilities
abilities.json (932个)
       ↓ 页面实时过滤 (pages/data/abilities/[trait].vue)
候选技能列表
       ↓ 人工审核选择
traits/damage.json (252个，含公式配置)
```

## 脚本列表

### parse-valve-data.cjs
**功能**：从 Dota2 VPK 提取的原始数据生成技能 JSON

**输入**：
- `public/source/heroes/*.txt` - 从 VPK 提取的原始英雄技能数据
- `public/data/abilities/translations/ability-names.json` - 技能中文名映射
- `public/data/heroes/translations/hero-names.json` - 英雄中文名映射

**输出**：
- `public/data/abilities/abilities.json` - 所有技能数据（932个）

**运行**：
```bash
node scripts/parse-valve-data.cjs
# 或通过页面按钮触发 POST /api/parse/abilities
```

---

### extract-formulas-to-json.cjs
**功能**：从已审核的 MD 文档中提取公式，生成 JSON 配置

> ⚠️ 此脚本已被页面功能替代，仅作为备用

**输入**：
- `docs/damage-formulas/*.md` - 人工审核后的文档

**输出**：
- `public/data/abilities/traits/damage.json` - 技能公式配置

---

### calculate-damage.cjs
**功能**：根据公式计算各等级伤害

**输入**：
- `public/data/abilities/traits/damage.json`
- `public/data/abilities/abilities.json`

**参数**：
- `<英雄名>` - 要计算的英雄名称

**运行**：
```bash
node scripts/calculate-damage.cjs 矮人直升机
```

---

## 已废弃的脚本

以下脚本已被页面功能替代，已删除：

- ~~`filter-damage-abilities.cjs`~~ → 过滤逻辑已移入 `pages/data/abilities/[trait].vue`
- ~~`generate-hero-damage-docs-v2.cjs`~~ → 不再需要生成 MD 文档

## API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/parse/abilities` | POST | 执行 VPK 解析 |
| `/api/traits/[type]` | GET | 读取特征数据 |
| `/api/traits/[type]` | POST | 保存特征数据 |
