<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { CanvasComponent } from '@/types'
import { useCanvas } from '@/composables/useCanvas'
import { regionCascaderData, type CascaderOption } from '@/data/regionData'
import FilePreview from './FilePreview.vue'

const props = defineProps<{
  component: CanvasComponent
  isSelected: boolean
  isDropTarget?: boolean
  dropTargetColumn?: number | null
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
  dragOverGrid: [event: DragEvent]
  dragLeaveGrid: []
  dropGrid: [event: DragEvent]
  dragOverColumn: [event: DragEvent, columnIndex: number]
  dragLeaveColumn: []
  dropColumn: [event: DragEvent, columnIndex: number]
  buttonClick: [submitType: string]
}>()

const { isVisible: checkVisible, isComponentDisabled: checkDisabled, getComponentSize, forceRefresh, refreshTrigger, formLabelWidth, labelPosition } = useCanvas()

const validationError = ref('')

watch(() => props.component.value, () => {
  validationError.value = ''
})

function validate(): boolean {
  const comp = props.component
  const value = comp.value ?? ''
  const required = comp.props.required as boolean || false
  const inputType = comp.props.inputType as string || 'text'
  const maxLength = comp.props.maxLength as number | null
  const minValue = comp.props.minValue as number | null
  const maxValue = comp.props.maxValue as number | null
  const decimalPlaces = comp.props.decimalPlaces as number | null
  
  if (required && (!value || String(value).trim() === '')) {
    validationError.value = '此字段为必填项'
    return false
  }
  
  if (!value) {
    validationError.value = ''
    return true
  }
  
  const strValue = String(value)
  
  if (maxLength !== null && strValue.length > maxLength) {
    validationError.value = `输入长度不能超过${maxLength}个字符`
    return false
  }
  
  switch (inputType) {
    case 'number':
      if (!/^\d+$/.test(strValue)) {
        validationError.value = '只能输入数字'
        return false
      }
      break
    case 'chinese':
      if (!/^[\u4e00-\u9fa5]+$/.test(strValue)) {
        validationError.value = '只能输入中文'
        return false
      }
      break
    case 'english':
      if (!/^[a-zA-Z]+$/.test(strValue)) {
        validationError.value = '只能输入英文'
        return false
      }
      break
    case 'englishNumber':
      if (!/^[a-zA-Z0-9]+$/.test(strValue)) {
        validationError.value = '只能输入英文和数字'
        return false
      }
      break
    case 'decimal':
      if (!/^\d+(\.\d+)?$/.test(strValue)) {
        validationError.value = '只能输入数字(可带小数)'
        return false
      }
      if (decimalPlaces !== null) {
        const parts = strValue.split('.')
        if (parts.length === 2 && parts[1].length > decimalPlaces) {
          validationError.value = `最多保留${decimalPlaces}位小数`
          return false
        }
      }
      break
  }
  
  if ((inputType === 'number' || inputType === 'decimal')) {
    const numValue = parseFloat(strValue)
    if (!isNaN(numValue)) {
      if (minValue !== null && numValue < minValue) {
        validationError.value = `值不能小于${minValue}`
        return false
      }
      if (maxValue !== null && numValue > maxValue) {
        validationError.value = `值不能大于${maxValue}`
        return false
      }
    }
  }
  
  validationError.value = ''
  return true
}

function clearValidation() {
  validationError.value = ''
}

function handleButtonClick() {
  const submitType = props.component.props.submitType as string || 'none'
  emit('buttonClick', submitType)
}

defineExpose({
  validate,
  clearValidation
})

const listColumns = computed(() => {
  return (props.component.props.columns as Array<{ key: string; label: string; width?: string; sortable?: boolean }>) || []
})

const listData = computed(() => {
  return (props.component.props.data as Array<Record<string, unknown>>) || []
})

const listMaxHeight = computed(() => {
  const height = props.component.props.maxHeight as string
  return height === 'auto' ? '600px' : height
})

const sortKey = ref('')
const sortOrder = ref<'ascending' | 'descending'>('ascending')

const currentPage = ref(1)
const pageSize = computed(() => {
  return (props.component.props.pageSize as number) || 10
})

const useVirtualScroll = computed(() => {
  return listData.value.length > 100
})

