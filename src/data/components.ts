import type { ComponentConfig } from '@/types'

export const componentList: ComponentConfig[] = [
  {
    id: 'text',
    type: 'Text',
    label: '文本',
    icon: 'el-icon-document',
    defaultProps: {
      content: '这是一段文本',
      fontSize: '16px',
      fontWeight: 'normal',
      color: '#333333',
      textAlign: 'left',
      derivedFields: []
    }
  },
  {
    id: 'heading',
    type: 'Heading',
    label: '标题',
    icon: 'el-icon-s-order',
    defaultProps: {
      content: '标题文本',
      level: 1,
      color: '#333333',
      derivedFields: []
    }
  },
  {
    id: 'button',
    type: 'Button',
    label: '按钮',
    icon: 'el-icon-s-promotion',
    defaultProps: {
      text: '按钮',
      type: 'primary',
      size: 'medium',
      round: false,
      submitType: 'none',
      derivedFields: []
    }
  },
  {
    id: 'image',
    type: 'Image',
    label: '图片',
    icon: 'el-icon-picture',
    defaultProps: {
      src: 'https://via.placeholder.com/300x200',
      alt: '图片',
      width: '300px',
      height: '200px',
      borderRadius: '0px',
      derivedFields: []
    }
  },
  {
    id: 'input',
    type: 'Input',
    label: '输入框',
    icon: 'el-icon-user',
    defaultProps: {
      placeholder: '请输入内容',
      size: 'medium',
      disabled: false,
      clearable: true,
      required: false,
      inputType: 'text',
      maxLength: null,
      maxValue: null,
      minValue: null,
      decimalPlaces: null,
      derivedFields: []
    }
  },
  {
    id: 'select',
    type: 'Select',
    label: '下拉选择',
    icon: 'el-icon-arrow-down',
    defaultProps: {
      placeholder: '请选择',
      size: 'medium',
      required: false,
      options: [
        { label: '选项1', value: '1' },
        { label: '选项2', value: '2' },
        { label: '选项3', value: '3' }
      ],
      customAttrs: {},
      derivedFields: []
    }
  },
  {
    id: 'date-picker',
    type: 'DatePicker',
    label: '日期选择器',
    icon: 'el-icon-date',
    defaultProps: {
      placeholder: '请选择日期',
      size: 'medium',
      type: 'date',
      range: false,
      disabled: false,
      required: false,
      derivedFields: []
    }
  },
  {
    id: 'card',
    type: 'Card',
    label: '卡片',
    icon: 'el-icon-s-data',
    defaultProps: {
      title: '卡片标题',
      shadow: 'hover',
      derivedFields: []
    }
  },
  {
    id: 'divider',
    type: 'Divider',
    label: '分割线',
    icon: 'el-icon-minus',
    defaultProps: {
      content: '',
      direction: 'horizontal',
      derivedFields: []
    }
  },
  {
    id: 'space',
    type: 'Space',
    label: '间距',
    icon: 'el-icon-s-unfold',
    defaultProps: {
      size: 'medium',
      derivedFields: []
    }
  },
  {
    id: 'grid',
    type: 'Grid',
    label: '栅格布局',
    icon: 'el-icon-s-grid',
    defaultProps: {
      columns: 2,
      gutter: 20,
      derivedFields: []
    }
  }
]

export const getComponentConfig = (type: string): ComponentConfig | undefined => {
  return componentList.find(c => c.type === type || c.id === type)
}

export const datePickerTypes = [
  { label: '日', value: 'date' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
  { label: '季度', value: 'quarter' }
]

export const inputTypes = [
  { label: '任意字符', value: 'text' },
  { label: '仅数字', value: 'number' },
  { label: '仅中文', value: 'chinese' },
  { label: '仅英文', value: 'english' },
  { label: '英文和数字', value: 'englishNumber' },
  { label: '数字(带小数)', value: 'decimal' }
]

export const derivedFieldTypes = [
  { label: '字符串拼接', value: 'concat' },
  { label: '数值格式化', value: 'numberFormat' },
  { label: '日期比较', value: 'dateCompare' },
  { label: '自定义表达式', value: 'custom' }
]

export const numberFormats = [
  { label: '保留2位小数', value: '0.00' },
  { label: '保留1位小数', value: '0.0' },
  { label: '整数', value: '0' },
  { label: '千分位', value: ',0.00' },
  { label: '百分比', value: '0%' }
]

export const operators = [
  { label: '等于', value: '==' },
  { label: '不等于', value: '!=' },
  { label: '大于', value: '>' },
  { label: '小于', value: '<' },
  { label: '大于等于', value: '>=' },
  { label: '小于等于', value: '<=' },
  { label: '包含', value: 'contains' },
  { label: '为空', value: 'empty' },
  { label: '不为空', value: 'notEmpty' }
]

export const buttonSubmitTypes = [
  { label: '普通按钮', value: 'none' },
  { label: '表单提交（校验必填）', value: 'submit' },
  { label: '表单重置', value: 'reset' }
]
