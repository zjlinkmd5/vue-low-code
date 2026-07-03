<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCanvas } from '@/composables/useCanvas'
import { getComponentConfig, datePickerTypes, inputTypes, derivedFieldTypes, numberFormats, buttonSubmitTypes } from '@/data/components'
import type { DerivedField } from '@/types'
import ModalDialog from './ModalDialog.vue'
import StyleEditor from './StyleEditor.vue'
import type { ConditionRule } from '@/types'

const { selectedComponent, updateComponent, updateFieldBinding, updateVisibility, updateDisabled, updateSelectOptions, fieldNames, components, cleanupAttrNameReferences } = useCanvas()

const config = computed(() => {
  if (!selectedComponent.value) return null
  return getComponentConfig(selectedComponent.value.type)
})

const allAttrNames = computed(() => {
  const names = new Set<string>()
  function collectNames(comps: typeof components.value) {
    for (const comp of comps) {
      if (comp.type === 'Select' && comp.props.customAttrNames) {
        const attrNames = comp.props.customAttrNames as string[]
        attrNames.forEach(name => names.add(name))
      }
      if (comp.children) {
        collectNames(comp.children)
      }
    }
  }
  collectNames(components.value)
  if (selectedComponent.value?.type === 'Select' && selectedComponent.value.props.customAttrNames) {
    const currentNames = selectedComponent.value.props.customAttrNames as string[]
    currentNames.forEach(name => names.delete(name))
  }
  return Array.from(names)
})

const showOptionsModal = ref(false)
const showVisibilityModal = ref(false)
const showDisabledModal = ref(false)
const showStyleEditor = ref(false)
const currentStyle = ref('')
const fieldBindingError = ref('')

watch(() => selectedComponent.value, (comp) => {
  if (comp) {
    currentStyle.value = comp.props.customStyle as string || ''
  }
})

function updateProp(key: string, value: unknown) {
  if (!selectedComponent.value) return
  updateComponent(selectedComponent.value.id, { [key]: value })
}

function handleFieldBindingBlur() {
  if (!selectedComponent.value) return
  
  const fieldName = selectedComponent.value.fieldBinding?.fieldName?.trim()
  if (!fieldName) {
    fieldBindingError.value = ''
    updateFieldBinding(selectedComponent.value.id, { 
      fieldName: '', 
      labelField: selectedComponent.value.fieldBinding?.labelField || '', 
      valueField: selectedComponent.value.fieldBinding?.valueField || '' 
    })
    return
  }
  
  const success = updateFieldBinding(selectedComponent.value.id, { 
    fieldName, 
    labelField: selectedComponent.value.fieldBinding?.labelField || '', 
    valueField: selectedComponent.value.fieldBinding?.valueField || '' 
  })
  
  if (!success) {
    fieldBindingError.value = '该字段名已被其他组件绑定'
    setTimeout(() => {
      if (selectedComponent.value) {
        selectedComponent.value.fieldBinding!.fieldName = ''
      }
      fieldBindingError.value = ''
    }, 2000)
  } else {
    fieldBindingError.value = ''
  }
}

function getSelectOptions() {
  if (!selectedComponent.value) return []
  return selectedComponent.value.props.options as { label: string; value: string; customAttrs?: Record<string, string> }[] || []
}

function getVisibilityConditions() {
  if (!selectedComponent.value) return []
  return selectedComponent.value.visibility?.conditions || []
}

function getDisabledConditions() {
  if (!selectedComponent.value) return []
  return selectedComponent.value.disabled?.conditions || []
}

function handleOptionsSave(data: unknown) {
  const result = data as { options: { label: string; value: string; customAttrs?: Record<string, string> }[]; customAttrNames: string[]; submitFields: string[] }
  const oldAttrNames = selectedComponent.value?.props.customAttrNames as string[] || []
  const deletedAttrNames = oldAttrNames.filter(name => !result.customAttrNames.includes(name))
  for (const name of deletedAttrNames) {
    cleanupAttrNameReferences(name)
  }
  updateSelectOptions(selectedComponent.value!.id, result.options)
  updateProp('customAttrNames', result.customAttrNames)
  updateProp('submitFields', result.submitFields)
}

