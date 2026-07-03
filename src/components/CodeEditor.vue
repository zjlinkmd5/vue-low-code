<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as monaco from 'monaco-editor'

const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!editorContainer.value) return
  
  monaco.editor.defineTheme('pageBuilder', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#333333',
      'editor.lineHighlightBackground': '#f0f5ff',
      'editorCursor.foreground': '#409eff',
      'editor.selectionBackground': '#b4d5ff',
    }
  })
  
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language || 'css',
    theme: 'pageBuilder',
    fontSize: 14,
    lineNumbers: 'on',
    minimap: { enabled: false },
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    bracketPairColorization: { enabled: true },
    folding: true,
  })
  
  editor.onDidChangeModelContent(() => {
    if (editor) {
      emit('update:modelValue', editor.getValue())
    }
  })
  
  validateSyntax()
  
  editor.onKeyUp(() => {
    validateSyntax()
  })
})

function validateSyntax() {
  if (!editor) return
  
  const model = editor.getModel()
  if (!model) return
  
  const value = model.getValue()
  const errors: monaco.editor.IMarkerData[] = []
  
  if (props.language === 'html') {
    const openTags = []
    const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g
    let match
    
    while ((match = tagRegex.exec(value)) !== null) {
      const isClosing = match[1] === '/'
      const tagName = match[2].toLowerCase()
      const selfClosing = match[3].endsWith('/')
      
      if (selfClosing) continue
      
      if (isClosing) {
        if (openTags.length === 0) {
          errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: getLineNumber(value, match.index),
            startColumn: 1,
            endLineNumber: getLineNumber(value, match.index),
            endColumn: match[0].length + 1,
            message: `Unmatched closing tag: ${tagName}`
          })
        } else {
          const lastOpen = openTags.pop()
          if (lastOpen !== tagName) {
            errors.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: getLineNumber(value, match.index),
              startColumn: 1,
              endLineNumber: getLineNumber(value, match.index),
              endColumn: match[0].length + 1,
              message: `Tag mismatch: expected </${lastOpen}>, found </${tagName}>`
            })
          }
        }
      } else {
        const voidElements = ['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']
        if (!voidElements.includes(tagName)) {
          openTags.push(tagName)
        }
      }
    }
    
    if (openTags.length > 0) {
      errors.push({
        severity: monaco.MarkerSeverity.Warning,
        startLineNumber: value.split('\n').length,
        startColumn: 1,
        endLineNumber: value.split('\n').length,
        endColumn: 1,
        message: `Unclosed tags: ${openTags.join(', ')}`
      })
    }
  }
  
  monaco.editor.setModelMarkers(model, 'pageBuilder', errors)
}

function getLineNumber(text: string, index: number): number {
  return text.substring(0, index).split('\n').length
}

watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue)
    validateSyntax()
  }
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})

function formatCode() {
  if (!editor) return
  
  const model = editor.getModel()
  if (!model) return
  
  const value = model.getValue()
  if (props.language === 'html') {
    editor.setValue(formatHtml(value))
  } else if (props.language === 'css') {
    editor.setValue(formatCss(value))
  }
}

function formatHtml(code: string): string {
  let formatted = ''
  let indent = 0
  let inTag = false
  let inString = false
  let stringChar = ''
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    const nextChar = code[i + 1]
    
    if (char === '"' || char === "'") {
      if (!inString || stringChar === char) {
        inString = !inString
        stringChar = char
      }
    }
    
    if (!inString) {
      if (char === '<') {
        inTag = true
        if (nextChar === '/') {
          indent = Math.max(0, indent - 1)
          formatted += '\n' + '  '.repeat(indent)
        } else {
          formatted += '\n' + '  '.repeat(indent)
        }
      } else if (char === '>') {
        inTag = false
        if (nextChar !== '<' && nextChar !== '\n' && nextChar !== '\r') {
          formatted += '> '
        } else {
          formatted += '>'
        }
        if (nextChar === '<' && code.substring(i + 2, i + 4) !== '/>') {
          if (!code.substring(i + 1).startsWith('</')) {
            indent++
          }
        }
      } else if (char === '\n' || char === '\r') {
        if (!inTag) {
          formatted += '\n'
        }
      } else if (!inTag) {
        formatted += char
      } else {
        formatted += char
      }
    } else {
      formatted += char
    }
  }
  
  return formatted.trim()
}

function formatCss(code: string): string {
  return code
    .replace(/\{/g, ' {\n')
    .replace(/;/g, ';\n')
    .replace(/\n\s*\n/g, '\n')
    .split('\n')
    .map((line) => {
      if (line.includes('{')) return line.trim()
      if (line.includes('}')) return '}\n'
      if (line.trim()) return '  ' + line.trim()
      return ''
    })
    .join('\n')
    .trim()
}

defineExpose({ formatCode })
</script>

<template>
  <div class="code-editor-wrapper">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<style lang="scss" scoped>
.code-editor-wrapper {
  width: 100%;
  height: 100%;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.editor-container {
  width: 100%;
  height: 100%;
}

:deep(.monaco-editor) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

:deep(.monaco-editor-scrollable) {
  scrollbar-width: thin;
}
</style>
