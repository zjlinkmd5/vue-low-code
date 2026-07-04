import JSZip from 'jszip'
import type { CanvasComponent } from '@/types'

export async function generateVue3TsProject(components: CanvasComponent[], globalConfig: Record<string, unknown>): Promise<Blob> {
  const zip = new JSZip()
  
  zip.file('package.json', JSON.stringify({
    name: 'exported-project',
    version: '1.0.0',
    scripts: {
      dev: 'vite',
      build: 'vue-tsc && vite build',
      preview: 'vite preview'
    },
    dependencies: {
      vue: '^3.4.0',
      'element-plus': '^2.6.0'
    },
    devDependencies: {
      '@vitejs/plugin-vue': '^5.0.0',
      typescript: '^5.4.0',
      'vue-tsc': '^2.0.0',
      vite: '^5.2.0'
    }
  }, null, 2))

  zip.file('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'preserve',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true
    },
    include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
    references: [{ path: './tsconfig.node.json' }]
  }, null, 2))

  zip.file('tsconfig.node.json', JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true
    },
    include: ['vite.config.ts']
  }, null, 2))

  zip.file('vite.config.ts', `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
`)

  zip.file('index.html', `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面导出</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`)

  const srcFolder = zip.folder('src')!
  
  srcFolder.file('main.ts', `import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

createApp(App).use(ElementPlus).mount('#app')
`)

  srcFolder.file('App.vue', generateVue3AppContent(components, globalConfig))

  return zip.generateAsync({ type: 'blob' })
}

export async function generateVue2Project(components: CanvasComponent[], globalConfig: Record<string, unknown>): Promise<Blob> {
  const zip = new JSZip()
  
  zip.file('package.json', JSON.stringify({
    name: 'exported-project',
    version: '1.0.0',
    scripts: {
      dev: 'webpack-dev-server',
      build: 'webpack'
    },
    dependencies: {
      vue: '^2.7.0',
      'element-ui': '^2.15.14'
    },
    devDependencies: {
      'vue-loader': '^15.11.1',
      'vue-template-compiler': '^2.7.0',
      'css-loader': '^6.10.0',
      'style-loader': '^3.3.4',
      'webpack': '^5.90.0',
      'webpack-cli': '^5.1.4',
      'webpack-dev-server': '^4.15.1'
    }
  }, null, 2))

  zip.file('webpack.config.js', `const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ],
  devServer: {
    contentBase: './dist',
    hot: true
  }
}
`)

  zip.file('index.html', `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面导出</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="./dist/bundle.js"></script>
  </body>
</html>
`)

  const srcFolder = zip.folder('src')!
  
  srcFolder.file('main.js', `import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import App from './App.vue'

Vue.use(ElementUI)

new Vue({
  el: '#app',
  render: h => h(App)
})
`)

  srcFolder.file('App.vue', generateVue2AppContent(components, globalConfig))

  return zip.generateAsync({ type: 'blob' })
}

function generateVue3AppContent(components: CanvasComponent[], globalConfig: Record<string, unknown>): string {
  const labelWidth = globalConfig.labelWidth || 'auto'
  const labelWidthStyle = labelWidth !== 'auto' ? 'width: ' + labelWidth + 'px; flex-shrink: 0;' : 'flex: 0 0 auto;'
  
  const componentsHtml = components.map(c => generateVue3ComponentHtml(c)).join('\n')

  return `<template>
  <div class="canvas-container">
    ${componentsHtml}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const formData = ref<Record<string, unknown>>({})

function formatDateTime(date: Date): string {
  const Y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const D = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return Y + '-' + M + '-' + D + ' ' + h + ':' + m + ':' + s
}

function handleDateChange(compId: string, val: unknown) {
  if (val) {
    const date = new Date(val as string)
    formData.value[compId] = formatDateTime(date)
  } else {
    formData.value[compId] = val
  }
}

function handleInputChange(compId: string, val: unknown) {
  formData.value[compId] = val
}

function handleSelectChange(compId: string, val: unknown) {
  formData.value[compId] = val
}

function handleSubmit() {
  console.log('表单数据:', formData.value)
}
</script>

<style scoped>
.canvas-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  min-height: 100vh;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
.form-field {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
}
.form-label {
  ${labelWidthStyle}
  text-align: right;
  padding-right: 12px;
  font-weight: 500;
  color: #606266;
}
.form-content {
  flex: 1;
}
.el-select, .el-input {
  width: 100%;
}
</style>
`
}

function generateVue2AppContent(components: CanvasComponent[], globalConfig: Record<string, unknown>): string {
  const labelWidth = globalConfig.labelWidth || 'auto'
  const labelWidthStyle = labelWidth !== 'auto' ? 'width: ' + labelWidth + 'px; flex-shrink: 0;' : 'flex: 0 0 auto;'
  
  const componentsHtml = components.map(c => generateVue2ComponentHtml(c)).join('\n')

  return `<template>
  <div class="canvas-container">
    ${componentsHtml}
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      formData: {}
    }
  },
  methods: {
    formatDateTime(date) {
      const d = new Date(date)
      const Y = d.getFullYear()
      const M = String(d.getMonth() + 1).padStart(2, '0')
      const D = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const m = String(d.getMinutes()).padStart(2, '0')
      const s = String(d.getSeconds()).padStart(2, '0')
      return Y + '-' + M + '-' + D + ' ' + h + ':' + m + ':' + s
    },
    handleDateChange(compId, val) {
      if (val) {
        const date = new Date(val)
        this.formData[compId] = this.formatDateTime(date)
      } else {
        this.formData[compId] = val
      }
    },
    handleInputChange(compId, val) {
      this.formData[compId] = val
    },
    handleSelectChange(compId, val) {
      this.formData[compId] = val
    },
    handleSubmit() {
      console.log('表单数据:', this.formData)
    }
  }
}
</script>

<style scoped>
.canvas-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  min-height: 100vh;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
.form-field {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
}
.form-label {
  ${labelWidthStyle}
  text-align: right;
  padding-right: 12px;
  font-weight: 500;
  color: #606266;
}
.form-content {
  flex: 1;
}
.el-select, .el-input {
  width: 100%;
}
</style>
`
}

