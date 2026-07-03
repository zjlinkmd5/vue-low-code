<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ConditionRule } from '@/types'
import { operators } from '@/data/components'

interface OptionItem {
  label: string
  value: string
  customAttrs?: Record<string, string>
}

const props = defineProps<{
  visible: boolean
  type: 'options' | 'visibility' | 'disabled'
  title: string
  options?: OptionItem[]
  conditions?: ConditionRule[]
  fieldNames?: string[]
  excludeFieldName?: string
  allAttrNames?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: unknown): void
}>()

const dialogVisible = ref(props.visible)
const localOptions = ref<OptionItem[]>([])
const localConditions = ref<ConditionRule[]>([])
const newOptionLabel = ref('')
const newOptionValue = ref('')
const customAttrNames = ref<string[]>([])
const newAttrName = ref('')
const submitFields = ref<string[]>([])
const attrNameError = ref('')
const optionsKey = ref(0)

const tableColumnStyle = computed(() => {
  const attrCount = customAttrNames.value.length
  if (attrCount === 0) {
    return '120px 100px 80px'
  }
  const attrWidth = Math.max(100, Math.floor((400) / attrCount))
  return `120px 100px ${customAttrNames.value.map(() => `${attrWidth}px`).join(' ')} 80px`
})

const filteredFieldNames = computed(() => {
  const names: string[] = []
  if (props.fieldNames) {
    names.push(...props.fieldNames.filter(name => name !== props.excludeFieldName))
  }
  names.push(...customAttrNames.value)
  return [...new Set(names)]
})

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    if (props.type === 'options') {
      localOptions.value = props.options ? JSON.parse(JSON.stringify(props.options)) : []
      collectAttrNames()
    } else {
      localConditions.value = props.conditions ? JSON.parse(JSON.stringify(props.conditions)) : []
    }
  }
})

function collectAttrNames() {
  const names = new Set<string>()
  for (const opt of localOptions.value) {
    if (opt.customAttrs) {
      for (const key of Object.keys(opt.customAttrs)) {
        names.add(key)
      }
    }
  }
  customAttrNames.value = Array.from(names)
}

function addOption() {
  if (!newOptionLabel.value.trim() || !newOptionValue.value.trim()) return
  const customAttrs: Record<string, string> = {}
  for (const name of customAttrNames.value) {
    customAttrs[name] = ''
  }
  const newOption: OptionItem = {
    label: newOptionLabel.value.trim(),
    value: newOptionValue.value.trim(),
    customAttrs
  }
  localOptions.value = [...localOptions.value, newOption]
  optionsKey.value++
  newOptionLabel.value = ''
  newOptionValue.value = ''
}

function removeOption(index: number) {
  localOptions.value.splice(index, 1)
}

function addAttrName() {
  const name = newAttrName.value.trim()
  if (!name) return
  if (customAttrNames.value.includes(name)) {
    attrNameError.value = '该属性名已存在'
    setTimeout(() => attrNameError.value = '', 2000)
    return
  }
  if (props.allAttrNames && props.allAttrNames.includes(name)) {
    attrNameError.value = '该属性名已被其他下拉框使用'
    setTimeout(() => attrNameError.value = '', 2000)
    return
  }
  customAttrNames.value.push(name)
  for (const opt of localOptions.value) {
    if (!opt.customAttrs) {
      opt.customAttrs = {}
    }
    if (!(name in opt.customAttrs)) {
      opt.customAttrs[name] = ''
    }
  }
  localOptions.value = [...localOptions.value]
  newAttrName.value = ''
}

function removeAttrName(name: string) {
  const index = customAttrNames.value.indexOf(name)
  if (index !== -1) {
    customAttrNames.value.splice(index, 1)
    customAttrNames.value = [...customAttrNames.value]
    for (const opt of localOptions.value) {
      if (opt.customAttrs) {
        delete opt.customAttrs[name]
      }
    }
    const fieldIndex = submitFields.value.indexOf(name)
    if (fieldIndex !== -1) {
      submitFields.value.splice(fieldIndex, 1)
    }
    submitFields.value = [...submitFields.value]
    localOptions.value = [...localOptions.value]
  }
}

function addCondition() {
  localConditions.value.push({ field: '', operator: '==', value: '' })
}

function removeCondition(index: number) {
  localConditions.value.splice(index, 1)
}

function handleSave() {
  if (props.type === 'options') {
    const result = {
      options: JSON.parse(JSON.stringify(localOptions.value)),
      customAttrNames: [...customAttrNames.value],
      submitFields: [...submitFields.value]
    }
    emit('save', result)
  } else {
    emit('save', JSON.parse(JSON.stringify(localConditions.value)))
  }
  dialogVisible.value = false
  emit('update:visible', false)
}