function handleVisibilitySave(conditions: unknown) {
  updateVisibility(selectedComponent.value!.id, {
    enabled: selectedComponent.value?.visibility?.enabled || false,
    conditions: conditions as ConditionRule[]
  })
}

function handleDisabledSave(conditions: unknown) {
  updateDisabled(selectedComponent.value!.id, {
    enabled: selectedComponent.value?.disabled?.enabled || false,
    conditions: conditions as ConditionRule[]
  })
}

function toggleVisibility(enabled: boolean) {
  updateVisibility(selectedComponent.value!.id, {
    enabled,
    conditions: getVisibilityConditions()
  })
}

function toggleDisabled(enabled: boolean) {
  updateDisabled(selectedComponent.value!.id, {
    enabled,
    conditions: getDisabledConditions()
  })
}



function handleStyleSave(style: string) {
  updateProp('customStyle', style)
}

function openStyleEditor() {
  if (selectedComponent.value) {
    currentStyle.value = selectedComponent.value.props.customStyle as string || ''
    showStyleEditor.value = true
  }
}

const derivedFields = ref<DerivedField[]>([])

watch(() => selectedComponent.value, (comp) => {
  if (comp) {
    derivedFields.value = (comp.props.derivedFields as DerivedField[]) || []
  }
}, { immediate: true })

function addDerivedField() {
  derivedFields.value.push({
    name: '',
    type: 'concat',
    config: {
      fields: [],
      separator: '',
      format: '',
      targetDate: '',
      operator: '==',
      expression: ''
    }
  })
}

function removeDerivedField(index: number) {
  derivedFields.value.splice(index, 1)
  derivedFields.value = [...derivedFields.value]
}

function updateDerivedFields() {
  if (!selectedComponent.value) return
  updateProp('derivedFields', [...derivedFields.value])
}
</script>

