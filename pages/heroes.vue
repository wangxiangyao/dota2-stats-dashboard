<script setup lang="ts">
import type { Hero } from '~/types/dota'

const { loadHeroes } = useDataLoader()
const {
  calculateHP,
  calculateMana,
  calculateHPRegen,
  calculateManaRegen,
  calculateArmor,
  calculateMagicResistance,
  calculatePhysicalEHP,
  calculateMagicalEHP,
  calculateDamage,
  calculateDPS,
  calculateAttackSpeed
} = useHeroCalculator()

// 数据
const heroes = ref<Hero[]>([])

// 当前Tab
const activeTab = ref('survival')

// 等级控制
const hpLevel = ref(25)
const armorLevel = ref(25)
const mrLevel = ref(25)
const ehpLevel = ref(25)
const mehpLevel = ref(25)
const damageLevel = ref(1)
const dpsLevel = ref(25)
// 续航分析等级控制
const manaLevel = ref(25)
const hpRegenLevel = ref(25)
const manaRegenLevel = ref(25)
// 攻速等级控制
const attackSpeedLevel = ref(25)
// 综合分析等级控制
const ttkLevel = ref(25)

// 是否计算黄点
const includeBonus = ref(true)

// 英雄选择器的选中英雄
const hpCurveSelected = ref<string[]>([])
const armorCurveSelected = ref<string[]>([])
const mrCurveSelected = ref<string[]>([])
const ehpCurveSelected = ref<string[]>([])
const mehpCurveSelected = ref<string[]>([])
const damageCurveSelected = ref<string[]>([])
const dpsCurveSelected = ref<string[]>([])
// 续航分析选中英雄
const manaCurveSelected = ref<string[]>([])
const hpRegenCurveSelected = ref<string[]>([])
const manaRegenCurveSelected = ref<string[]>([])
// 攻速选中英雄
const attackSpeedCurveSelected = ref<string[]>([])

// 排除的特殊英雄
const HP_EXCLUDE = ['美杜莎']
const ARMOR_EXCLUDE = ['小小']
const MR_EXCLUDE = ['食人魔魔法师']

// 加载数据
onMounted(async () => {
  const data = await loadHeroes()
  if (data) {
    heroes.value = data
    // 默认选中所有英雄（排除特殊英雄）
    const allNames = data.map(h => h.name)
    hpCurveSelected.value = data.filter(h => !HP_EXCLUDE.includes(h.name)).map(h => h.name)
    armorCurveSelected.value = allNames
    mrCurveSelected.value = allNames
    ehpCurveSelected.value = allNames
    mehpCurveSelected.value = allNames
    damageCurveSelected.value = allNames
    dpsCurveSelected.value = allNames
    // 续航分析默认选中
    manaCurveSelected.value = allNames
    hpRegenCurveSelected.value = allNames
    manaRegenCurveSelected.value = allNames
    // 攻速默认选中
    attackSpeedCurveSelected.value = allNames
  }
})

// 切换Tab
const switchTab = (tab: string) => {
  activeTab.value = tab
}

// 计算函数（带黄点控制）
const getHP = (hero: Hero, level: number) => calculateHP(hero, level, includeBonus.value)
const getArmor = (hero: Hero, level: number) => calculateArmor(hero, level, includeBonus.value)
const getMR = (hero: Hero, level: number) => calculateMagicResistance(hero, level, includeBonus.value)
const getPhysicalEHP = (hero: Hero, level: number) => calculatePhysicalEHP(hero, level, includeBonus.value)
const getMagicalEHP = (hero: Hero, level: number) => calculateMagicalEHP(hero, level, includeBonus.value)
const getDamage = (hero: Hero, level: number) => calculateDamage(hero, level, includeBonus.value)
const getDPS = (hero: Hero, level: number) => calculateDPS(hero, level, includeBonus.value)
// 续航相关计算函数
const getMana = (hero: Hero, level: number) => calculateMana(hero, level, includeBonus.value)
const getHPRegen = (hero: Hero, level: number) => calculateHPRegen(hero, level, includeBonus.value)
const getManaRegen = (hero: Hero, level: number) => calculateManaRegen(hero, level, includeBonus.value)
// BAT（固定值，不随等级变化）
const getBAT = (hero: Hero, _level: number) => hero.attackRate || 1.7
// 攻速
const getAttackSpeed = (hero: Hero, level: number) => calculateAttackSpeed(hero, level, includeBonus.value)
</script>

