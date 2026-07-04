import { ref, computed, watch } from 'vue'
import type { CanvasComponent, DragState, FieldBinding, VisibilityConfig, DisabledConfig, ConditionRule } from '@/types'
import { getComponentConfig } from '@/data/components'

const STORAGE_KEY = 'pageBuilderData'
const GLOBAL_CONFIG_KEY = 'pageBuilderGlobalConfig'

function loadFromStorage(): CanvasComponent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveToStorage(data: CanvasComponent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadGlobalConfig() {
  try {
    const data = localStorage.getItem(GLOBAL_CONFIG_KEY)
    return data ? JSON.parse(data) : { defaultSize: 'medium' as const, labelWidth: 'auto' }
  } catch {
    return { defaultSize: 'medium' as const, labelWidth: 'auto' }
  }
}

function saveGlobalConfig(config: { defaultSize: 'small' | 'medium' | 'large'; labelWidth: string }) {
  localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify(config))
}

const components = ref<CanvasComponent[]>(loadFromStorage())
const selectedId = ref<string | null>(null)
const dragState = ref<DragState>({
  isDragging: false,
  componentType: '',
  offsetX: 0,
  offsetY: 0
})
const globalConfig = ref(loadGlobalConfig())
const refreshTrigger = ref(0)
const canvasWidth = ref(1200)

let idCounter = components.value.length > 0 
  ? Math.max(...components.value.map(c => {
      const match = c.id.match(/component-(\d+)/)
      return match ? parseInt(match[1]) : 0
    }))
  : 0

const generateId = (): string => `component-${++idCounter}`

watch(components, (newVal) => {
  saveToStorage(newVal)
}, { deep: true })

watch(globalConfig, (newVal) => {
  saveGlobalConfig(newVal)
}, { deep: true })

function evaluateCondition(rule: ConditionRule, fieldValue: unknown): boolean {
  const { operator, value } = rule
  
  switch (operator) {
    case '==':
      return String(fieldValue) === value
    case '!=':
      return String(fieldValue) !== value
    case '>':
      return Number(fieldValue) > Number(value)
    case '<':
      return Number(fieldValue) < Number(value)
    case '>=':
      return Number(fieldValue) >= Number(value)
    case '<=':
      return Number(fieldValue) <= Number(value)
    case 'contains':
      return String(fieldValue).includes(value)
    case 'empty':
      return !fieldValue || String(fieldValue).trim() === ''
    case 'notEmpty':
      return !!fieldValue && String(fieldValue).trim() !== ''
    default:
      return false
  }
}

function getFieldValue(fieldName: string): unknown {
  for (const comp of components.value) {
    if (comp.fieldBinding?.fieldName === fieldName) {
      return (comp as unknown as { value?: unknown }).value ?? comp.props.value ?? comp.props.content ?? comp.props.text ?? null
    }
    if (comp.type === 'Select') {
      const attrNames = comp.props.customAttrNames as string[] || []
      if (attrNames.includes(fieldName)) {
        const selectedValue = String((comp as unknown as { value?: unknown }).value ?? comp.props.value ?? '')
        const options = comp.props.options as Array<{ label: string; value: string; customAttrs?: Record<string, string> }> || []
        const selectedOption = options.find(opt => String(opt.value) === selectedValue)
        if (selectedOption && selectedOption.customAttrs) {
          const attrValue = selectedOption.customAttrs[fieldName]
          return attrValue !== undefined ? attrValue : null
        }
        return null
      }
    }
    if (comp.children) {
      const found = findFieldValue(comp.children, fieldName)
      if (found !== undefined) return found
    }
  }
  return null
}