function generateVue3ComponentHtml(component: CanvasComponent): string {
  const label = component.props.label as string || ''
  const required = component.props.required as boolean || false

  let labelHtml = ''
  if (label) {
    labelHtml = `<label class="form-label">${required ? '<span style="color: #f56c6c; margin-right: 4px;">*</span>' : ''}${label}</label>`
  }

  let contentHtml = ''
  switch (component.type) {
    case 'Input':
      contentHtml = `<el-input v-model="formData['${component.id}']" @input="handleInputChange('${component.id}', $event)" :placeholder="${JSON.stringify(component.props.placeholder as string || '请输入内容')}" />`
      break
    case 'Textarea':
      contentHtml = `<el-input v-model="formData['${component.id}']" @input="handleInputChange('${component.id}', $event)" type="textarea" :placeholder="${JSON.stringify(component.props.placeholder as string || '请输入内容')}" />`
      break
    case 'Select': {
      const options = component.props.options as {label: string; value: unknown}[] || []
      const optionsHtml = options.map(o => `<el-option :label="${JSON.stringify(o.label)}" :value="${JSON.stringify(o.value)}" />`).join('\n')
      contentHtml = `<el-select v-model="formData['${component.id}']" @change="handleSelectChange('${component.id}', $event)" :placeholder="${JSON.stringify(component.props.placeholder as string || '请选择')}">${optionsHtml}</el-select>`
      break
    }
    case 'DatePicker':
      contentHtml = `<el-date-picker v-model="formData['${component.id}']" @change="handleDateChange('${component.id}', $event)" type="${component.props.type || 'date'}" :value-format="'yyyy-MM-dd HH:mm:ss'" />`
      break
    case 'DateRangePicker':
      contentHtml = `<el-date-picker v-model="formData['${component.id}']" type="daterange" :value-format="'yyyy-MM-dd HH:mm:ss'" />`
      break
    case 'Button':
      contentHtml = `<el-button type="${component.props.type || 'primary'}" @click="handleSubmit">${component.props.text || '按钮'}</el-button>`
      break
    case 'Card':
      contentHtml = `<el-card :title="${JSON.stringify(component.props.title as string || '')}"></el-card>`
      break
    default:
      contentHtml = `<div>${component.type}</div>`
  }

  return `<div class="form-field">${labelHtml}<div class="form-content">${contentHtml}</div></div>`
}

function generateVue2ComponentHtml(component: CanvasComponent): string {
  const label = component.props.label as string || ''
  const required = component.props.required as boolean || false

  let labelHtml = ''
  if (label) {
    labelHtml = `<label class="form-label">${required ? '<span style="color: #f56c6c; margin-right: 4px;">*</span>' : ''}${label}</label>`
  }

  let contentHtml = ''
  switch (component.type) {
    case 'Input':
      contentHtml = `<el-input v-model="formData['${component.id}']" @input="handleInputChange('${component.id}', $event)" :placeholder="${JSON.stringify(component.props.placeholder as string || '请输入内容')}" />`
      break
    case 'Textarea':
      contentHtml = `<el-input v-model="formData['${component.id}']" @input="handleInputChange('${component.id}', $event)" type="textarea" :placeholder="${JSON.stringify(component.props.placeholder as string || '请输入内容')}" />`
      break
    case 'Select': {
      const options = component.props.options as {label: string; value: unknown}[] || []
      const optionsHtml = options.map(o => `<el-option :label="${JSON.stringify(o.label)}" :value="${JSON.stringify(o.value)}" />`).join('\n')
      contentHtml = `<el-select v-model="formData['${component.id}']" @change="handleSelectChange('${component.id}', $event)" :placeholder="${JSON.stringify(component.props.placeholder as string || '请选择')}">${optionsHtml}</el-select>`
      break
    }
    case 'DatePicker':
      contentHtml = `<el-date-picker v-model="formData['${component.id}']" @change="handleDateChange('${component.id}', $event)" type="${component.props.type || 'date'}" value-format="yyyy-MM-dd HH:mm:ss" />`
      break
    case 'DateRangePicker':
      contentHtml = `<el-date-picker v-model="formData['${component.id}']" type="daterange" value-format="yyyy-MM-dd HH:mm:ss" />`
      break
    case 'Button':
      contentHtml = `<el-button type="${component.props.type || 'primary'}" @click="handleSubmit">${component.props.text || '按钮'}</el-button>`
      break
    case 'Card':
      contentHtml = `<el-card :title="${JSON.stringify(component.props.title as string || '')}"></el-card>`
      break
    default:
      contentHtml = `<div>${component.type}</div>`
  }

  return `<div class="form-field">${labelHtml}<div class="form-content">${contentHtml}</div></div>`
}