<template>
  <div>
    <h2>第一部分：英雄基础数值分析</h2>

    <!-- Tab 导航 -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'survival' }"
        @click="switchTab('survival')"
      >
        A. 生存能力
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'damage' }"
        @click="switchTab('damage')"
      >
        B. 输出能力
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'sustain' }"
        @click="switchTab('sustain')"
      >
        C. 续航分析
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'attribute' }"
        @click="switchTab('attribute')"
      >
        D. 属性分析
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'misc' }"
        @click="switchTab('misc')"
      >
        E. 其他
      </button>
      <button
        class="tab-btn synthesis"
        :class="{ active: activeTab === 'synthesis' }"
        @click="switchTab('synthesis')"
      >
        📊 综合分析
      </button>
    </div>

    <!-- ===== A. 生存能力 ===== -->
    <div v-show="activeTab === 'survival'">
      <div class="intro-section">
        <h3>🛡️ 生存能力分析</h3>
        <p>分析英雄的生命值、防御（护甲/魔抗）、以及等效生命值（EHP），揭示英雄的生存设计规律。</p>
      </div>

      <!-- 黄点设置 -->
      <div class="settings-box">
        <el-checkbox v-model="includeBonus">
          <strong>计算黄点（属性加成）</strong>
        </el-checkbox>
        <span class="settings-hint">
          黄点在15/16/17/19/20/21/22级各+2全属性，满级+14。影响：+308 HP、+2.34护甲、+1.4%魔抗
        </span>
      </div>

      <!-- === 第一部分：生命值 === -->
      <div class="section-divider blue">
        <h2>📊 第一部分：生命值</h2>
      </div>

      <!-- A1.1 生命值分布 -->
      <section class="chart-section">
        <h3>A1.1 生命值分布与成长</h3>
        <p class="formula">生命值 = 基础生命 + 力量 × 22</p>
        <LevelSlider v-model="hpLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="hpLevel"
          :value-getter="getHP"
          title="英雄生命值排行"
          unit=" HP"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="hpLevel"
          title="生命值"
          :value-getter="getHP"
          unit=""
          :exclude-heroes="HP_EXCLUDE"
          exclude-note="已排除美杜莎（基础力量为0，生存能力依赖魔法盾技能）"
        >
          <template #insight>
            💡 力量英雄平均生命值最高，智力英雄最低。生命值差距体现了Dota2通过血量差异化定义"生存定位"。
          </template>
        </AnalysisBox>
      </section>

      <!-- A1.2 生命值成长曲线 -->
      <section class="chart-section">
        <h3>A1.2 生命值成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其生命值随等级的变化</p>
        <HeroSelector
          v-model="hpCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="hpCurveSelected"
          title="生命值成长曲线"
          y-axis-name="生命值"
          :value-getter="getHP"
        />
      </section>

      <!-- 第一部分：生命值 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="生命值"
        :value-getter="getHP"
        :exclude-heroes="HP_EXCLUDE"
      >
        <!-- 分析结论待补充 -->
      </AnalysisKeyLevelTable>

      <!-- === 第二部分：防御 === -->
      <div class="section-divider green">
        <h2>🛡️ 第二部分：防御</h2>
      </div>

      <!-- A2.1 护甲分布 -->
      <section class="chart-section">
        <h3>A2.1 护甲分布与成长</h3>
        <p class="formula">护甲 = 基础护甲 + 敏捷 × 0.167 | 物理减伤 = 0.06×护甲 / (1+0.06×护甲)</p>
        <LevelSlider v-model="armorLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="armorLevel"
          :value-getter="getArmor"
          title="英雄护甲排行"
          unit=" 护甲"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="armorLevel"
          title="护甲"
          :value-getter="getArmor"
          unit=""
          :exclude-heroes="ARMOR_EXCLUDE"
          exclude-note="已排除小小（无敏捷成长）"
        >
          <template #insight>
            💡 每点护甲提供6%的EHP加成。10护甲≈37.5%减伤，20护甲≈54.5%减伤。敏捷英雄平均护甲最高。
          </template>
        </AnalysisBox>
      </section>

      <!-- A2.2 护甲成长曲线 -->
      <section class="chart-section">
        <h3>A2.2 护甲成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其护甲随等级的变化</p>
        <HeroSelector
          v-model="armorCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="armorCurveSelected"
          title="护甲成长曲线"
          y-axis-name="护甲"
          :value-getter="getArmor"
        />
      </section>

      <!-- A2.3 魔抗分布 -->
      <section class="chart-section">
        <h3>A2.3 魔抗分布与成长</h3>
        <p class="formula">魔抗 = 基础魔抗(25%) + 智力 × 0.1%</p>
        <LevelSlider v-model="mrLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="mrLevel"
          :value-getter="getMR"
          title="英雄魔抗排行"
          unit="%"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="mrLevel"
          title="魔抗"
          :value-getter="getMR"
          unit="%"
          :exclude-heroes="MR_EXCLUDE"
          exclude-note="已排除食人魔魔法师（无智力成长）"
        >
          <template #insight>
            💡 智力英雄平均魔抗最高，因为智力提供魔抗加成。
          </template>
        </AnalysisBox>
      </section>

      <!-- A2.4 魔抗成长曲线 -->
      <section class="chart-section">
        <h3>A2.4 魔抗成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其魔抗随等级的变化</p>
        <HeroSelector
          v-model="mrCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="mrCurveSelected"
          title="魔抗成长曲线"
          y-axis-name="魔抗(%)"
          :value-getter="getMR"
        />
      </section>

      <!-- 第二部分：防御 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="护甲"
        :value-getter="getArmor"
        :precision="1"
        :exclude-heroes="[...HP_EXCLUDE, ...ARMOR_EXCLUDE]"
      >
      </AnalysisKeyLevelTable>
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="魔抗"
        unit="%"
        :value-getter="getMR"
        :precision="1"
        :exclude-heroes="[...HP_EXCLUDE, ...MR_EXCLUDE]"
      >
      </AnalysisKeyLevelTable>

      <!-- === 第三部分：等效生命值 === -->
      <div class="section-divider purple">
        <h2>💜 第三部分：等效生命值（EHP）</h2>
      </div>

      <!-- A3.1 物理EHP分布 -->
      <section class="chart-section">
        <h3>A3.1 物理EHP分布与成长</h3>
        <p class="formula">物理EHP = 生命值 × (1 + 0.06 × 护甲)</p>
        <LevelSlider v-model="ehpLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="ehpLevel"
          :value-getter="getPhysicalEHP"
          title="物理EHP排行"
          unit=" EHP"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="ehpLevel"
          title="物理EHP"
          :value-getter="getPhysicalEHP"
          unit=""
        >
          <template #insight>
            💡 物理EHP综合了生命值和护甲的效果，是衡量英雄物理生存能力的核心指标。
          </template>
        </AnalysisBox>
      </section>

      <!-- A3.2 物理EHP曲线 -->
      <section class="chart-section">
        <h3>A3.2 物理EHP成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其物理EHP随等级的变化</p>
        <HeroSelector
          v-model="ehpCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="ehpCurveSelected"
          title="物理EHP成长曲线"
          y-axis-name="EHP"
          :value-getter="getPhysicalEHP"
        />
      </section>

      <!-- A3.3 魔法EHP分布 -->
      <section class="chart-section">
        <h3>A3.3 魔法EHP分布与成长</h3>
        <p class="formula">魔法EHP = 生命值 / (1 - 魔抗%)</p>
        <LevelSlider v-model="mehpLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="mehpLevel"
          :value-getter="getMagicalEHP"
          title="魔法EHP排行"
          unit=" EHP"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="mehpLevel"
          title="魔法EHP"
          :value-getter="getMagicalEHP"
          unit=""
        >
          <template #insight>
            💡 魔法EHP反映了英雄承受魔法伤害的能力。
          </template>
        </AnalysisBox>
      </section>

      <!-- A3.4 魔法EHP曲线 -->
      <section class="chart-section">
        <h3>A3.4 魔法EHP成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其魔法EHP随等级的变化</p>
        <HeroSelector
          v-model="mehpCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="mehpCurveSelected"
          title="魔法EHP成长曲线"
          y-axis-name="Magic EHP"
          :value-getter="getMagicalEHP"
        />
      </section>

      <!-- 第三部分：EHP 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="物理EHP"
        :value-getter="getPhysicalEHP"
        :exclude-heroes="HP_EXCLUDE"
      />
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="魔法EHP"
        :value-getter="getMagicalEHP"
        :exclude-heroes="HP_EXCLUDE"
      />
    </div>

    <!-- ===== B. 输出能力 ===== -->
    <div v-show="activeTab === 'damage'">
      <div class="intro-section red">
        <h3>⚔️ 输出能力分析</h3>
        <p>分析英雄的攻击力、攻击速度、以及理论DPS，揭示英雄的输出设计规律。</p>
      </div>

      <!-- === 第一部分：攻击力 === -->
      <div class="section-divider red">
        <h2>💪 第一部分：攻击力</h2>
      </div>

      <!-- B1.1 攻击力分布 -->
      <section class="chart-section">
        <h3>B1.1 攻击力分布与成长</h3>
        <p class="formula">攻击力 = 基础攻击力 + 主属性加成 (全能英雄按0.45×全属性计算)</p>
        <LevelSlider v-model="damageLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="damageLevel"
          :value-getter="getDamage"
          title="英雄攻击力排行"
          unit=" 点"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="damageLevel"
          title="攻击力"
          :value-getter="getDamage"
          unit=""
        >
          <template #insight>
            💡 主属性直接影响攻击力，全能英雄的攻击力按0.45×全属性计算。
          </template>
        </AnalysisBox>
      </section>

      <!-- B1.2 攻击力成长曲线 -->
      <section class="chart-section">
        <h3>B1.2 攻击力成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其攻击力随等级的变化</p>
        <HeroSelector
          v-model="damageCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="damageCurveSelected"
          title="攻击力成长曲线"
          y-axis-name="攻击力"
          :value-getter="getDamage"
        />
      </section>

      <!-- 第一部分：攻击力 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="攻击力"
        :value-getter="getDamage"
      />

      <!-- === 第二部分：攻速 === -->
      <div class="section-divider orange">
        <h2>⚡ 第二部分：攻速</h2>
      </div>

      <!-- B2 攻击速度 -->
      <section class="chart-section">
        <h3>B2.1 基础攻击间隔（BAT）排行</h3>
        <p class="formula">攻速 = (1 + 敏捷 × 0.01) / BAT | BAT越低攻速越快</p>
        <HeroBarChart
          :heroes="heroes"
          :level="1"
          :value-getter="getBAT"
          title="英雄BAT排行"
          unit=" 秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="1"
          title="BAT"
          :value-getter="getBAT"
          unit="秒"
        >
          <template #insight>
            💡 大多数英雄的BAT为1.7秒。BAT越低，相同敏捷下攻速越快，如Anti-Mage(1.4)、Alchemist变身(1.0)。
          </template>
        </AnalysisBox>
      </section>

      <!-- B2.2 攻速分布 -->
      <section class="chart-section">
        <h3>B2.2 攻速分布与成长</h3>
        <p class="formula">攻速 = (1 + 敏捷 × 0.01) / BAT</p>
        <LevelSlider v-model="attackSpeedLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="attackSpeedLevel"
          :value-getter="getAttackSpeed"
          title="英雄攻速排行"
          unit=" 次/秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="attackSpeedLevel"
          title="攻速"
          :value-getter="getAttackSpeed"
          unit="次/秒"
        >
          <template #insight>
            💡 敏捷英雄通常攻速最高，因为敏捷直接提升攻击速度。
          </template>
        </AnalysisBox>
      </section>

      <!-- B2.3 攻速成长曲线 -->
      <section class="chart-section">
        <h3>B2.3 攻速成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其攻速随等级的变化</p>
        <HeroSelector
          v-model="attackSpeedCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="attackSpeedCurveSelected"
          title="攻速成长曲线"
          y-axis-name="攻速(次/秒)"
          :value-getter="getAttackSpeed"
        />
      </section>

      <!-- 第二部分：攻速 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="攻速"
        :value-getter="getAttackSpeed"
        :precision="2"
        unit="次/秒"
      />

      <!-- === 第三部分：DPS === -->
      <div class="section-divider purple">
        <h2>🎯 第三部分：DPS</h2>
      </div>

      <!-- B3.1 DPS曲线 -->
      <section class="chart-section">
        <h3>B3.1 理论DPS成长曲线（1-30级）</h3>
        <p class="formula">DPS = 攻击力 × 攻击次数/秒</p>
        <HeroSelector
          v-model="dpsCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="dpsCurveSelected"
          title="理论DPS成长曲线"
          y-axis-name="DPS"
          :value-getter="getDPS"
        />
      </section>

      <!-- B3.2 DPS排行榜 -->
      <section class="chart-section">
        <h3>B3.2 DPS排行榜</h3>
        <LevelSlider v-model="dpsLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="dpsLevel"
          :value-getter="getDPS"
          title="理论DPS排行"
          unit=" DPS"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="dpsLevel"
          title="DPS"
          :value-getter="getDPS"
          unit=""
        >
          <template #insight>
            💡 DPS排行反映了英雄的白字输出能力。敏捷英雄通常DPS最高。
          </template>
        </AnalysisBox>
      </section>

      <!-- 第三部分：DPS 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="DPS"
        :value-getter="getDPS"
      />

      <!-- 输出能力页签总结 -->
      <SummaryBox title="输出能力分析总结" level="tab" color="red">
        <p>（分析内容待补充：攻击力、攻速、DPS三者关系，敏捷英雄输出优势等）</p>
      </SummaryBox>
    </div>

    <!-- ===== C. 续航分析 ===== -->
    <div v-show="activeTab === 'sustain'">
      <div class="intro-section cyan">
        <h3>💧 续航分析</h3>
        <p>分析英雄的魔法值、生命恢复、魔法恢复，揭示英雄的续航设计规律。</p>
      </div>

      <!-- 黄点设置 -->
      <div class="settings-box">
        <el-checkbox v-model="includeBonus">
          <strong>计算黄点（属性加成）</strong>
        </el-checkbox>
        <span class="settings-hint">
          黄点在15/16/17/19/20/21/22级各+2全属性，满级+14。影响：+168魔法、+1.4回血、+0.7回蓝
        </span>
      </div>

      <!-- === 魔法值 === -->
      <div class="section-divider cyan">
        <h2>💙 第一部分：魔法值</h2>
      </div>

      <section class="chart-section">
        <h3>C1.1 魔法值分布与成长</h3>
        <p class="formula">魔法值 = 基础魔法 + 智力 × 12</p>
        <LevelSlider v-model="manaLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="manaLevel"
          :value-getter="getMana"
          title="英雄魔法值排行"
          unit=" MP"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="manaLevel"
          title="魔法值"
          :value-getter="getMana"
          unit=""
        >
          <template #insight>
            💡 智力英雄平均魔法值最高，这与其定位为法术型英雄相符。
          </template>
        </AnalysisBox>
      </section>

      <section class="chart-section">
        <h3>C1.2 魔法值成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其魔法值随等级的变化</p>
        <HeroSelector
          v-model="manaCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="manaCurveSelected"
          title="魔法值成长曲线"
          y-axis-name="魔法值"
          :value-getter="getMana"
        />
      </section>

      <!-- 第一部分：魔法值 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="魔法值"
        :value-getter="getMana"
      />

      <!-- === 生命恢复 === -->
      <div class="section-divider green">
        <h2>❤️ 第二部分：生命恢复</h2>
      </div>

      <section class="chart-section">
        <h3>C2.1 生命恢复分布与成长</h3>
        <p class="formula">生命恢复 = 基础生命恢复 + 力量 × 0.1</p>
        <LevelSlider v-model="hpRegenLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="hpRegenLevel"
          :value-getter="getHPRegen"
          title="英雄生命恢复排行"
          unit=" /秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="hpRegenLevel"
          title="生命恢复"
          :value-getter="getHPRegen"
          unit="/秒"
        >
          <template #insight>
            💡 力量英雄平均生命恢复最高，因为力量直接影响生命恢复速度。
          </template>
        </AnalysisBox>
      </section>

      <section class="chart-section">
        <h3>C2.2 生命恢复成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其生命恢复随等级的变化</p>
        <HeroSelector
          v-model="hpRegenCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="hpRegenCurveSelected"
          title="生命恢复成长曲线"
          y-axis-name="生命恢复/秒"
          :value-getter="getHPRegen"
        />
      </section>

      <!-- 第二部分：生命恢复 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="生命恢复"
        :value-getter="getHPRegen"
        :precision="1"
        unit="/秒"
      />

      <!-- === 魔法恢复 === -->
      <div class="section-divider blue">
        <h2>💎 第三部分：魔法恢复</h2>
      </div>

      <section class="chart-section">
        <h3>C3.1 魔法恢复分布与成长</h3>
        <p class="formula">魔法恢复 = 基础魔法恢复 + 智力 × 0.05</p>
        <LevelSlider v-model="manaRegenLevel" />
        <HeroBarChart
          :heroes="heroes"
          :level="manaRegenLevel"
          :value-getter="getManaRegen"
          title="英雄魔法恢复排行"
          unit=" /秒"
        />
        <AnalysisBox
          :heroes="heroes"
          :level="manaRegenLevel"
          title="魔法恢复"
          :value-getter="getManaRegen"
          unit="/秒"
        >
          <template #insight>
            💡 智力英雄平均魔法恢复最高，因为智力直接影响魔法恢复速度。
          </template>
        </AnalysisBox>
      </section>

      <section class="chart-section">
        <h3>C3.2 魔法恢复成长曲线（1-30级）</h3>
        <p class="formula">选择英雄对比其魔法恢复随等级的变化</p>
        <HeroSelector
          v-model="manaRegenCurveSelected"
          :heroes="heroes"
        />
        <HeroLineChart
          :heroes="heroes"
          :selected-heroes="manaRegenCurveSelected"
          title="魔法恢复成长曲线"
          y-axis-name="魔法恢复/秒"
          :value-getter="getManaRegen"
        />
      </section>

      <!-- 第三部分：魔法恢复 小结 -->
      <AnalysisKeyLevelTable
        :heroes="heroes"
        title="魔法恢复"
        :value-getter="getManaRegen"
        :precision="1"
        unit="/秒"
      />
    </div>

    <!-- ===== D. 属性分析 ===== -->
    <div v-show="activeTab === 'attribute'">
      <div class="intro-section purple">
        <h3>📊 属性分析</h3>
        <p>分析英雄的主属性分布、近战/远程差异等基础属性维度。</p>
      </div>

      <!-- 主属性分布 -->
      <section class="chart-section">
        <h3>D1. 主属性类型分布</h3>
        <p class="formula">力量/敏捷/智力/全能英雄数量统计</p>
        <HeroPrimaryAttrPieChart :heroes="heroes" />
      </section>

      <!-- 近战vs远程 -->
      <section class="chart-section">
        <h3>D2. 近战 vs 远程 数值对比</h3>
        <p class="formula">对比两种攻击类型英雄的平均属性差异</p>
        <HeroMeleeRangedCompareChart :heroes="heroes" />
      </section>

      <!-- 属性成长分布 -->
      <section class="chart-section">
        <h3>D3. 属性成长分布</h3>
        <p class="formula">X轴：力量成长 | Y轴：敏捷成长 | 点大小：智力成长</p>
        <HeroAttributeGrowthChart :heroes="heroes" />
      </section>
    </div>

    <!-- ===== E. 其他 ===== -->
    <div v-show="activeTab === 'misc'">
      <div class="intro-section orange">
        <h3>🔧 其他分析</h3>
        <p>攻击距离、移动速度等其他维度分析。</p>
      </div>

      <!-- 攻击距离 -->
      <section class="chart-section">
        <h3>E1. 攻击距离分布</h3>
        <p class="formula">近战英雄通常攻击距离为150，远程英雄差异较大</p>
        <HeroAttackRangeChart :heroes="heroes" />
      </section>

      <!-- 移动速度 -->
      <section class="chart-section">
        <h3>E2. 移动速度分布</h3>
        <p class="formula">基础移动速度范围：270-335</p>
        <HeroMoveSpeedChart :heroes="heroes" />
      </section>

      <!-- 移速vs攻击距离 -->
      <section class="chart-section">
        <h3>E3. 移动速度 vs 攻击距离</h3>
        <p class="formula">验证假设：远程英雄是否移动速度更慢？</p>
        <HeroSpeedVsRangeChart :heroes="heroes" />
      </section>
    </div>

    <!-- ===== F. 综合分析 ===== -->
    <div v-show="activeTab === 'synthesis'">
      <div class="intro-section synthesis">
        <h3>📊 综合分析</h3>
        <p>综合所有维度，分析英雄基础数值的设计规律与平衡逻辑。</p>
      </div>

      <!-- === 击杀时间分析 === -->
      <div class="section-divider red">
        <h2>⚔️ 第一部分：击杀时间分析（TTK）</h2>
      </div>

      <section class="chart-section">
        <h3>F1. 物理对抗击杀时间分析</h3>
        <p class="formula">
          生存时间 = 物理EHP ÷ 平均DPS | 击杀时间 = 平均EHP ÷ 自身DPS
        </p>
        <div class="settings-box">
          <el-checkbox v-model="includeBonus">
            <strong>计算黄点</strong>
          </el-checkbox>
          <span class="settings-hint">等级：</span>
          <LevelSlider v-model="ttkLevel" style="flex: 1; max-width: 300px;" />
        </div>
        <AnalysisTTKChart
          :heroes="heroes"
          :level="ttkLevel"
          :get-physical-e-h-p="getPhysicalEHP"
          :get-d-p-s="getDPS"
        />
        <SummaryBox title="击杀时间分析解读" level="section" color="red">
          <ul>
            <li><strong>生存时间</strong>：该英雄被"平均DPS"击杀需要多久，越长说明越肉</li>
            <li><strong>击杀时间</strong>：该英雄击杀"平均EHP目标"需要多久，越短说明输出越高</li>
            <li><strong>散点图解读</strong>：右下角=坦克型（能抗且输出高），左上角=脆皮型（脆且输出低）</li>
            <li><strong>理想定位</strong>：力量英雄偏右（生存强），敏捷英雄偏下（击杀快）</li>
          </ul>
        </SummaryBox>
      </section>

      <!-- 综合总结 -->
      <SummaryBox title="英雄基础数值综合分析" level="global">
        <p>（综合分析内容待补充：跨维度对比、设计规律总结、对游戏理解的指导意义等）</p>
      </SummaryBox>
    </div>
  </div>