function handleClose() {
  dialogVisible.value = false
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="650px"
    @close="handleClose"
  >
    <template v-if="type === 'options'">
      <div class="options-container">
        <div class="attr-name-section">
          <div class="section-header">
            <span class="section-title">自定义属性名称（所有选项共用）</span>
          </div>
          <div class="attr-name-tags">
            <el-tag
              v-for="name in customAttrNames"
              :key="name"
              closable
              @close="removeAttrName(name)"
              class="attr-name-tag"
            >
              {{ name }}
            </el-tag>
          </div>
          <div class="add-attr-name-row">
            <el-input
              size="small"
              placeholder="输入属性名称"
              v-model="newAttrName"
              class="attr-name-input"
            />
            <el-button
              size="small"
              type="primary"
              icon="el-icon-plus"
              @click="addAttrName"
            >
              添加属性名
            </el-button>
            <span v-if="attrNameError" class="error-text">{{ attrNameError }}</span>
          </div>
        </div>

        <div class="submit-field-section">
          <div class="section-header">
            <span class="section-title">关联字段（选中选项时触发条件判断的字段）</span>
          </div>
          <el-select
            v-model="submitFields"
            placeholder="选择关联字段"
            size="small"
            multiple
            style="width: 300px;"
          >
            <el-option v-for="name in filteredFieldNames" :key="name" :label="name" :value="name" />
          </el-select>
          <span class="submit-field-hint">选中选项后，会将该选项的自定义属性值关联到表单中对应的字段，用于显隐/禁用条件判断</span>
        </div>

        <div class="options-table-section">
          <div class="section-header">
            <span class="section-title">选项列表</span>
          </div>
          <div class="options-table" :key="optionsKey">
            <div class="table-header" :style="{ gridTemplateColumns: tableColumnStyle }">
              <div class="th">显示文本</div>
              <div class="th">值</div>
              <div
                v-for="name in customAttrNames"
                :key="name"
                class="th"
              >
                {{ name }}
              </div>
              <div class="th th-action">操作</div>
            </div>
            <div
              v-for="(option, index) in localOptions"
              :key="index"
              class="table-row"
              :style="{ gridTemplateColumns: tableColumnStyle }"
            >
              <div class="td td-label">
                <el-input
                  size="small"
                  v-model="option.label"
                  class="option-input"
                />
              </div>
              <div class="td td-value">
                <el-input
                  size="small"
                  v-model="option.value"
                  class="option-input"
                />
              </div>
              <div
                v-for="name in customAttrNames"
                :key="name"
                class="td td-attr"
              >
                <el-input
                  size="small"
                  :model-value="option.customAttrs?.[name]"
                  @update:model-value="(val: string) => { if (!option.customAttrs) option.customAttrs = {}; option.customAttrs[name] = val }"
                  class="option-input"
                />
              </div>
              <div class="td td-action">
                <el-button
                  size="small"
                  type="danger"
                  icon="el-icon-delete"
                  @click="removeOption(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
          
          <div class="add-option-row">
            <el-input
              size="small"
              placeholder="显示文本"
              v-model="newOptionLabel"
              class="option-input"
            />
            <el-input
              size="small"
              placeholder="值"
              v-model="newOptionValue"
              class="option-input"
            />
            <el-input
              v-for="name in customAttrNames"
              :key="name"
              size="small"
              :placeholder="name"
              :disabled="true"
              class="option-input attr-input"
            />
            <el-button
              size="small"
              type="primary"
              icon="el-icon-plus"
              @click="addOption"
            >
              添加选项
            </el-button>
          </div>
        </div>
      </div>
    </template>
    
    <template v-else>
      <div class="conditions-container">
        <div
          v-for="(condition, index) in localConditions"
          :key="index"
          class="condition-row"
        >
          <el-select
            size="small"
            placeholder="选择字段"
            v-model="condition.field"
            class="condition-field"
          >
            <el-option v-for="name in filteredFieldNames" :key="name" :label="name" :value="name" />
          </el-select>
          <el-select
            size="small"
            placeholder="操作符"
            v-model="condition.operator"
            class="condition-operator"
          >
            <el-option v-for="op in operators" :key="op.value" :label="op.label" :value="op.value" />
          </el-select>
          <el-input
            v-if="condition.operator !== 'empty' && condition.operator !== 'notEmpty'"
            size="small"
            placeholder="值"
            v-model="condition.value"
            class="condition-value"
          />
          <el-button
            size="small"
            type="danger"
            icon="el-icon-delete"
            @click="removeCondition(index)"
          />
        </div>
        
        <el-button size="small" type="primary" icon="el-icon-plus" @click="addCondition">
          添加条件
        </el-button>
      </div>
    </template>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.options-container {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.attr-name-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.attr-name-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.attr-name-tag {
  margin-bottom: 4px;
}

.add-attr-name-row {
  display: flex;
  gap: 8px;
  align-items: center;
  
  .attr-name-input {
    flex: 1;
    max-width: 200px;
  }
}

.submit-field-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f0f5ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.submit-field-hint {
  font-size: 12px;
  color: #909399;
}

.options-table-section {
  margin-top: 16px;
}

.options-table {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  overflow-x: auto;
  display: block;
  max-width: 100%;
}

.table-header {
  display: grid;
  background: #f5f7fa;
  border-bottom: 1px solid #e8e8e8;
  min-width: max-content;
}

.th {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-align: left;
  white-space: nowrap;
  
  &.th-action {
    text-align: center;
  }
}

.table-row {
  display: grid;
  border-bottom: 1px solid #f0f0f0;
  min-width: max-content;
  
  &:last-child {
    border-bottom: none;
  }
}

.td {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  
  &.td-action {
    justify-content: center;
  }
  
  .option-input {
    width: 100%;
  }
}

.attr-input {
  background: #f5f7fa;
  cursor: not-allowed;
}

.add-option-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  align-items: center;
  
  .option-input {
    flex: 1;
    max-width: 150px;
  }
  
  .attr-input {
    flex: 1;
    max-width: 150px;
  }
}

.conditions-container {
  max-height: 400px;
  overflow-y: auto;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.condition-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  align-items: center;
  
  .condition-field, .condition-operator {
    width: 120px;
  }
  
  .condition-value {
    flex: 1;
  }
}
</style>
