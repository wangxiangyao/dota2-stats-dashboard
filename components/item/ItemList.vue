<script setup lang="ts">
/**
 * 物品列表管理组件
 * 功能：展示物品列表、搜索、选择、保存实装物品
 */

interface ItemData {
  name: string
  displayName: string
  nameEn: string | null
  nameZh: string | null
  aliases: string[] | null
  pinyinAliases: string[] | null
  cost: number
  cooldown: number
  manaCost: number
  quality: string | null
  shopTags: string[]
  isRecipe: boolean
  isObsolete: boolean
  secretShop: boolean
  attributes: Record<string, any>
  components: string[] | null
  recipeCost: number
  behavior: string | null
  castRange: number | null
  traits: Record<string, any>
  isBasic?: boolean  // 是否为基础物品（用于属性单价计算）
}

// Props
const props = defineProps<{
  items: ItemData[]
  loading: boolean
}>()

// Emits
const emit = defineEmits<{
  'parse': []
  'reload': []
}>()

// 搜索
const searchQuery = ref('')

// 解析状态
const parsing = ref(false)
const parseResult = ref<{ success: boolean; message: string } | null>(null)

// 保存状态
const saving = ref(false)

// 弹窗状态
const dialogVisible = ref(false)
const selectedItem = ref<ItemData | null>(null)

// 选中状态（本地编辑）
const selectedItems = ref<Set<string>>(new Set())
// 已保存状态（在 traits.json 中的物品）
const savedItems = ref<Set<string>>(new Set())

// 物品自定义属性（traits.json）
interface ItemAttributes {
  strength?: number
  agility?: number
  intellect?: number
  allStats?: number
  damage?: number
  attackSpeed?: number
  armor?: number
  health?: number
  mana?: number
  healthRegen?: number
  manaRegen?: number
  moveSpeed?: number
  evasion?: number
  magicResist?: number
  lifesteal?: number
  spellLifesteal?: number
}
interface ItemTraits { 
  isBasic?: boolean
  attributes?: ItemAttributes
}
const itemTraits = ref<Record<string, ItemTraits>>({})

// 弹窗中编辑的临时 traits 副本
const editingTraits = ref<ItemTraits>({})

// 加载物品自定义属性（选中状态 = traits.json 中的 key）
onMounted(async () => {
  try {
    const data = await $fetch<Record<string, ItemTraits>>('/api/items/traits')
    itemTraits.value = data || {}
    const keys = Object.keys(data || {})
    savedItems.value = new Set(keys)
    selectedItems.value = new Set(keys)
  } catch (e) {
    console.log('未找到物品自定义属性')
  }
})

// 当 items 加载完成后，如果没有保存数据，默认全选
watch(() => props.items, (items) => {
  if (items.length > 0 && savedItems.value.size === 0 && selectedItems.value.size === 0) {
    selectedItems.value = new Set(items.map(i => i.name))
  }
}, { immediate: true })

// 过滤后的物品
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return props.items
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item =>
    item.name.toLowerCase().includes(query) ||
    item.displayName.toLowerCase().includes(query) ||
    (item.nameZh && item.nameZh.includes(query)) ||
    (item.nameEn && item.nameEn.toLowerCase().includes(query)) ||
    (item.aliases && item.aliases.some(a => a.includes(query)))
  )
})

// 按价格分组
const itemGroups = computed(() => {
  const items = filteredItems.value
  
  // 中立物品 (cost = 0 且不是消耗品)
  const neutralItems = items.filter(i => i.cost === 0 && i.quality !== 'consumable')
  
  // 消耗品
  const consumables = items.filter(i => i.quality === 'consumable')
  
  // 普通物品按价格分组
  const regularItems = items.filter(i => i.cost > 0 && i.quality !== 'consumable')
  const tier1 = regularItems.filter(i => i.cost <= 500)
  const tier2 = regularItems.filter(i => i.cost > 500 && i.cost <= 1500)
  const tier3 = regularItems.filter(i => i.cost > 1500 && i.cost <= 3000)
  const tier4 = regularItems.filter(i => i.cost > 3000 && i.cost <= 5000)
  const tier5 = regularItems.filter(i => i.cost > 5000)
  
  return [
    { key: 'consumable', label: '🧪 消耗品', items: consumables, color: '#10b981' },
    { key: 'tier1', label: '💰 基础物品 (≤500)', items: tier1, color: '#6b7280' },
    { key: 'tier2', label: '⚔️ 中级物品 (500-1500)', items: tier2, color: '#3b82f6' },
    { key: 'tier3', label: '🗡️ 高级物品 (1500-3000)', items: tier3, color: '#8b5cf6' },
    { key: 'tier4', label: '💎 精品物品 (3000-5000)', items: tier4, color: '#f59e0b' },
    { key: 'tier5', label: '👑 顶级物品 (>5000)', items: tier5, color: '#ef4444' },
    { key: 'neutral', label: '🌲 中立物品', items: neutralItems, color: '#84cc16' }
  ].filter(g => g.items.length > 0)
})