const sortedListData = computed(() => {
  let data = [...listData.value]
  
  if (sortKey.value) {
    const column = listColumns.value.find(c => c.key === sortKey.value)
    if (column) {
      const sortType = (column as any).sortType || 'string'
      
      data.sort((a, b) => {
        const valA = a[sortKey.value]
        const valB = b[sortKey.value]
        
        if (sortType === 'number') {
          const numA = parseFloat(String(valA)) || 0
          const numB = parseFloat(String(valB)) || 0
          return sortOrder.value === 'ascending' ? numA - numB : numB - numA
        } else if (sortType === 'date') {
          const dateA = new Date(String(valA))
          const dateB = new Date(String(valB))
          return sortOrder.value === 'ascending' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
        } else {
          return sortOrder.value === 'ascending' 
            ? String(valA).localeCompare(String(valB)) 
            : String(valB).localeCompare(String(valA))
        }
      })
    }
  }
  
  return data
})

const filteredListData = computed(() => {
  const data = sortedListData.value
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return data.slice(start, end)
})

const totalListData = computed(() => {
  return sortedListData.value.length
})

function handlePageChange(page: number) {
  currentPage.value = page
}

function handlePageSizeChange(size: number) {
  if (props.component.props) {
    props.component.props.pageSize = size
  }
  currentPage.value = 1
}

function handleListSort({ prop, order }: { prop: string; order: 'ascending' | 'descending' }) {
  sortKey.value = prop
  sortOrder.value = order
}

function isImageUrl(value: unknown): boolean {
  const str = String(value)
  return /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(str) || str.startsWith('data:image')
}

let imageObserver: IntersectionObserver | null = null

function initLazyImages() {
  if (imageObserver) {
    imageObserver.disconnect()
  }
  
  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        const src = img.getAttribute('data-src')
        if (src) {
          img.src = src
          img.classList.remove('lazy-image')
        }
        imageObserver?.unobserve(img)
      }
    })
  }, {
    rootMargin: '100px'
  })
  
  const images = document.querySelectorAll('.lazy-image')
  images.forEach(img => imageObserver!.observe(img))
}

watch(filteredListData, async () => {
  await nextTick()
  initLazyImages()
}, { deep: true })

if (typeof window !== 'undefined') {
  setTimeout(initLazyImages, 100)
}

const textStyle = computed(() => {
  const p = props.component.props as Record<string, string>
  return {
    fontSize: p.fontSize || '16px',
    fontWeight: p.fontWeight || 'normal',
    color: p.color || '#333',
    textAlign: (p.textAlign || 'left') as 'left' | 'center' | 'right'
  }
})

const imageStyle = computed(() => {
  const p = props.component.props as Record<string, string>
  return {
    width: p.width || '300px',
    height: p.height || '200px',
    borderRadius: p.borderRadius || '0px'
  }
})

const headingColor = computed(() => {
  return props.component.props.color as string || '#333'
})

const selectOptions = computed(() => {
  return props.component.props.options as { label: string; value: string; customAttrs?: Record<string, string> }[] || []
})

const labelText = computed(() => {
  return props.component.props.label as string || ''
})

const isRequired = computed(() => {
  return props.component.props.required as boolean || false
})

const labelStyle = computed(() => {
  if (labelPosition.value === 'top') {
    return { width: '100%', textAlign: 'left' as const }
  }
  return { width: formLabelWidth.value, flexShrink: 0, textAlign: 'right' as const }
})

const datePickerFormat = computed(() => {
  const type = props.component.props.type as string
  if (type === 'week') return 'YYYY[年的第]w[周]'
  if (type === 'weekrange') return 'YYYY[年的第]w[周]'
  if (type === 'month' || type === 'monthrange') return 'YYYY[年]MM[月]'
  if (type === 'year' || type === 'yearrange') return 'YYYY[年]'
  if (type === 'quarter' || type === 'quarterrange') return 'YYYY[年第]Q[季度]'
  if (type === 'datetime' || type === 'datetimerange') return 'YYYY-MM-DD HH:mm:ss'
  return 'YYYY-MM-DD'
})

const datePickerValueFormat = computed(() => {
  const type = props.component.props.type as string
  if (type === 'datetime' || type === 'datetimerange') return 'YYYY-MM-DD HH:mm:ss'
  return 'YYYY-MM-DD'
})

const isCustomRangeType = computed(() => {
  const type = props.component.props.type as string
  return type === 'weekrange' || type === 'quarterrange'
})

