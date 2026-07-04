export interface ComponentConfig {
  id: string
  type: string
  label: string
  icon: string
  defaultProps: Record<string, unknown>
}

export interface ConditionRule {
  field: string
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'empty' | 'notEmpty'
  value: string
}

export type DerivedFieldType = 'concat' | 'numberFormat' | 'dateCompare' | 'custom'

export interface DerivedField {
  name: string
  type: DerivedFieldType
  config: DerivedFieldConfig
}

export interface DerivedFieldConfig {
  fields?: string[]
  separator?: string
  format?: string
  targetDate?: string
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<='
  expression?: string
}

export interface FieldBinding {
  fieldName: string
  labelField?: string
  valueField?: string
}

export interface VisibilityConfig {
  enabled: boolean
  conditions: ConditionRule[]
}

export interface DisabledConfig {
  enabled: boolean
  conditions: ConditionRule[]
}

export interface ListColumn {
  key: string
  label: string
  width?: string
  sortable?: boolean
  sortType?: 'string' | 'number' | 'date'
}

export interface CanvasComponent {
  id: string
  type: string
  props: Record<string, unknown>
  value?: unknown
  fieldBinding?: FieldBinding
  visibility?: VisibilityConfig
  disabled?: DisabledConfig
  customAttrs?: Record<string, string>
  children?: CanvasComponent[]
}

export interface DragState {
  isDragging: boolean
  componentType: string
  offsetX: number
  offsetY: number
}

export interface GlobalConfig {
  defaultSize: 'small' | 'medium' | 'large'
  labelWidth: string
}