<template>
  <div class="property-panel">
    <div class="panel-header">
      <h2>属性配置</h2>
    </div>
    
    <div v-if="!selectedComponent" class="empty-state">
      <i class="el-icon-info"></i>
      <p>请选择一个组件</p>
    </div>
    
    <div v-else class="panel-content">
      <div class="property-group">
        <label class="property-label">组件名称</label>
        <div class="property-value">{{ config?.label }}</div>
      </div>
      
      <div class="property-group">
        <label class="property-label">字段绑定</label>
        <el-input
          v-model="selectedComponent.fieldBinding!.fieldName"
          placeholder="输入字段名称"
          @blur="handleFieldBindingBlur"
        />
        <div v-if="fieldBindingError" class="error-message">{{ fieldBindingError }}</div>
      </div>
      
      <div class="property-group">
        <label class="property-label">显隐条件</label>
        <div class="condition-toggle">
          <el-switch
            :model-value="selectedComponent.visibility?.enabled"
            @change="toggleVisibility($event)"
          />
          <el-button size="small" type="primary" @click="showVisibilityModal = true">
            编辑条件
          </el-button>
        </div>
        <div v-if="selectedComponent.visibility?.enabled && getVisibilityConditions().length > 0" class="condition-summary">
          已配置 {{ getVisibilityConditions().length }} 个条件
        </div>
      </div>
      
      <div class="property-group">
        <label class="property-label">禁用条件</label>
        <div class="condition-toggle">
          <el-switch
            :model-value="selectedComponent.disabled?.enabled"
            @change="toggleDisabled($event)"
          />
          <el-button size="small" type="primary" @click="showDisabledModal = true">
            编辑条件
          </el-button>
        </div>
        <div v-if="selectedComponent.disabled?.enabled && getDisabledConditions().length > 0" class="condition-summary">
          已配置 {{ getDisabledConditions().length }} 个条件
        </div>
      </div>
      
      <div class="property-group">
        <label class="property-label">自定义样式</label>
        <el-button size="small" type="primary" @click="openStyleEditor" style="width: 100%;">
          编辑样式
        </el-button>
        <div v-if="selectedComponent.props.customStyle" class="style-preview">
          <pre>{{ selectedComponent.props.customStyle }}</pre>
        </div>
      </div>
      
      <div v-if="selectedComponent.type === 'Text'" class="property-group">
        <label class="property-label">文本内容</label>
        <el-input
          v-model="selectedComponent.props.content"
          @input="updateProp('content', selectedComponent.props.content)"
        />
        
        <label class="property-label">字体大小</label>
        <el-input
          v-model="selectedComponent.props.fontSize"
          @input="updateProp('fontSize', selectedComponent.props.fontSize)"
        />
        
        <label class="property-label">字体粗细</label>
        <el-select
          v-model="selectedComponent.props.fontWeight"
          @change="updateProp('fontWeight', $event)"
        >
          <el-option label="正常" value="normal" />
          <el-option label="粗体" value="bold" />
        </el-select>
        
        <label class="property-label">字体颜色</label>
        <el-color-picker
          v-model="selectedComponent.props.color"
          @change="updateProp('color', $event)"
        />
        
        <label class="property-label">对齐方式</label>
        <el-select
          v-model="selectedComponent.props.textAlign"
          @change="updateProp('textAlign', $event)"
        >
          <el-option label="左对齐" value="left" />
          <el-option label="居中" value="center" />
          <el-option label="右对齐" value="right" />
        </el-select>
      </div>
      
      <div v-else-if="selectedComponent.type === 'Heading'" class="property-group">
        <label class="property-label">标题内容</label>
        <el-input
          v-model="selectedComponent.props.content"
          @input="updateProp('content', selectedComponent.props.content)"
        />
        
        <label class="property-label">标题级别</label>
        <el-select
          v-model="selectedComponent.props.level"
          @change="updateProp('level', $event)"
        >
          <el-option label="H1" :value="1" />
          <el-option label="H2" :value="2" />
          <el-option label="H3" :value="3" />
        </el-select>
        
        <label class="property-label">标题颜色</label>
        <el-color-picker
          v-model="selectedComponent.props.color"
          @change="updateProp('color', $event)"
        />
      </div>
      
      <div v-else-if="selectedComponent.type === 'Button'" class="property-group">
        <label class="property-label">按钮文字</label>
        <el-input
          v-model="selectedComponent.props.text"
          @input="updateProp('text', selectedComponent.props.text)"
        />
        
        <label class="property-label">按钮类型</label>
        <el-select
          v-model="selectedComponent.props.type"
          @change="updateProp('type', $event)"
        >
          <el-option label="默认" value="default" />
          <el-option label="主要" value="primary" />
          <el-option label="成功" value="success" />
          <el-option label="警告" value="warning" />
          <el-option label="危险" value="danger" />
        </el-select>
        
        <label class="property-label">按钮大小</label>
        <el-select
          v-model="selectedComponent.props.size"
          @change="updateProp('size', $event)"
        >
          <el-option label="小型" value="small" />
          <el-option label="中等" value="medium" />
          <el-option label="大型" value="large" />
        </el-select>
        
        <label class="property-label">圆角</label>
        <el-switch
          v-model="selectedComponent.props.round"
          @change="updateProp('round', $event)"
        />
        
        <label class="property-label">提交类型</label>
        <el-select
          v-model="selectedComponent.props.submitType"
          @change="updateProp('submitType', $event)"
        >
          <el-option v-for="t in buttonSubmitTypes" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </div>
      
      <div v-else-if="selectedComponent.type === 'Image'" class="property-group">
        <label class="property-label">图片地址</label>
        <el-input
          v-model="selectedComponent.props.src"
          @input="updateProp('src', selectedComponent.props.src)"
        />
        
        <label class="property-label">图片描述</label>
        <el-input
          v-model="selectedComponent.props.alt"
          @input="updateProp('alt', selectedComponent.props.alt)"
        />
        
        <label class="property-label">宽度</label>
        <el-input
          v-model="selectedComponent.props.width"
          @input="updateProp('width', selectedComponent.props.width)"
        />
        
        <label class="property-label">高度</label>
        <el-input
          v-model="selectedComponent.props.height"
          @input="updateProp('height', selectedComponent.props.height)"
        />
        
        <label class="property-label">圆角</label>
        <el-input
          v-model="selectedComponent.props.borderRadius"
          @input="updateProp('borderRadius', selectedComponent.props.borderRadius)"
        />
      </div>
      
      <div v-else-if="selectedComponent.type === 'Input'" class="property-group">
        <label class="property-label">占位符</label>
        <el-input
          v-model="selectedComponent.props.placeholder"
          @input="updateProp('placeholder', selectedComponent.props.placeholder)"
        />
        
        <label class="property-label">组件大小</label>
        <el-select
          v-model="selectedComponent.props.size"
          @change="updateProp('size', $event)"
        >
          <el-option label="小型" value="small" />
          <el-option label="中等" value="medium" />
          <el-option label="大型" value="large" />
        </el-select>
        
        <label class="property-label">可清除</label>
        <el-switch
          v-model="selectedComponent.props.clearable"
          @change="updateProp('clearable', $event)"
        />
        
        <label class="property-label">必填</label>
        <el-switch
          v-model="selectedComponent.props.required"
          @change="updateProp('required', $event)"
        />
        
        <label class="property-label">输入类型</label>
        <el-select
          v-model="selectedComponent.props.inputType"
          @change="updateProp('inputType', $event)"
        >
          <el-option v-for="t in inputTypes" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        
        <label class="property-label">最大长度</label>
        <el-input-number
          v-model="selectedComponent.props.maxLength"
          @change="updateProp('maxLength', $event)"
          :min="0"
          :placeholder="'不限制'"
        />
        
        <label v-if="selectedComponent.props.inputType === 'number' || selectedComponent.props.inputType === 'decimal'" class="property-label">最小值</label>
        <el-input
          v-if="selectedComponent.props.inputType === 'number' || selectedComponent.props.inputType === 'decimal'"
          v-model="selectedComponent.props.minValue"
          type="number"
          placeholder="不限制"
          @input="updateProp('minValue', selectedComponent.props.minValue)"
        />
        
        <label v-if="selectedComponent.props.inputType === 'number' || selectedComponent.props.inputType === 'decimal'" class="property-label">最大值</label>
        <el-input
          v-if="selectedComponent.props.inputType === 'number' || selectedComponent.props.inputType === 'decimal'"
          v-model="selectedComponent.props.maxValue"
          type="number"
          placeholder="不限制"
          @input="updateProp('maxValue', selectedComponent.props.maxValue)"
        />
        
        <label v-if="selectedComponent.props.inputType === 'decimal'" class="property-label">小数位数</label>
        <el-input-number
          v-if="selectedComponent.props.inputType === 'decimal'"
          v-model="selectedComponent.props.decimalPlaces"
          @change="updateProp('decimalPlaces', $event)"
          :min="0"
          :max="10"
          :placeholder="'不限制'"
        />
      </div>
      
      <div v-else-if="selectedComponent.type === 'Select'" class="property-group">
        <label class="property-label">占位符</label>
        <el-input
          v-model="selectedComponent.props.placeholder"
          @input="updateProp('placeholder', selectedComponent.props.placeholder)"
        />
        
        <label class="property-label">组件大小</label>
        <el-select
          v-model="selectedComponent.props.size"
          @change="updateProp('size', $event)"
        >
          <el-option label="小型" value="small" />
          <el-option label="中等" value="medium" />
          <el-option label="大型" value="large" />
        </el-select>
        
        <label class="property-label">必填</label>
        <el-switch
          v-model="selectedComponent.props.required"
          @change="updateProp('required', $event)"
        />
        
        <label class="property-label">下拉选项</label>
        <el-button size="small" type="primary" @click="showOptionsModal = true" style="width: 100%;">
          编辑选项 ({{ getSelectOptions().length }} 个)
        </el-button>
      </div>
      
      <div v-else-if="selectedComponent.type === 'DatePicker'" class="property-group">
        <label class="property-label">占位符</label>
        <el-input
          v-model="selectedComponent.props.placeholder"
          @input="updateProp('placeholder', selectedComponent.props.placeholder)"
        />
        
        <label class="property-label">组件大小</label>
        <el-select
          v-model="selectedComponent.props.size"
          @change="updateProp('size', $event)"
        >
          <el-option label="小型" value="small" />
          <el-option label="中等" value="medium" />
          <el-option label="大型" value="large" />
        </el-select>
        
        <label class="property-label">选择类型</label>
        <el-select
          v-model="selectedComponent.props.type"
          @change="updateProp('type', $event)"
        >
          <el-option v-for="t in datePickerTypes" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        
        <label class="property-label">区间选择</label>
        <el-switch
          v-model="selectedComponent.props.range"
          @change="updateProp('range', $event)"
        />
        
        <label class="property-label">必填</label>
        <el-switch
          v-model="selectedComponent.props.required"
          @change="updateProp('required', $event)"
        />
      </div>
      
      <div v-else-if="selectedComponent.type === 'Card'" class="property-group">
        <label class="property-label">卡片标题</label>
        <el-input
          v-model="selectedComponent.props.title"
          @input="updateProp('title', selectedComponent.props.title)"
        />
        
        <label class="property-label">阴影</label>
        <el-select
          v-model="selectedComponent.props.shadow"
          @change="updateProp('shadow', $event)"
        >
          <el-option label="始终" value="always" />
          <el-option label="悬停" value="hover" />
          <el-option label="从不" value="never" />
        </el-select>
      </div>
      
      <div v-else-if="selectedComponent.type === 'Grid'" class="property-group">
        <label class="property-label">列数</label>
        <el-select
          v-model="selectedComponent.props.columns"
          @change="updateProp('columns', $event)"
        >
          <el-option label="1列" :value="1" />
          <el-option label="2列" :value="2" />
          <el-option label="3列" :value="3" />
          <el-option label="4列" :value="4" />
        </el-select>
        
        <label class="property-label">间距</label>
        <el-input-number
          v-model="selectedComponent.props.gutter"
          @change="updateProp('gutter', $event)"
          :min="0"
          :max="100"
        />
        
        <div v-if="selectedComponent.children && selectedComponent.children.length > 0" class="children-info">
          <label class="property-label">子组件</label>
          <div class="children-list">
            <div v-for="child in selectedComponent.children" :key="child.id" class="child-item">
              {{ getComponentConfig(child.type)?.label || child.type }}
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="selectedComponent.type === 'Divider'" class="property-group">
        <label class="property-label">分割线内容</label>
        <el-input
          v-model="selectedComponent.props.content"
          @input="updateProp('content', selectedComponent.props.content)"
        />
        
        <label class="property-label">方向</label>
        <el-select
          v-model="selectedComponent.props.direction"
          @change="updateProp('direction', $event)"
        >
          <el-option label="水平" value="horizontal" />
          <el-option label="垂直" value="vertical" />
        </el-select>
      </div>
      
      <div class="property-group">
        <label class="property-label">衍生字段</label>
        <el-button size="small" type="primary" @click="addDerivedField" style="width: 100%;">
          添加衍生字段
        </el-button>
        
        <div v-if="derivedFields.length > 0" class="derived-fields-list">
          <div v-for="(field, index) in derivedFields" :key="index" class="derived-field-item">
            <div class="field-header">
              <span class="field-name-label">{{ field.name }}</span>
              <el-button size="small" type="danger" @click="removeDerivedField(index)">删除</el-button>
            </div>
            
            <label class="property-label">字段名称</label>
            <el-input
              v-model="field.name"
              @input="updateDerivedFields"
              placeholder="输入衍生字段名称"
            />
            
            <label class="property-label">处理类型</label>
            <el-select
              v-model="field.type"
              @change="updateDerivedFields"
            >
              <el-option v-for="t in derivedFieldTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
            
            <div v-if="field.type === 'concat'" class="derived-field-config">
              <label class="property-label">源字段</label>
              <el-select
                v-model="field.config.fields"
                multiple
                @change="updateDerivedFields"
                style="width: 100%;"
              >
                <el-option v-for="name in fieldNames" :key="name" :label="name" :value="name" />
              </el-select>
              <label class="property-label">分隔符</label>
              <el-input
                v-model="field.config.separator"
                @input="updateDerivedFields"
                placeholder="如：-、/、空格等"
              />
            </div>
            
            <div v-if="field.type === 'numberFormat'" class="derived-field-config">
              <label class="property-label">源字段</label>
              <el-select
                v-model="field.config.fields"
                multiple
                @change="updateDerivedFields"
                style="width: 100%;"
              >
                <el-option v-for="name in fieldNames" :key="name" :label="name" :value="name" />
              </el-select>
              <label class="property-label">格式</label>
              <el-select
                v-model="field.config.format"
                @change="updateDerivedFields"
              >
                <el-option v-for="f in numberFormats" :key="f.value" :label="f.label" :value="f.value" />
              </el-select>
            </div>
            
            <div v-if="field.type === 'dateCompare'" class="derived-field-config">
              <label class="property-label">源字段</label>
              <el-select
                v-model="field.config.fields"
                multiple
                @change="updateDerivedFields"
                style="width: 100%;"
              >
                <el-option v-for="name in fieldNames" :key="name" :label="name" :value="name" />
              </el-select>
              <label class="property-label">目标日期</label>
              <el-date-picker
                v-model="field.config.targetDate"
                type="date"
                @change="updateDerivedFields"
                style="width: 100%;"
              />
              <label class="property-label">比较操作</label>
              <el-select
                v-model="field.config.operator"
                @change="updateDerivedFields"
              >
                <el-option label="等于" value="==" />
                <el-option label="不等于" value="!=" />
                <el-option label="大于" value=">" />
                <el-option label="小于" value="<" />
                <el-option label="大于等于" value=">=" />
                <el-option label="小于等于" value="<=" />
              </el-select>
            </div>
            
            <div v-if="field.type === 'custom'" class="derived-field-config">
              <label class="property-label">自定义表达式</label>
              <el-input
                v-model="field.config.expression"
                @input="updateDerivedFields"
                type="textarea"
                placeholder="支持字段引用，如：${fieldName} + 100"
                :rows="3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <ModalDialog
      v-model:visible="showOptionsModal"
      type="options"
      title="编辑下拉选项"
      :options="getSelectOptions()"
      :field-names="fieldNames"
      :exclude-field-name="selectedComponent?.fieldBinding?.fieldName"
      :all-attr-names="allAttrNames"
      @save="handleOptionsSave"
    />
    
    <ModalDialog
      v-model:visible="showVisibilityModal"
      type="visibility"
      title="编辑显隐条件"
      :conditions="getVisibilityConditions()"
      :field-names="fieldNames"
      :exclude-field-name="selectedComponent?.fieldBinding?.fieldName"
      @save="handleVisibilitySave"
    />
    
    <ModalDialog
      v-model:visible="showDisabledModal"
      type="disabled"
      title="编辑禁用条件"
      :conditions="getDisabledConditions()"
      :field-names="fieldNames"
      :exclude-field-name="selectedComponent?.fieldBinding?.fieldName"
      @save="handleDisabledSave"
    />
    
    <StyleEditor
      v-model:visible="showStyleEditor"
      :current-style="currentStyle"
      @save="handleStyleSave"
    />
  </div>
</template>

<style lang="scss" scoped>
.property-panel {
  width: 320px;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  
  i {
    font-size: 32px;
    margin-bottom: 12px;
    color: #c0c4cc;
  }
  
  p {
    font-size: 14px;
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.property-group {
  margin-bottom: 20px;
}

.property-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.property-value {
  font-size: 14px;
  color: #333;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

:deep(.el-color-picker) {
  width: 100%;
}

:deep(.el-input-number) {
  width: 100%;
}

.condition-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.condition-summary {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.children-info {
  margin-top: 8px;
}

.children-list {
  margin-top: 8px;
}

.child-item {
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.error-message {
  margin-top: 8px;
  font-size: 12px;
  color: #f56c6c;
}

.style-preview {
  margin-top: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
  
  pre {
    margin: 0;
    font-size: 12px;
    color: #666;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.derived-fields-list {
  margin-top: 8px;
}

.derived-field-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e9ecef;
}

.field-name-label {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.derived-field-config {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e9ecef;
}
</style>