const customRangeStartType = computed(() => {
  const type = props.component.props.type as string
  if (type === 'weekrange') return 'week'
  if (type === 'quarterrange') return 'quarter'
  return 'date'
})

function getWeekStartEnd(dateStr: string): { start: Date; end: Date } {
  const d = new Date(dateStr)
  const day = d.getDay() || 7
  const start = new Date(d)
  start.setDate(d.getDate() - day + 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 0)
  return { start, end }
}

function getQuarterStartEnd(dateStr: string): { start: Date; end: Date } {
  const d = new Date(dateStr)
  const quarter = Math.floor(d.getMonth() / 3)
  const start = new Date(d.getFullYear(), quarter * 3, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(d.getFullYear(), quarter * 3 + 3, 0)
  end.setHours(23, 59, 59, 0)
  return { start, end }
}

function formatDateTime(date: Date): string {
  const Y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const D = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

function handleCustomRangeStartChange(val: unknown) {
  if (!val) {
    props.component.value = []
    forceRefresh()
    return
  }
  const type = props.component.props.type as string
  const currentVal = props.component.value as string[] | undefined
  let startRange: { start: Date; end: Date }
  let endRange: { start: Date; end: Date } | null = null
  
  if (type === 'weekrange') {
    startRange = getWeekStartEnd(val as string)
    if (currentVal && currentVal[1]) {
      endRange = getWeekStartEnd(currentVal[1])
    }
  } else {
    startRange = getQuarterStartEnd(val as string)
    if (currentVal && currentVal[1]) {
      endRange = getQuarterStartEnd(currentVal[1])
    }
  }
  
  if (endRange && endRange.start >= startRange.start) {
    props.component.value = [formatDateTime(startRange.start), formatDateTime(endRange.end)]
  } else {
    props.component.value = [formatDateTime(startRange.start), formatDateTime(startRange.end)]
  }
  forceRefresh()
}

function handleCustomRangeEndChange(val: unknown) {
  if (!val) {
    props.component.value = []
    forceRefresh()
    return
  }
  const type = props.component.props.type as string
  const currentVal = props.component.value as string[] | undefined
  let endRange: { start: Date; end: Date }
  let startRange: { start: Date; end: Date } | null = null
  
  if (type === 'weekrange') {
    endRange = getWeekStartEnd(val as string)
    if (currentVal && currentVal[0]) {
      startRange = getWeekStartEnd(currentVal[0])
    }
  } else {
    endRange = getQuarterStartEnd(val as string)
    if (currentVal && currentVal[0]) {
      startRange = getQuarterStartEnd(currentVal[0])
    }
  }
  
  if (startRange && startRange.start <= endRange.end) {
    props.component.value = [formatDateTime(startRange.start), formatDateTime(endRange.end)]
  } else {
    props.component.value = [formatDateTime(endRange.start), formatDateTime(endRange.end)]
  }
  forceRefresh()
}

function handleDateRangeChange(val: unknown) {
  if (Array.isArray(val) && val.length === 2 && val[0] && val[1]) {
    const start = new Date(val[0] as string)
    const end = new Date(val[1] as string)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 0)
    props.component.value = [formatDateTime(start), formatDateTime(end)]
  } else {
    props.component.value = val
  }
  forceRefresh()
}

function handleDateChange(val: unknown) {
  if (!val) {
    props.component.value = val
    forceRefresh()
    return
  }
  const type = props.component.props.type as string
  const d = new Date(val as string)
  if (isNaN(d.getTime())) {
    props.component.value = val
    forceRefresh()
    return
  }
  
  if (type === 'date' || type === 'week' || type === 'month' || type === 'year' || type === 'quarter') {
    d.setHours(0, 0, 0, 0)
    props.component.value = formatDateTime(d)
  } else if (type === 'datetime') {
    props.component.value = formatDateTime(d)
  } else {
    props.component.value = val
  }
  forceRefresh()
}

const customStartDateValue = computed(() => {
  const val = props.component.value
  if (Array.isArray(val) && val.length >= 1 && val[0]) {
    return val[0] as string
  }
  return ''
})

const customEndDateValue = computed(() => {
  const val = props.component.value
  if (Array.isArray(val) && val.length >= 2 && val[1]) {
    return val[1] as string
  }
  return ''
})

const cascaderOptions = computed(() => {
  const dataType = props.component.props.dataType as string
  if (dataType === 'region') {
    return regionCascaderData
  }
  return props.component.props.options as CascaderOption[] || []
})

function handleCascaderChange(val: unknown) {
  props.component.value = val
  forceRefresh()
}

const customStyle = computed(() => {
  const styleStr = props.component.props.customStyle as string || ''
  const styles: Record<string, string> = {}
  styleStr.split(';').forEach(item => {
    const [key, value] = item.split(':').map(s => s.trim())
    if (key && value) {
      styles[key] = value
    }
  })
  return styles
})

function getChildOptions(child: CanvasComponent) {
  return child.props.options as Array<{ label: string; value: string }> || []
}

function getChildInColumn(columnIndex: number): CanvasComponent | undefined {
  if (!props.component.children) return undefined
  return props.component.children.find((_, idx) => idx === columnIndex)
}

const visible = computed(() => {
  refreshTrigger.value
  return checkVisible(props.component)
})

const disabled = computed(() => {
  refreshTrigger.value
  return checkDisabled(props.component)
})

function handleGridDragOver(event: DragEvent) {
  event.stopPropagation()
  emit('dragOverGrid', event)
}

function handleGridDragLeave(event: DragEvent) {
  event.stopPropagation()
  emit('dragLeaveGrid')
}

function handleGridDrop(event: DragEvent) {
  event.stopPropagation()
  emit('dropGrid', event)
}

function handleInputChange(value: unknown) {
  props.component.value = value
  forceRefresh()
}

function handleSelectChange(value: unknown) {
  props.component.value = value
  forceRefresh()
  const submitFields = props.component.props.submitFields as string[] || []
  if (submitFields.length > 0) {
    const options = selectOptions.value
    const selectedValue = String(value ?? '')
    const selectedOption = options.find(opt => String(opt.value) === selectedValue)
    if (selectedOption && selectedOption.customAttrs) {
      for (const fieldName of submitFields) {
        const submitValue = selectedOption.customAttrs[fieldName]
        if (submitValue !== undefined) {
          const customEvent = new CustomEvent('field-change', {
            detail: {
              field: fieldName,
              value: submitValue
            },
            bubbles: true
          })
          window.dispatchEvent(customEvent)
        }
      }
    }
  }
}
</script>

<template>
  <div
    class="rendered-component"
    :class="{ selected: isSelected, invisible: !visible }"
    :style="customStyle"
    @click.stop="emit('select', component.id)"
  >
    <div v-if="component.type === 'Text'" class="text-component" :style="textStyle">
      {{ component.props.content }}
    </div>
    
    <div v-else-if="component.type === 'Heading'" class="heading-component">
      <h1 v-if="(component.props.level as number) === 1" :style="{ color: headingColor }">
        {{ component.props.content }}
      </h1>
      <h2 v-else-if="(component.props.level as number) === 2" :style="{ color: headingColor }">
        {{ component.props.content }}
      </h2>
      <h3 v-else :style="{ color: headingColor }">
        {{ component.props.content }}
      </h3>
    </div>
    
    <el-button
      v-else-if="component.type === 'Button'"
      :type="component.props.type as string"
      :size="getComponentSize(component)"
      :round="component.props.round as boolean"
      :disabled="disabled"
      @click="handleButtonClick"
    >
      {{ component.props.text }}
    </el-button>
    
    <img
      v-else-if="component.type === 'Image'"
      :src="component.props.src as string"
      :alt="component.props.alt as string"
      :style="imageStyle"
      class="image-component"
    />
    
    <div v-else-if="component.type === 'Input'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!labelText }">
      <label v-if="labelText" class="form-label" :style="labelStyle">
        <span v-if="isRequired" class="required-asterisk">*</span>
        {{ labelText }}
      </label>
      <div class="form-content">
        <el-input
          :model-value="component.value"
          @update:model-value="handleInputChange"
          :placeholder="component.props.placeholder as string"
          :size="getComponentSize(component)"
          :disabled="disabled"
          :clearable="component.props.clearable as boolean"
          :maxlength="component.props.maxLength as number || undefined"
        />
        <span v-if="validationError" class="validation-error">{{ validationError }}</span>
      </div>
    </div>

    <div v-else-if="component.type === 'Textarea'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!labelText }">
      <label v-if="labelText" class="form-label" :style="labelStyle">
        <span v-if="isRequired" class="required-asterisk">*</span>
        {{ labelText }}
      </label>
      <div class="form-content">
        <el-input
          :model-value="component.value"
          @update:model-value="handleInputChange"
          type="textarea"
          :placeholder="component.props.placeholder as string"
          :size="getComponentSize(component)"
          :disabled="disabled"
          :clearable="component.props.clearable as boolean"
          :maxlength="component.props.maxLength as number || undefined"
          :rows="component.props.rows as number || 4"
          :show-word-limit="component.props.showWordLimit as boolean"
        />
        <span v-if="validationError" class="validation-error">{{ validationError }}</span>
      </div>
    </div>
    
    <div v-else-if="component.type === 'Select'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!labelText }">
      <label v-if="labelText" class="form-label" :style="labelStyle">
        <span v-if="isRequired" class="required-asterisk">*</span>
        {{ labelText }}
      </label>
      <div class="form-content">
        <el-select
          :model-value="component.value"
          @update:model-value="handleSelectChange($event)"
          :placeholder="component.props.placeholder as string"
          :size="getComponentSize(component)"
          :disabled="disabled"
          style="width: 100%;"
        >
          <el-option
            v-for="(opt, index) in selectOptions"
            :key="index"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <span v-if="validationError" class="validation-error">{{ validationError }}</span>
      </div>
    </div>
    
    <div v-else-if="component.type === 'DatePicker'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!labelText }">
      <label v-if="labelText" class="form-label" :style="labelStyle">
        <span v-if="isRequired" class="required-asterisk">*</span>
        {{ labelText }}
      </label>
      <div class="form-content">
        <el-date-picker
          :model-value="component.value"
          @update:model-value="handleDateChange"
          :type="component.props.type as string"
          :format="datePickerFormat"
          :value-format="datePickerValueFormat"
          :placeholder="component.props.placeholder as string"
          :size="getComponentSize(component)"
          :disabled="disabled"
          style="width: 100%;"
        />
        <span v-if="validationError" class="validation-error">{{ validationError }}</span>
      </div>
    </div>

    <div v-else-if="component.type === 'DateRangePicker'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!labelText }">
      <label v-if="labelText" class="form-label" :style="labelStyle">
        <span v-if="isRequired" class="required-asterisk">*</span>
        {{ labelText }}
      </label>
      <div class="form-content">
        <template v-if="isCustomRangeType">
          <div class="custom-range-picker">
            <el-date-picker
              :model-value="customStartDateValue"
              @update:model-value="handleCustomRangeStartChange"
              :type="customRangeStartType"
              :format="datePickerFormat"
              :value-format="datePickerValueFormat"
              :placeholder="component.props.startPlaceholder as string"
              :size="getComponentSize(component)"
              :disabled="disabled"
              class="range-picker-item"
            />
            <span class="range-separator-text">至</span>
            <el-date-picker
              :model-value="customEndDateValue"
              @update:model-value="handleCustomRangeEndChange"
              :type="customRangeStartType"
              :format="datePickerFormat"
              :value-format="datePickerValueFormat"
              :placeholder="component.props.endPlaceholder as string"
              :size="getComponentSize(component)"
              :disabled="disabled"
              class="range-picker-item"
            />
          </div>
        </template>
        <template v-else>
          <el-date-picker
            :model-value="component.value as [string, string] | null"
            @update:model-value="handleDateRangeChange"
            :type="component.props.type as string"
            :format="datePickerFormat"
            :value-format="datePickerValueFormat"
            :start-placeholder="component.props.startPlaceholder as string"
            :end-placeholder="component.props.endPlaceholder as string"
            :size="getComponentSize(component)"
            :disabled="disabled"
            range-separator="至"
            style="width: 100%;"
          />
        </template>
        <span v-if="validationError" class="validation-error">{{ validationError }}</span>
      </div>
    </div>

    <div v-else-if="component.type === 'Cascader'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!labelText }">
      <label v-if="labelText" class="form-label" :style="labelStyle">
        <span v-if="isRequired" class="required-asterisk">*</span>
        {{ labelText }}
      </label>
      <div class="form-content">
        <el-cascader
          :model-value="component.value"
          @update:model-value="handleCascaderChange"
          :options="cascaderOptions"
          :placeholder="component.props.placeholder as string"
          :size="getComponentSize(component)"
          :disabled="disabled"
          style="width: 100%;"
        />
        <span v-if="validationError" class="validation-error">{{ validationError }}</span>
      </div>
    </div>

    <el-card
      v-else-if="component.type === 'Card'"
      :title="component.props.title as string"
      :shadow="component.props.shadow as string"
    >
      <div style="padding: 16px;">卡片内容区域</div>
    </el-card>
    
    <el-divider
      v-else-if="component.type === 'Divider'"
      :direction="component.props.direction as string"
    >
      {{ component.props.content }}
    </el-divider>

    <div
      v-else-if="component.type === 'Grid'"
      class="grid-container"
      :class="{ 'drop-target': isDropTarget }"
      @dragover="handleGridDragOver"
      @dragleave="handleGridDragLeave"
      @drop="handleGridDrop"
    >
      <el-row :gutter="component.props.gutter as number">
        <el-col
          v-for="i in (component.props.columns as number)"
          :key="i"
          :span="24 / (component.props.columns as number)"
          class="grid-column"
        >
          <div 
            class="grid-column-content"
            :class="{ 'drop-target': dropTargetColumn === i - 1 }"
            @dragover="(e: DragEvent) => emit('dragOverColumn', e, i - 1)"
            @dragleave="emit('dragLeaveColumn')"
            @drop="(e: DragEvent) => emit('dropColumn', e, i - 1)"
          >
            <template v-if="getChildInColumn(i - 1)">
              <div
                :key="getChildInColumn(i - 1)!.id"
                class="grid-child"
                :class="{ selected: getChildInColumn(i - 1)!.id === component.id }"
                @click.stop="emit('select', getChildInColumn(i - 1)!.id)"
              >
                <div v-if="getChildInColumn(i - 1)!.type === 'Text'" class="text-component" :style="{ fontSize: '14px', color: '#333' }">
                  {{ getChildInColumn(i - 1)!.props.content }}
                </div>
                <div v-else-if="getChildInColumn(i - 1)!.type === 'Heading'" class="heading-component">
                  <h1 v-if="(getChildInColumn(i - 1)!.props.level as number) === 1" style="font-size: 18px;">{{ getChildInColumn(i - 1)!.props.content }}</h1>
                  <h2 v-else-if="(getChildInColumn(i - 1)!.props.level as number) === 2" style="font-size: 16px;">{{ getChildInColumn(i - 1)!.props.content }}</h2>
                  <h3 v-else style="font-size: 14px;">{{ getChildInColumn(i - 1)!.props.content }}</h3>
                </div>
                <el-button
                  v-else-if="getChildInColumn(i - 1)!.type === 'Button'"
                  :type="getChildInColumn(i - 1)!.props.type as string"
                  :size="getComponentSize(getChildInColumn(i - 1)!)"
                  :round="getChildInColumn(i - 1)!.props.round as boolean"
                  :disabled="checkDisabled(getChildInColumn(i - 1)!)"
                >
                  {{ getChildInColumn(i - 1)!.props.text }}
                </el-button>
                <img
                  v-else-if="getChildInColumn(i - 1)!.type === 'Image'"
                  :src="getChildInColumn(i - 1)!.props.src as string"
                  :alt="getChildInColumn(i - 1)!.props.alt as string"
                  style="max-width: 100%; height: auto;"
                />
                <div v-else-if="getChildInColumn(i - 1)!.type === 'Input'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!(getChildInColumn(i - 1)!.props.label as string) }">
                  <label v-if="getChildInColumn(i - 1)!.props.label" class="form-label" :style="labelPosition === 'top' ? { width: '100%', textAlign: 'left' } : { width: formLabelWidth, flexShrink: 0, textAlign: 'right' }">
                    <span v-if="getChildInColumn(i - 1)!.props.required" class="required-asterisk">*</span>
                    {{ getChildInColumn(i - 1)!.props.label }}
                  </label>
                  <div class="form-content">
                    <el-input
                      :placeholder="getChildInColumn(i - 1)!.props.placeholder as string"
                      :size="getComponentSize(getChildInColumn(i - 1)!)"
                      :disabled="checkDisabled(getChildInColumn(i - 1)!)"
                      style="width: 100%;"
                    />
                  </div>
                </div>
                <div v-else-if="getChildInColumn(i - 1)!.type === 'Select'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!(getChildInColumn(i - 1)!.props.label as string) }">
                  <label v-if="getChildInColumn(i - 1)!.props.label" class="form-label" :style="labelPosition === 'top' ? { width: '100%', textAlign: 'left' } : { width: formLabelWidth, flexShrink: 0, textAlign: 'right' }">
                    <span v-if="getChildInColumn(i - 1)!.props.required" class="required-asterisk">*</span>
                    {{ getChildInColumn(i - 1)!.props.label }}
                  </label>
                  <div class="form-content">
                    <el-select
                      :placeholder="getChildInColumn(i - 1)!.props.placeholder as string"
                      :size="getComponentSize(getChildInColumn(i - 1)!)"
                      :disabled="checkDisabled(getChildInColumn(i - 1)!)"
                      style="width: 100%;"
                    >
                      <el-option
                        v-for="opt in getChildOptions(getChildInColumn(i - 1)!)"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                  </div>
                </div>
                <div v-else-if="getChildInColumn(i - 1)!.type === 'DatePicker'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!(getChildInColumn(i - 1)!.props.label as string) }">
                  <label v-if="getChildInColumn(i - 1)!.props.label" class="form-label" :style="labelPosition === 'top' ? { width: '100%', textAlign: 'left' } : { width: formLabelWidth, flexShrink: 0, textAlign: 'right' }">
                    <span v-if="getChildInColumn(i - 1)!.props.required" class="required-asterisk">*</span>
                    {{ getChildInColumn(i - 1)!.props.label }}
                  </label>
                  <div class="form-content">
                    <el-date-picker
                      :type="getChildInColumn(i - 1)!.props.type as string"
                      :placeholder="getChildInColumn(i - 1)!.props.placeholder as string"
                      :size="getComponentSize(getChildInColumn(i - 1)!)"
                      :disabled="checkDisabled(getChildInColumn(i - 1)!)"
                      style="width: 100%;"
                    />
                  </div>
                </div>
                <div v-else-if="getChildInColumn(i - 1)!.type === 'DateRangePicker'" class="form-field" :class="{ 'form-field-vertical': labelPosition === 'top' && !!(getChildInColumn(i - 1)!.props.label as string) }">
                  <label v-if="getChildInColumn(i - 1)!.props.label" class="form-label" :style="labelPosition === 'top' ? { width: '100%', textAlign: 'left' } : { width: formLabelWidth, flexShrink: 0, textAlign: 'right' }">
                    <span v-if="getChildInColumn(i - 1)!.props.required" class="required-asterisk">*</span>
                    {{ getChildInColumn(i - 1)!.props.label }}
                  </label>
                  <div class="form-content">
                    <el-date-picker
                      :type="getChildInColumn(i - 1)!.props.type as string"
                      :start-placeholder="getChildInColumn(i - 1)!.props.startPlaceholder as string"
                      :end-placeholder="getChildInColumn(i - 1)!.props.endPlaceholder as string"
                      :size="getComponentSize(getChildInColumn(i - 1)!)"
                      :disabled="checkDisabled(getChildInColumn(i - 1)!)"
                      range-separator="至"
                      style="width: 100%;"
                    />
                  </div>
                </div>
                <el-card
                  v-else-if="getChildInColumn(i - 1)!.type === 'Card'"
                  :title="getChildInColumn(i - 1)!.props.title as string"
                  :shadow="getChildInColumn(i - 1)!.props.shadow as string"
                  style="width: 100%;"
                >
                  <div style="padding: 8px;">卡片内容</div>
                </el-card>
                <el-divider
                  v-else-if="getChildInColumn(i - 1)!.type === 'Divider'"
                  :direction="getChildInColumn(i - 1)!.props.direction as string"
                >
                  {{ getChildInColumn(i - 1)!.props.content }}
                </el-divider>
              </div>
            </template>
            <div v-else class="grid-empty-hint">
              <i class="el-icon-upload"></i>
              <span>拖拽组件到此处</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <div v-else-if="component.type === 'FilePreview'" class="file-preview-component">
      <FilePreview />
    </div>

    <div v-else-if="component.type === 'List'" class="list-component">
      <el-table
        :data="filteredListData"
        :height="listMaxHeight"
        :virtual-scroll="useVirtualScroll"
        :virtual-scroll-item-size="48"
        class="custom-list-table"
        @sort-change="handleListSort"
        border
      >
        <el-table-column
          v-for="(col, index) in listColumns"
          :key="index"
          :prop="col.key"
          :label="col.label"
          :width="col.width"
          :sortable="col.sortable"
        >
          <template #default="{ row }">
            <span v-if="isImageUrl(row[col.key])" class="list-image-container">
              <img
                :data-src="row[col.key]"
                class="lazy-image"
                :alt="col.label"
              />
            </span>
            <span v-else class="list-cell-text" :title="String(row[col.key])">
              {{ row[col.key] }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <div class="list-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalListData"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
    
    <div v-if="isSelected" class="component-actions">
      <button class="delete-btn" @click.stop="emit('delete', component.id)">
        X
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.rendered-component {
  padding: 4px;
  margin-bottom: 4px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: grab;
  transition: border-color 0.2s, background-color 0.2s;
  position: relative;
  
  &:hover:not(.sortable-drag):not(.sortable-ghost) {
    background: #fafafa;
  }
  
  &:active {
    cursor: grabbing;
  }
  
  &.selected {
    padding: 16px;
    margin-bottom: 16px;
    margin-top: 16px;
    border-color: #409eff;
    background: #f0f5ff;
  }
  
  &.invisible {
    opacity: 0.4;
    border: 2px dashed #c0c4cc;
    background: #fafafa;
  }
  
  &.sortable-drag,
  &.sortable-ghost {
    transition: none !important;
    animation: none !important;
  }
}

.text-component {
  line-height: 1.6;
}

.heading-component {
  h1, h2, h3 {
    margin: 0;
    font-weight: 600;
  }
  
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 16px; }
}

.image-component {
  display: block;
  object-fit: cover;
}

.grid-container {
  padding: 16px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  transition: all 0.2s;
  
  &.drop-target {
    border-color: #409eff;
    background: #f0f5ff;
  }
}

.grid-column {
  padding: 8px;
}

.grid-column-content {
  min-height: 100px;
  background: #fafafa;
  border-radius: 4px;
  padding: 8px;
  border: 2px dashed transparent;
  
  &:hover {
    border-color: #dcdfe6;
  }
  
  &.drop-target {
    border-color: #409eff;
    background: #f0f5ff;
  }
}

.grid-empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: #909399;
  font-size: 12px;
  
  i {
    font-size: 24px;
    margin-bottom: 4px;
  }
}