</template>

<style scoped>
.formula {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.settings-box {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.settings-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.section-divider {
  padding: 0.8rem 1.2rem;
  margin: 1.5rem 0 1rem;
  border-radius: 4px;
}

.section-divider h2 {
  margin: 0;
  color: #fff;
  font-size: 1.2rem;
  border: none;
  padding: 0;
}

.section-divider.blue {
  background: linear-gradient(90deg, #3498db 0%, transparent 100%);
}

.section-divider.green {
  background: linear-gradient(90deg, #27ae60 0%, transparent 100%);
}

.section-divider.purple {
  background: linear-gradient(90deg, #9b59b6 0%, transparent 100%);
}

.section-divider.red {
  background: linear-gradient(90deg, #e74c3c 0%, transparent 100%);
}

.section-divider.cyan {
  background: linear-gradient(90deg, #17a2b8 0%, transparent 100%);
}

.section-divider.orange {
  background: linear-gradient(90deg, #e67e22 0%, transparent 100%);
}

.intro-section h3 {
  color: #fff;
  border: none;
  padding: 0;
  margin-bottom: 0.5rem;
}

.intro-section.red {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.intro-section.purple {
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
}

.intro-section.cyan {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
}

.intro-section.orange {
  background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
}

.intro-section.synthesis {
  background: linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%);
}

.tab-btn.synthesis {
  background: linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%);
  color: #fff;
}

.tab-btn.synthesis:hover {
  background: linear-gradient(135deg, #5f27cd 0%, #4a1fad 100%);
}
</style>