// 统计
const stats = computed(() => ({
  total: props.items.length,
  selected: selectedItems.value.size,
  saved: savedItems.value.size
}))

// 解析 VPK
const parseVPK = async () => {
  parsing.value = true
  parseResult.value = null
  
  try {
    const result = await $fetch<{ success: boolean; message: string; output: string }>('/api/parse/items', {
      method: 'POST'
    })
    parseResult.value = { success: true, message: result.output || '解析完成' }
    emit('reload')
  } catch (e: any) {
    parseResult.value = { success: false, message: e.data?.message || '解析失败' }
  } finally {
    parsing.value = false
  }
}

// 切换选中状态
const toggleSelect = (name: string, event: Event) => {
  event.stopPropagation()
  if (selectedItems.value.has(name)) {
    selectedItems.value.delete(name)
  } else {
    selectedItems.value.add(name)
  }
}

// 全选当前筛选结果
const selectAll = () => {
  filteredItems.value.forEach(item => selectedItems.value.add(item.name))
}

// 取消全选
const deselectAll = () => {
  filteredItems.value.forEach(item => selectedItems.value.delete(item.name))
}

// 判断是否已保存
const isSaved = (name: string) => savedItems.value.has(name)

// 保存选中的物品到 traits.json（只保存选中的，未选中的移除）
const saveItems = async () => {
  saving.value = true
  try {
    // 只保留选中物品的 traits
    const traitsToSave: Record<string, ItemTraits> = {}
    for (const name of selectedItems.value) {
      traitsToSave[name] = itemTraits.value[name] || {}
    }
    
    await $fetch('/api/items/traits', {
      method: 'POST',
      body: { mode: 'replace', data: traitsToSave }
    })
    
    itemTraits.value = traitsToSave
    savedItems.value = new Set(selectedItems.value)
    ElMessage.success(`保存成功！共 ${selectedItems.value.size} 个物品`)
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 切换基础物品标记
const toggleBasicItem = async (name: string) => {
  const currentTraits = itemTraits.value[name] || {}
  const newIsBasic = !currentTraits.isBasic
  
  // 更新本地状态
  itemTraits.value = {
    ...itemTraits.value,
    [name]: { ...currentTraits, isBasic: newIsBasic }
  }
  
  // 保存到服务器
  try {
    await $fetch('/api/items/traits', {
      method: 'POST',
      body: { name, traits: { isBasic: newIsBasic } }
    })
    ElMessage.success(newIsBasic ? '已标记为基础物品' : '已取消基础物品标记')
  } catch (e: any) {
    ElMessage.error('保存失败')
  }
}

// 打开物品详情弹窗
const openItemDialog = (item: ItemData) => {
  selectedItem.value = item
  // 深拷贝当前 traits 用于编辑
  const currentTraits = itemTraits.value[item.name] || {}
  editingTraits.value = {
    isBasic: currentTraits.isBasic || false,
    attributes: { ...(currentTraits.attributes || {}) }
  }
  dialogVisible.value = true
}

// 保存弹窗中的自定义属性
const saveItemTraits = async () => {
  if (!selectedItem.value) return
  const name = selectedItem.value.name
  
  try {
    await $fetch('/api/items/traits', {
      method: 'POST',
      body: { name, traits: editingTraits.value }
    })
    // 更新本地状态
    itemTraits.value = { ...itemTraits.value, [name]: { ...editingTraits.value } }
    ElMessage.success('自定义属性已保存')
  } catch (e: any) {
    ElMessage.error('保存失败')
  }
}

// VPK 属性名到自定义属性名的映射
const vpkAttrMap: Record<string, keyof ItemAttributes> = {
  // bonus_ 前缀
  bonus_strength: 'strength', bonus_str: 'strength',
  bonus_agility: 'agility', bonus_agi: 'agility',
  bonus_intellect: 'intellect', bonus_intelligence: 'intellect', bonus_int: 'intellect',
  bonus_all_stats: 'allStats', bonus_damage: 'damage', bonus_attack_speed: 'attackSpeed',
  bonus_armor: 'armor', bonus_health: 'health', bonus_mana: 'mana',
  bonus_health_regen: 'healthRegen', bonus_mana_regen: 'manaRegen', bonus_mana_regen_pct: 'manaRegen',
  bonus_movement_speed: 'moveSpeed', bonus_movement: 'moveSpeed',
  bonus_evasion: 'evasion', bonus_magic_resistance: 'magicResist', bonus_magical_armor: 'magicResist',
  bonus_lifesteal: 'lifesteal', lifesteal_percent: 'lifesteal',
  spell_lifesteal: 'spellLifesteal', spell_lifesteal_amp: 'spellLifesteal',
  // 无 bonus 前缀
  armor: 'armor', mana_regen: 'manaRegen', health_regen: 'healthRegen', movement_speed: 'moveSpeed',
  bonus_aoe_armor: 'armor',
  // 光环属性
  aura_mana_regen: 'manaRegen', aura_health_regen: 'healthRegen', aura_armor: 'armor',
  aura_attack_speed: 'attackSpeed', aura_damage: 'damage',
}

// 点击左侧 VPK 属性，填充到右侧自定义属性
const fillAttrFromVPK = (key: string, value: any) => {
  const attrKey = vpkAttrMap[key]
  if (attrKey && editingTraits.value.attributes) {
    editingTraits.value.attributes[attrKey] = Number(value) || 0
    ElMessage.success(`已填充 ${key} → ${attrKey}: ${value}`)
  } else {
    ElMessage.warning(`未找到 ${key} 的映射`)
  }
}
const getComponentName = (componentName: string) => {
  const component = props.items.find(i => i.name === componentName)
  return component?.nameZh || component?.displayName || componentName.replace('item_', '')
}

// 计算总价（含配方）
const getTotalCost = (item: ItemData) => {
  if (!item.components) return item.cost
  let total = item.recipeCost || 0
  for (const comp of item.components) {
    const component = props.items.find(i => i.name === comp)
    if (component) {
      total += component.cost
    }
  }
  return total
}
</script>

<template>
  <div class="item-list">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索物品..."
        clearable
        style="width: 280px"
      >
        <template #prefix>
          <span>🔍</span>
        </template>
      </el-input>
      
      <div class="toolbar-actions">
        <el-button size="small" @click="selectAll">全选</el-button>
        <el-button size="small" @click="deselectAll">取消全选</el-button>
        <el-button
          type="primary"
          size="small"
          :loading="saving"
          @click="saveItems"
        >
          保存 ({{ stats.selected }})
        </el-button>
        <el-button
          size="small"
          :loading="parsing"
          @click="parseVPK"
        >
          {{ parsing ? '解析中...' : 'VPK → JSON' }}
        </el-button>
      </div>
    </div>

    <!-- 解析结果提示 -->
    <el-alert
      v-if="parseResult"
      :type="parseResult.success ? 'success' : 'error'"
      :title="parseResult.success ? '解析成功' : '解析失败'"
      :description="parseResult.message"
      show-icon
      closable
      style="margin-bottom: 16px;"
      @close="parseResult = null"
    />

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span class="stat">总计 <strong>{{ stats.total }}</strong> 物品</span>
      <span class="stat">已选中 <strong>{{ stats.selected }}</strong></span>
      <span class="stat">已保存 <strong>{{ stats.saved }}</strong></span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 物品列表 -->
    <div v-else class="groups-container">
      <div v-for="group in itemGroups" :key="group.key" class="item-group">
        <div class="group-header" :style="{ borderLeftColor: group.color }">
          <span class="group-label">{{ group.label }}</span>
          <span class="group-count">{{ group.items.length }}</span>
        </div>
        
        <div class="items-grid">
          <div
            v-for="item in group.items"
            :key="item.name"
            class="item-card"
            :class="{ 
              saved: isSaved(item.name), 
              selected: selectedItems.has(item.name) && !isSaved(item.name) 
            }"
            @click="openItemDialog(item)"
          >
            <div class="item-header">
              <el-checkbox
                :model-value="selectedItems.has(item.name)"
                @click="(e: Event) => toggleSelect(item.name, e)"
                @change="() => {}"
              />
              <span class="item-name">{{ item.nameZh || item.displayName }}</span>
              <span class="item-cost" v-if="item.cost > 0">{{ item.cost }}g</span>
            </div>
            
            <div class="item-meta">
              <span v-if="item.cooldown > 0" class="meta-tag cd">CD {{ item.cooldown }}s</span>
              <span v-if="item.manaCost > 0" class="meta-tag mana">{{ item.manaCost }} 蓝</span>
              <span v-if="item.secretShop" class="meta-tag secret">神秘</span>
              <span v-if="item.components" class="meta-tag recipe">合成</span>
              <span v-if="itemTraits[item.name]?.isBasic" class="meta-tag basic">基础</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 物品详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="selectedItem?.nameZh || selectedItem?.displayName || '物品详情'"
      width="1000px"
      destroy-on-close
    >
      <template v-if="selectedItem">
        <div class="dialog-content">
          <!-- 左侧：基本信息 -->
          <div class="dialog-left">
            <!-- 基本信息 -->
            <div class="info-section">
              <h4>📋 基本信息</h4>
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">中文名</span>
                  <span class="info-value">{{ selectedItem.nameZh || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">英文名</span>
                  <span class="info-value">{{ selectedItem.nameEn || selectedItem.displayName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">内部名</span>
                  <span class="info-value code">{{ selectedItem.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">价格</span>
                  <span class="info-value gold">{{ selectedItem.cost }}g</span>
                </div>
                <div class="info-row" v-if="selectedItem.cooldown > 0">
                  <span class="info-label">冷却时间</span>
                  <span class="info-value">{{ selectedItem.cooldown }}s</span>
                </div>
                <div class="info-row" v-if="selectedItem.manaCost > 0">
                  <span class="info-label">魔法消耗</span>
                  <span class="info-value mana">{{ selectedItem.manaCost }}</span>
                </div>
                <div class="info-row" v-if="selectedItem.castRange">
                  <span class="info-label">施法距离</span>
                  <span class="info-value">{{ selectedItem.castRange }}</span>
                </div>
                <div class="info-row" v-if="selectedItem.secretShop">
                  <span class="info-label">神秘商店</span>
                  <span class="info-value">✓</span>
                </div>
              </div>
            </div>

            <!-- 搜索别名 -->
            <div class="info-section" v-if="selectedItem.aliases && selectedItem.aliases.length > 0">
              <h4>🔍 搜索别名</h4>
              <div class="aliases-list">
                <el-tag 
                  v-for="alias in selectedItem.aliases" 
                  :key="alias" 
                  size="small"
                  type="warning"
                  effect="plain"
                >
                  {{ alias }}
                </el-tag>
              </div>
            </div>

            <!-- 物品配方 -->
            <div class="info-section" v-if="selectedItem.components">
              <h4>🔧 合成配方</h4>
              <div class="recipe-list">
                <div 
                  v-for="comp in selectedItem.components" 
                  :key="comp" 
                  class="recipe-item"
                >
                  <span class="recipe-name">{{ getComponentName(comp) }}</span>
                  <span class="recipe-cost">{{ props.items.find(i => i.name === comp)?.cost || 0 }}g</span>
                </div>
                <div v-if="selectedItem.recipeCost > 0" class="recipe-item recipe">
                  <span class="recipe-name">📜 卷轴</span>
                  <span class="recipe-cost">{{ selectedItem.recipeCost }}g</span>
                </div>
                <div class="recipe-total">
                  <span>总计</span>
                  <span class="total-cost">{{ getTotalCost(selectedItem) }}g</span>
                </div>
              </div>
            </div>

            <!-- 物品属性 -->
            <div class="info-section" v-if="Object.keys(selectedItem.attributes).length > 0">
              <h4>⚡ 物品属性</h4>
              <div class="attributes-list">
                <div 
                  v-for="(value, key) in selectedItem.attributes" 
                  :key="key" 
                  class="attr-item clickable"
                  @click="fillAttrFromVPK(key as string, value)"
                  title="点击填充到右侧"
                >
                  <span class="attr-key">{{ key }}</span>
                  <span class="attr-value">{{ value }}</span>
                </div>
              </div>
            </div>

            <!-- 商店标签 -->
            <div class="info-section" v-if="selectedItem.shopTags.length > 0">
              <h4>🏷️ 商店标签</h4>
              <div class="tags-list">
                <el-tag 
                  v-for="tag in selectedItem.shopTags" 
                  :key="tag" 
                  size="small"
                  type="info"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
          </div>

          <!-- 右侧：自定义属性编辑 -->
          <div class="dialog-right">
            <div class="custom-header">
              <h4>✏️ 自定义属性</h4>
              <el-switch v-model="editingTraits.isBasic" active-text="基础物品" />
            </div>
            
            <!-- 表单区域（可滚动） -->
            <div class="attrs-scroll">
              <div class="attrs-groups">
                <div class="attr-group">
                  <div class="group-label">📊 基础属性</div>
                  <div class="group-fields">
                    <div class="attr-input"><label>力量</label><el-input-number v-model="editingTraits.attributes!.strength" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>敏捷</label><el-input-number v-model="editingTraits.attributes!.agility" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>智力</label><el-input-number v-model="editingTraits.attributes!.intellect" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>全属性</label><el-input-number v-model="editingTraits.attributes!.allStats" :min="0" :controls="false" size="small" /></div>
                  </div>
                </div>
                
                <div class="attr-group">
                  <div class="group-label">⚔️ 攻击</div>
                  <div class="group-fields">
                    <div class="attr-input"><label>攻击力</label><el-input-number v-model="editingTraits.attributes!.damage" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>攻速</label><el-input-number v-model="editingTraits.attributes!.attackSpeed" :min="0" :controls="false" size="small" /></div>
                  </div>
                </div>
                
                <div class="attr-group">
                  <div class="group-label">🛡️ 防御</div>
                  <div class="group-fields">
                    <div class="attr-input"><label>护甲</label><el-input-number v-model="editingTraits.attributes!.armor" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>魔抗%</label><el-input-number v-model="editingTraits.attributes!.magicResist" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>闪避%</label><el-input-number v-model="editingTraits.attributes!.evasion" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>生命值</label><el-input-number v-model="editingTraits.attributes!.health" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>魔法值</label><el-input-number v-model="editingTraits.attributes!.mana" :min="0" :controls="false" size="small" /></div>
                  </div>
                </div>
                
                <div class="attr-group">
                  <div class="group-label">💚 续航</div>
                  <div class="group-fields">
                    <div class="attr-input"><label>生命恢复</label><el-input-number v-model="editingTraits.attributes!.healthRegen" :min="0" :precision="2" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>魔法恢复</label><el-input-number v-model="editingTraits.attributes!.manaRegen" :min="0" :precision="2" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>吸血%</label><el-input-number v-model="editingTraits.attributes!.lifesteal" :min="0" :controls="false" size="small" /></div>
                    <div class="attr-input"><label>法吸%</label><el-input-number v-model="editingTraits.attributes!.spellLifesteal" :min="0" :controls="false" size="small" /></div>
                  </div>
                </div>
                
                <div class="attr-group">
                  <div class="group-label">🏃 机动</div>
                  <div class="group-fields">
                    <div class="attr-input"><label>移速</label><el-input-number v-model="editingTraits.attributes!.moveSpeed" :min="0" :controls="false" size="small" /></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 固定底部按钮 -->
            <div class="save-btn-wrapper">
              <el-button type="primary" @click="saveItemTraits" style="width: 100%;">
                💾 保存自定义属性
              </el-button>
            </div>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.item-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #6b7280;
}

.stat strong {
  color: #1f2937;
  margin-left: 4px;
}

.loading {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

.groups-container {
  flex: 1;
  overflow-y: auto;
}

.item-group {
  margin-bottom: 20px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-left: 3px solid;
  border-radius: 4px;
  margin-bottom: 10px;
}

.group-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
}

.group-count {
  font-size: 0.75rem;
  color: #9ca3af;
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 3px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.item-card {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.item-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

/* 已保存状态 - 蓝色背景 */
.item-card.saved {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* 已选中但未保存 - 淡蓝色背景 */
.item-card.selected {
  background: #e0f2fe;
  border-color: #38bdf8;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.item-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.85rem;
  color: #1f2937;
}

.item-cost {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 600;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: 24px;
}

.meta-tag {
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 3px;
  background: #f3f4f6;
  color: #6b7280;
}

.meta-tag.cd { background: #dbeafe; color: #2563eb; }
.meta-tag.mana { background: #e0e7ff; color: #4f46e5; }
.meta-tag.secret { background: #fef3c7; color: #92400e; }
.meta-tag.recipe { background: #dcfce7; color: #16a34a; }
.meta-tag.basic { background: #fce7f3; color: #be185d; }

/* 弹窗样式 */
.dialog-content {
  display: flex;
  gap: 24px;
  min-height: 400px;
}

.dialog-left {
  flex: 1;
  min-width: 0;
}

.dialog-right {
  width: 480px;
  flex-shrink: 0;
  border-left: 1px solid #e5e7eb;
  padding-left: 24px;
  display: flex;
  flex-direction: column;
}


.info-section {
  margin-bottom: 20px;
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #374151;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f9fafb;
  border-radius: 4px;
}

.info-label {
  color: #6b7280;
  font-size: 0.8rem;
}

.info-value {
  font-weight: 500;
  font-size: 0.85rem;
  color: #1f2937;
}

.info-value.code {
  font-family: monospace;
  font-size: 0.75rem;
  background: #e5e7eb;
  padding: 1px 6px;
  border-radius: 3px;
}

.info-value.gold {
  color: #f59e0b;
}

.info-value.mana {
  color: #4f46e5;
}

/* 配方样式 */
.recipe-list {
  background: #f9fafb;
  border-radius: 6px;
  padding: 10px;
}

.recipe-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  border-bottom: 1px dashed #e5e7eb;
}

.recipe-item:last-child {
  border-bottom: none;
}

.recipe-item.recipe {
  color: #6b7280;
  font-style: italic;
}

.recipe-name {
  font-size: 0.85rem;
  color: #374151;
}

.recipe-cost {
  font-size: 0.8rem;
  color: #f59e0b;
  font-weight: 500;
}

.recipe-total {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  margin-top: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  font-weight: 600;
}

.total-cost {
  color: #ea580c;
}

/* 属性样式 */
.attributes-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.attr-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f0fdf4;
  border-radius: 4px;
  font-size: 0.8rem;
}

.attr-item.clickable {
  cursor: pointer;
  transition: all 0.15s;
}

.attr-item.clickable:hover {
  background: #dcfce7;
  transform: translateX(2px);
}

.attr-key {
  color: #6b7280;
  font-family: monospace;
  font-size: 0.75rem;
}

.attr-value {
  color: #16a34a;
  font-weight: 500;
}

/* 标签样式 */
.tags-list,
.aliases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 自定义属性区域 */
.custom-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px; }
.custom-header h4 { margin: 0; font-size: 0.95rem; }

/* 表单滚动区域 */
.attrs-scroll { 
  flex: 1;
  overflow-y: auto; 
  padding-right: 8px;
}
.attrs-scroll::-webkit-scrollbar { width: 6px; }
.attrs-scroll::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
.attrs-scroll::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
.attrs-scroll::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }

/* 属性分组布局 */
.attrs-groups { display: flex; flex-direction: column; gap: 12px; }
.attr-group { background: #f9fafb; border-radius: 8px; padding: 12px; }
.group-label { font-size: 0.8rem; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
.group-fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.attr-input { display: flex; align-items: center; gap: 8px; }
.attr-input label { font-size: 0.8rem; color: #374151; min-width: 60px; }
.attr-input .el-input-number { flex: 1; }

/* 固定底部按钮 */
.save-btn-wrapper { padding-top: 16px; border-top: 1px solid #e5e7eb; margin-top: 12px; }
</style>