function formatDateValue(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

function getAllFieldValues(): Record<string, unknown> {
  const values: Record<string, unknown> = {}

  function collectValues(list: CanvasComponent[]) {
    for (const comp of list) {
      if (comp.fieldBinding?.fieldName) {
        let rawValue = (comp as unknown as { value?: unknown }).value ?? comp.props.value ?? comp.props.content ?? comp.props.text ?? null

        if (comp.type === 'DatePicker' && rawValue && typeof rawValue === 'string') {
          rawValue = formatDateValue(rawValue)
        } else if (comp.type === 'DateRangePicker' && Array.isArray(rawValue) && rawValue.length === 2) {
          rawValue = [formatDateValue(rawValue[0] as string), formatDateValue(rawValue[1] as string)]
        }

        values[comp.fieldBinding.fieldName] = rawValue
      }
      if (comp.type === 'Select') {
        const attrNames = comp.props.customAttrNames as string[] || []
        const selectedValue = String((comp as unknown as { value?: unknown }).value ?? comp.props.value ?? '')
        const options = comp.props.options as Array<{ label: string; value: string; customAttrs?: Record<string, string> }> || []
        const selectedOption = options.find(opt => String(opt.value) === selectedValue)
        
        for (const attrName of attrNames) {
          if (selectedOption && selectedOption.customAttrs) {
            const attrValue = selectedOption.customAttrs[attrName]
            values[attrName] = attrValue !== undefined ? attrValue : null
          } else {
            values[attrName] = null
          }
        }
      }
      if (comp.children) {
        collectValues(comp.children)
      }
    }
  }
  
  collectValues(components.value)
  
  for (const comp of components.value) {
    const derivedFields = comp.props.derivedFields as Array<{ name: string; type: string; config: Record<string, unknown> }> || []
    for (const df of derivedFields) {
      values[df.name] = computeDerivedFieldValue(df, values)
    }
    if (comp.children) {
      for (const child of comp.children) {
        const derivedFields = child.props.derivedFields as Array<{ name: string; type: string; config: Record<string, unknown> }> || []
        for (const df of derivedFields) {
          values[df.name] = computeDerivedFieldValue(df, values)
        }
      }
    }
  }
  
  return values
}

function resetForm() {
  function resetComponent(list: CanvasComponent[]) {
    for (const comp of list) {
      if (comp.type === 'Input' || comp.type === 'Select' || comp.type === 'DatePicker') {
        (comp as unknown as { value?: unknown }).value = ''
      }
      if (comp.type === 'DateRangePicker') {
        (comp as unknown as { value?: unknown }).value = null
      }
      if (comp.children) {
        resetComponent(comp.children)
      }
    }
  }
  resetComponent(components.value)
}

function computeDerivedFieldValue(field: { name: string; type: string; config: Record<string, unknown> }, values: Record<string, unknown>): unknown {
  const { type, config } = field
  
  switch (type) {
    case 'concat': {
      const fields = config.fields as string[] || []
      const separator = config.separator as string || ''
      const fieldValues = fields.map(f => String(values[f] ?? '')).filter(v => v)
      return fieldValues.join(separator)
    }
    
    case 'numberFormat': {
      const fields = config.fields as string[] || []
      const format = config.format as string || '0.00'
      if (fields.length === 0) return null
      
      const value = parseFloat(String(values[fields[0]] ?? ''))
      if (isNaN(value)) return null
      
      if (format === '0') {
        return String(Math.round(value))
      } else if (format === '0.0') {
        return String(value.toFixed(1))
      } else if (format === '0.00') {
        return String(value.toFixed(2))
      } else if (format === ',0.00') {
        return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      } else if (format === '0%') {
        return String((value * 100).toFixed(2) + '%')
      }
      return String(value)
    }
    
    case 'dateCompare': {
      const fields = config.fields as string[] || []
      const targetDate = config.targetDate as string || ''
      const operator = config.operator as string || '=='
      if (fields.length === 0 || !targetDate) return null
      
      const sourceDate = values[fields[0]]
      if (!sourceDate) return null
      
      const source = new Date(String(sourceDate))
      const target = new Date(targetDate)
      
      if (isNaN(source.getTime()) || isNaN(target.getTime())) return null
      
      switch (operator) {
        case '==': return String(source.getTime() === target.getTime())
        case '!=': return String(source.getTime() !== target.getTime())
        case '>': return String(source.getTime() > target.getTime())
        case '<': return String(source.getTime() < target.getTime())
        case '>=': return String(source.getTime() >= target.getTime())
        case '<=': return String(source.getTime() <= target.getTime())
        default: return null
      }
    }
    
    case 'custom': {
      const expression = config.expression as string || ''
      if (!expression) return null
      
      let result = expression
      for (const [key, val] of Object.entries(values)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
        result = result.replace(regex, String(val ?? ''))
      }
      
      try {
        return String(eval(result))
      } catch {
        return null
      }
    }
    
    default:
      return null
  }
}

function findFieldValue(list: CanvasComponent[], fieldName: string): unknown {
  for (const comp of list) {
    if (comp.fieldBinding?.fieldName === fieldName) {
      return (comp as unknown as { value?: unknown }).value ?? comp.props.value ?? comp.props.content ?? comp.props.text ?? null
    }
    if (comp.type === 'Select') {
      const attrNames = comp.props.customAttrNames as string[] || []
      if (attrNames.includes(fieldName)) {
        const selectedValue = String((comp as unknown as { value?: unknown }).value ?? comp.props.value ?? '')
        const options = comp.props.options as Array<{ label: string; value: string; customAttrs?: Record<string, string> }> || []
        const selectedOption = options.find(opt => String(opt.value) === selectedValue)
        if (selectedOption && selectedOption.customAttrs) {
          const attrValue = selectedOption.customAttrs[fieldName]
          return attrValue !== undefined ? attrValue : null
        }
        return null
      }
    }
    if (comp.children) {
      const found = findFieldValue(comp.children, fieldName)
      if (found !== undefined) return found
    }
  }
  return undefined
}

export function useCanvas() {
  const selectedComponent = computed(() => {
    if (!selectedId.value) return null
    return findComponent(components.value, selectedId.value)
  })

  const maxLabelWidth = computed(() => {
    let maxWidth = 0
    function processComponent(comp: CanvasComponent) {
      if (['Input', 'Select', 'DatePicker', 'DateRangePicker'].includes(comp.type)) {
        const label = comp.props.label as string || ''
        if (label) {
          let width = 0
          for (const char of label) {
            if (/[\u4e00-\u9fa5]/.test(char)) {
              width += 16
            } else {
              width += 8
            }
          }
          width += 24
          if (width > maxWidth) maxWidth = width
        }
      }
      if (comp.children) {
        comp.children.forEach(processComponent)
      }
    }
    components.value.forEach(processComponent)
    return maxWidth
  })

  const formLabelWidth = computed(() => {
    const lw = globalConfig.value.labelWidth as string
    if (lw && lw !== 'auto') {
      return lw
    }
    return maxLabelWidth.value > 0 ? `${maxLabelWidth.value}px` : 'auto'
  })

  const labelPosition = computed(() => {
    refreshTrigger.value
    const threshold = canvasWidth.value / 2
    const lw = globalConfig.value.labelWidth as string
    if (lw && lw !== 'auto') {
      const px = parseInt(lw)
      if (!isNaN(px) && px > threshold) return 'top'
      return 'left'
    }
    return maxLabelWidth.value > threshold ? 'top' : 'left'
  })

  const fieldNames = computed(() => {
  const names: string[] = []
  for (const comp of components.value) {
    if (comp.fieldBinding?.fieldName) {
      names.push(comp.fieldBinding.fieldName)
    }
    if (comp.type === 'Select' && comp.props.customAttrNames) {
      names.push(...(comp.props.customAttrNames as string[]))
    }
    if (comp.props.derivedFields) {
      const derivedFields = comp.props.derivedFields as Array<{ name: string }> || []
      names.push(...derivedFields.map(df => df.name))
    }
    if (comp.children) {
      collectFieldNames(comp.children, names)
    }
  }
  return [...new Set(names)]
})

function collectFieldNames(list: CanvasComponent[], names: string[]) {
  for (const comp of list) {
    if (comp.fieldBinding?.fieldName) {
      names.push(comp.fieldBinding.fieldName)
    }
    if (comp.type === 'Select' && comp.props.customAttrNames) {
      names.push(...(comp.props.customAttrNames as string[]))
    }
    if (comp.props.derivedFields) {
      const derivedFields = comp.props.derivedFields as Array<{ name: string }> || []
      names.push(...derivedFields.map(df => df.name))
    }
    if (comp.children) {
      collectFieldNames(comp.children, names)
    }
  }
}

  function findComponent(list: CanvasComponent[], id: string): CanvasComponent | null {
    for (const comp of list) {
      if (comp.id === id) return comp
      if (comp.children) {
        const found = findComponent(comp.children, id)
        if (found) return found
      }
    }
    return null
  }

  function addComponent(type: string, parentId?: string) {
    const config = getComponentConfig(type)
    if (!config) return

    const newComponent: CanvasComponent = {
      id: generateId(),
      type: config.type,
      props: { ...config.defaultProps, size: globalConfig.value.defaultSize },
      fieldBinding: { fieldName: '', labelField: '', valueField: '' },
      visibility: { enabled: false, conditions: [] },
      disabled: { enabled: false, conditions: [] },
      customAttrs: {}
    }

    if (parentId) {
      const parent = findComponent(components.value, parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(newComponent)
      }
    } else {
      components.value.push(newComponent)
    }
    selectedId.value = newComponent.id
  }

  function removeComponent(id: string) {
    const removedComponent = findComponent(components.value, id)
    const removedFieldName = removedComponent?.fieldBinding?.fieldName
    
    for (let i = 0; i < components.value.length; i++) {
      if (components.value[i].id === id) {
        components.value.splice(i, 1)
        if (selectedId.value === id) {
          selectedId.value = null
        }
        break
      }
      if (components.value[i].children) {
        const childIndex = components.value[i].children!.findIndex(c => c.id === id)
        if (childIndex !== -1) {
          components.value[i].children!.splice(childIndex, 1)
          if (selectedId.value === id) {
            selectedId.value = null
          }
          break
        }
      }
    }
    
    if (removedFieldName) {
      cleanupFieldReferences(removedFieldName)
    }
  }

  function moveComponent(fromIndex: number, toIndex: number, parentId?: string) {
    const targetArray = parentId 
      ? (findComponent(components.value, parentId)?.children || components.value)
      : components.value
    
    if (fromIndex < 0 || fromIndex >= targetArray.length ||
        toIndex < 0 || toIndex >= targetArray.length ||
        fromIndex === toIndex) {
      return
    }
    
    const [removed] = targetArray.splice(fromIndex, 1)
    targetArray.splice(toIndex, 0, removed)
  }
  
  function cleanupFieldReferences(fieldName: string) {
    cleanupReferences(fieldName, [])
  }

  function cleanupAttrNameReferences(attrName: string) {
    cleanupReferences(attrName, [attrName])
  }

  function cleanupReferences(fieldName: string, attrNames: string[]) {
    const namesToRemove = [...new Set([fieldName, ...attrNames])]
    
    function processComponent(comp: CanvasComponent) {
      if (comp.type === 'Select') {
        const customAttrNames = comp.props.customAttrNames as string[] || []
        const newCustomAttrNames = customAttrNames.filter(name => !attrNames.includes(name))
        if (newCustomAttrNames.length !== customAttrNames.length) {
          comp.props.customAttrNames = newCustomAttrNames
        }

        const options = comp.props.options as Array<{ label: string; value: string; customAttrs?: Record<string, string> }> || []
        let optionsChanged = false
        for (const opt of options) {
          if (opt.customAttrs) {
            for (const attr of attrNames) {
              if (attr in opt.customAttrs) {
                delete opt.customAttrs[attr]
                optionsChanged = true
              }
            }
          }
        }
        if (optionsChanged) {
          comp.props.options = JSON.parse(JSON.stringify(options))
        }

        const submitFields = comp.props.submitFields as string[] || []
        const newSubmitFields = submitFields.filter(f => !namesToRemove.includes(f))
        if (newSubmitFields.length !== submitFields.length) {
          comp.props.submitFields = newSubmitFields
        }
      }

      if (comp.visibility?.conditions) {
        comp.visibility.conditions = comp.visibility.conditions.filter(
          cond => !namesToRemove.includes(cond.field)
        )
      }
      if (comp.disabled?.conditions) {
        comp.disabled.conditions = comp.disabled.conditions.filter(
          cond => !namesToRemove.includes(cond.field)
        )
      }

      if (comp.children) {
        for (const child of comp.children) {
          processComponent(child)
        }
      }
    }

    for (const comp of components.value) {
      processComponent(comp)
    }
  }

  function updateComponent(id: string, props: Record<string, unknown>) {
    const component = findComponent(components.value, id)
    if (component) {
      Object.assign(component.props, props)
      const newProps = JSON.parse(JSON.stringify(component.props))
      component.props = newProps
    }
  }

  function updateFieldBinding(id: string, binding: FieldBinding): boolean {
    const component = findComponent(components.value, id)
    if (!component) return false
    
    const newFieldName = binding.fieldName?.trim()
    if (!newFieldName) {
      component.fieldBinding = JSON.parse(JSON.stringify(binding))
      return true
    }
    
    for (const comp of components.value) {
      if (comp.id !== id && comp.fieldBinding?.fieldName === newFieldName) {
        return false
      }
      if (comp.children) {
        for (const child of comp.children) {
          if (child.id !== id && child.fieldBinding?.fieldName === newFieldName) {
            return false
          }
        }
      }
    }
    
    component.fieldBinding = JSON.parse(JSON.stringify(binding))
    return true
  }

  function updateVisibility(id: string, visibility: VisibilityConfig) {
    const component = findComponent(components.value, id)
    if (component) {
      component.visibility = JSON.parse(JSON.stringify(visibility))
    }
  }

  function updateDisabled(id: string, disabled: DisabledConfig) {
    const component = findComponent(components.value, id)
    if (component) {
      component.disabled = JSON.parse(JSON.stringify(disabled))
    }
  }

  function updateCustomAttrs(id: string, attrs: Record<string, string>) {
    const component = findComponent(components.value, id)
    if (component) {
      component.customAttrs = { ...attrs }
    }
  }

  function updateSelectOptions(id: string, options: { label: string; value: string; customAttrs?: Record<string, string> }[]) {
    const component = findComponent(components.value, id)
    if (component) {
      component.props.options = JSON.parse(JSON.stringify(options))
    }
  }

  function getComponentSize(component: CanvasComponent): string {
    return (component.props.size as string) || globalConfig.value.defaultSize
  }

  function forceRefresh() {
    refreshTrigger.value++
  }

  interface ValidationResult {
    valid: boolean
    errors: Array<{ componentId: string; componentType: string; fieldName: string; message: string }>
  }

  function validateForm(): ValidationResult {
    const errors: ValidationResult['errors'] = []
    
    function validateComponent(comp: CanvasComponent) {
      if (['Input', 'Select', 'DatePicker', 'DateRangePicker'].includes(comp.type)) {
        const value = comp.value ?? ''
        const required = comp.props.required as boolean || false

        if (comp.type === 'DateRangePicker') {
          const arr = value as unknown[] | null
          if (required && (!arr || !Array.isArray(arr) || arr.length < 2 || !arr[0] || !arr[1])) {
            errors.push({
              componentId: comp.id,
              componentType: comp.type,
              fieldName: comp.fieldBinding?.fieldName || comp.type,
              message: '此字段为必填项'
            })
          }
          if (comp.children) {
            comp.children.forEach(validateComponent)
          }
          return
        }

        const inputType = comp.props.inputType as string || 'text'
        const maxLength = comp.props.maxLength as number | null
        const minValue = comp.props.minValue as number | null
        const maxValue = comp.props.maxValue as number | null
        const decimalPlaces = comp.props.decimalPlaces as number | null

        if (required && (!value || String(value).trim() === '')) {
          errors.push({
            componentId: comp.id,
            componentType: comp.type,
            fieldName: comp.fieldBinding?.fieldName || comp.type,
            message: '此字段为必填项'
          })
          return
        }

        if (!value) {
          return
        }
        
        const strValue = String(value)
        
        if (maxLength !== null && strValue.length > maxLength) {
          errors.push({
            componentId: comp.id,
            componentType: comp.type,
            fieldName: comp.fieldBinding?.fieldName || comp.type,
            message: `输入长度不能超过${maxLength}个字符`
          })
          return
        }
        
        let valid = true
        let message = ''
        
        switch (inputType) {
          case 'number':
            if (!/^\d+$/.test(strValue)) {
              valid = false
              message = '只能输入数字'
            }
            break
          case 'chinese':
            if (!/^[\u4e00-\u9fa5]+$/.test(strValue)) {
              valid = false
              message = '只能输入中文'
            }
            break
          case 'english':
            if (!/^[a-zA-Z]+$/.test(strValue)) {
              valid = false
              message = '只能输入英文'
            }
            break
          case 'englishNumber':
            if (!/^[a-zA-Z0-9]+$/.test(strValue)) {
              valid = false
              message = '只能输入英文和数字'
            }
            break
          case 'decimal':
            if (!/^\d+(\.\d+)?$/.test(strValue)) {
              valid = false
              message = '只能输入数字(可带小数)'
            } else if (decimalPlaces !== null) {
              const parts = strValue.split('.')
              if (parts.length === 2 && parts[1].length > decimalPlaces) {
                valid = false
                message = `最多保留${decimalPlaces}位小数`
              }
            }
            break
        }
        
        if (!valid) {
          errors.push({
            componentId: comp.id,
            componentType: comp.type,
            fieldName: comp.fieldBinding?.fieldName || comp.type,
            message
          })
          return
        }
        
        if ((inputType === 'number' || inputType === 'decimal')) {
          const numValue = parseFloat(strValue)
          if (!isNaN(numValue)) {
            if (minValue !== null && numValue < minValue) {
              errors.push({
                componentId: comp.id,
                componentType: comp.type,
                fieldName: comp.fieldBinding?.fieldName || comp.type,
                message: `值不能小于${minValue}`
              })
            } else if (maxValue !== null && numValue > maxValue) {
              errors.push({
                componentId: comp.id,
                componentType: comp.type,
                fieldName: comp.fieldBinding?.fieldName || comp.type,
                message: `值不能大于${maxValue}`
              })
            }
          }
        }
      }
      
      if (comp.children) {
        comp.children.forEach(validateComponent)
      }
    }
    
    components.value.forEach(validateComponent)
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  function isVisible(component: CanvasComponent): boolean {
    refreshTrigger.value
    if (!component.visibility?.enabled) return true
    if (!component.visibility.conditions.length) return true
    
    return component.visibility.conditions.every(rule => {
      const fieldValue = getFieldValue(rule.field)
      return evaluateCondition(rule, fieldValue)
    })
  }

  function isComponentDisabled(component: CanvasComponent): boolean {
    refreshTrigger.value
    if (component.props.disabled) return true
    if (!component.disabled?.enabled) return false
    if (!component.disabled.conditions.length) return false
    
    return component.disabled.conditions.every(rule => {
      const fieldValue = getFieldValue(rule.field)
      return evaluateCondition(rule, fieldValue)
    })
  }

  function selectComponent(id: string | null) {
    selectedId.value = id
  }

  function setDragState(state: Partial<DragState>) {
    dragState.value = { ...dragState.value, ...state }
  }

  function clearCanvas() {
    components.value = []
    selectedId.value = null
    idCounter = 0
    localStorage.removeItem(STORAGE_KEY)
  }

  function setGlobalConfig(config: { defaultSize: 'small' | 'medium' | 'large'; labelWidth: string }) {
    globalConfig.value = { ...config }
  }

  function setCanvasWidth(width: number) {
    canvasWidth.value = width
  }

  return {
    components,
    selectedId,
    selectedComponent,
    dragState,
    globalConfig,
    fieldNames,
    formLabelWidth,
    labelPosition,
    addComponent,
    removeComponent,
    moveComponent,
    updateComponent,
    updateFieldBinding,
    updateVisibility,
    updateDisabled,
    updateCustomAttrs,
    updateSelectOptions,
    getComponentSize,
    isVisible,
    isComponentDisabled,
    selectComponent,
    setDragState,
    clearCanvas,
    setGlobalConfig,
    setCanvasWidth,
    findComponent,
    cleanupAttrNameReferences,
    forceRefresh,
    refreshTrigger,
    getAllFieldValues,
    validateForm,
    resetForm
  }
}