.grid-child {
  margin-bottom: 8px;
  padding: 8px;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  
  &.selected {
    border-color: #409eff;
    background: #f0f5ff;
  }
}

.component-actions {
  position: absolute;
  top: -10px;
  right: -10px;
  display: flex;
  gap: 4px;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #f56c6c;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.2s;
  
  &:hover {
    background: #f78989;
  }
}

.form-field {
  display: flex;
  align-items: flex-start;
  width: 100%;

  &.form-field-vertical {
    flex-direction: column;

    .form-label {
      width: 100% !important;
      text-align: left !important;
      margin-bottom: 8px;
    }
  }
}

.form-label {
  display: inline-flex;
  align-items: center;
  padding-right: 12px;
  font-size: 14px;
  color: #606266;
  line-height: 32px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.required-asterisk {
  color: #f56c6c;
  margin-right: 4px;
  font-size: 14px;
}

.form-content {
  flex: 1;
  min-width: 0;
}

.validation-error {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #f56c6c;
}

.custom-range-picker {
  display: flex;
  align-items: center;
  width: 100%;

  .range-picker-item {
    flex: 1;
    min-width: 0;
  }

  .range-separator-text {
    padding: 0 8px;
    color: #606266;
    font-size: 14px;
    flex-shrink: 0;
  }
}

.list-component {
  width: 100%;
  overflow-x: auto;

  .custom-list-table {
    width: 100%;
    table-layout: auto;

    :deep(.el-table__body-wrapper) {
      overflow-x: hidden;
    }

    :deep(.el-table__header-wrapper) {
      overflow-x: hidden;
    }

    :deep(.el-table__header-inner) {
      overflow-x: hidden;
    }

    :deep(.el-table__cell) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 300px;
    }
  }

  .list-cell-text {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .list-image-container {
    display: flex;
    align-items: center;

    img {
      max-width: 80px;
      max-height: 80px;
      object-fit: contain;
      border-radius: 4px;
    }

    .lazy-image {
      background: #f5f5f5;
      border-radius: 4px;
    }
  }

  .list-pagination {
    display: flex;
    justify-content: flex-end;
    padding: 12px 0;
    border-top: 1px solid #ebeef5;
  }
}
</style>
