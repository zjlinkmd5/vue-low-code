<script setup lang="ts">
import { ref } from 'vue'
import { useCanvas } from '@/composables/useCanvas'
import ComponentPanel from './ComponentPanel.vue'
import Canvas from './Canvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { generateHtmlExport } from '@/utils/exportGenerator'
import { generateVue3TsProject, generateVue2Project } from '@/utils/projectGenerator'

const { components, clearCanvas, globalConfig, setGlobalConfig, getAllFieldValues, validateForm, resetForm } = useCanvas()

const showGlobalConfig = ref(false)
const showFieldValues = ref(false)
const showSubmitResult = ref(false)
const showExportDialog = ref(false)
const exportFormat = ref<'html' | 'vue2' | 'vue3-ts'>('html')
const submitResult = ref<{ success: boolean; message: string; errors?: Array<{ fieldName: string; message: string }> }>({ success: false, message: '' })

function handleExport() {
  const data = localStorage.getItem('pageBuilderData')
  const content = data || '[]'
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'page-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function handlePageExport() {
  if (exportFormat.value === 'html') {
    const blob = await generateHtmlExport(components.value, globalConfig.value)
    downloadBlob(blob, 'html-export.zip')
  } else if (exportFormat.value === 'vue3-ts') {
    const blob = await generateVue3TsProject(components.value, globalConfig.value)
    downloadBlob(blob, 'vue3-ts-project.zip')
  } else if (exportFormat.value === 'vue2') {
    const blob = await generateVue2Project(components.value, globalConfig.value)
    downloadBlob(blob, 'vue2-project.zip')
  }
  showExportDialog.value = false
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function handleSubmit() {
  const result = validateForm()
  if (result.valid) {
    const formData = getAllFieldValues()
    submitResult.value = {
      success: true,
      message: '表单提交成功！',
      errors: []
    }
    console.log('表单数据:', formData)
  } else {
    submitResult.value = {
      success: false,
      message: `表单校验失败，共 ${result.errors.length} 个错误`,
      errors: result.errors.map(e => ({ fieldName: e.fieldName, message: e.message }))
    }
  }
  showSubmitResult.value = true
}

function handleButtonClick(submitType: string) {
  switch (submitType) {
    case 'submit':
      handleSubmit()
      break
    case 'reset':
      resetForm()
      break
  }
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      localStorage.setItem('pageBuilderData', JSON.stringify(data))
      location.reload()
    } catch {
      alert('导入失败，请确保文件格式正确')
    }
  }
  reader.readAsText(file)
}

function handleClear() {
  if (confirm('确定要清空画布吗？')) {
    clearCanvas()
  }
}
</script>

<template>
  <div class="page-builder">
    <header class="builder-header">
      <div class="header-left">
        <h1>页面搭建平台</h1>
      </div>
      <div class="header-right">
        <button class="action-btn" @click="showFieldValues = true">
          <i class="el-icon-data-line"></i>
          <span>表单字段值</span>
        </button>
        <button class="action-btn primary" @click="handleSubmit">
          <i class="el-icon-check"></i>
          <span>提交表单</span>
        </button>
        <button class="action-btn" @click="showGlobalConfig = true">
          <i class="el-icon-setting"></i>
          <span>全局配置</span>
        </button>
        <input
          type="file"
          id="import-file"
          class="import-input"
          accept=".json"
          @change="handleImport"
        />
        <label for="import-file" class="import-btn">
          <i class="el-icon-upload"></i>
          <span>导入配置</span>
        </label>
        <button class="action-btn" @click="handleExport">
          <i class="el-icon-download"></i>
          <span>导出配置</span>
        </button>
        <button class="action-btn" @click="showExportDialog = true">
          <i class="el-icon-upload2"></i>
          <span>页面导出</span>
        </button>
        <button class="action-btn danger" @click="handleClear">
          <i class="el-icon-delete"></i>
          <span>清空画布</span>
        </button>
      </div>
    </header>
    
    <main class="builder-main">
      <ComponentPanel />
      <Canvas @button-click="handleButtonClick" />
      <PropertyPanel />
    </main>
    
    <el-dialog
      v-model="showGlobalConfig"
      title="全局配置"
      width="400px"
    >
      <div class="global-config-form">
        <div class="config-item">
          <label class="config-label">默认组件大小</label>
          <el-select
            :model-value="globalConfig.defaultSize"
            @change="setGlobalConfig({ defaultSize: $event, labelWidth: globalConfig.labelWidth || 'auto' })"
          >
            <el-option label="小型" value="small" />
            <el-option label="中等" value="medium" />
            <el-option label="大型" value="large" />
          </el-select>
        </div>
        <div class="config-item">
          <label class="config-label">表单标题宽度</label>
          <el-select
            :model-value="globalConfig.labelWidth || 'auto'"
            @change="setGlobalConfig({ defaultSize: globalConfig.defaultSize, labelWidth: $event })"
          >
            <el-option label="自适应" value="auto" />
            <el-option label="80px" value="80px" />
            <el-option label="100px" value="100px" />
            <el-option label="120px" value="120px" />
            <el-option label="150px" value="150px" />
            <el-option label="200px" value="200px" />
          </el-select>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showFieldValues"
      title="表单字段值"
      width="600px"
    >
      <div class="field-values-dialog">
        <div v-if="Object.keys(getAllFieldValues()).length === 0" class="empty-fields">
          <span>暂无字段绑定</span>
        </div>
        <div v-else class="field-grid">
          <div
            v-for="(value, fieldName) in getAllFieldValues()"
            :key="fieldName"
            class="field-item"
          >
            <span class="field-name">{{ fieldName }}</span>
            <span class="field-value">{{ value !== null && value !== undefined ? value : '-' }}</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showSubmitResult"
      :title="submitResult.success ? '提交成功' : '提交失败'"
      width="500px"
    >
      <div class="submit-result">
        <div :class="['result-icon', submitResult.success ? 'success' : 'error']">
          <i v-if="submitResult.success" class="el-icon-check"></i>
          <i v-else class="el-icon-error"></i>
        </div>
        <p class="result-message">{{ submitResult.message }}</p>
        <div v-if="submitResult.errors && submitResult.errors.length > 0" class="error-list">
          <h4>错误详情：</h4>
          <ul>
            <li v-for="(error, index) in submitResult.errors" :key="index">
              <span class="error-field">{{ error.fieldName }}</span>
              <span class="error-text">{{ error.message }}</span>
            </li>
          </ul>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showExportDialog"
      title="页面导出"
      width="400px"
    >
      <div class="export-form">
        <div class="export-item">
          <label class="export-label">导出格式</label>
          <el-radio-group v-model="exportFormat">
            <el-radio label="html">HTML 文件</el-radio>
            <el-radio label="vue3-ts">Vue3 + TypeScript 项目包</el-radio>
            <el-radio label="vue2">Vue2 项目包</el-radio>
          </el-radio-group>
        </div>
        <div class="export-tips">
          <p><strong>HTML 文件</strong>：导出为单个 HTML 文件，包含完整样式和交互功能</p>
          <p><strong>Vue3 + TS 项目包</strong>：导出为 zip 压缩包，包含完整项目结构，执行 npm install && npm run dev 即可运行</p>
          <p><strong>Vue2 项目包</strong>：导出为 zip 压缩包，包含完整项目结构，执行 npm install && npm run dev 即可运行</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="showExportDialog = false">取消</el-button>
        <el-button type="primary" @click="handlePageExport">确认导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-builder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.builder-header {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.import-input {
  display: none;
}

.import-btn, .action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #409eff;
    color: #409eff;
  }
  
  &.danger {
    &:hover {
      border-color: #f56c6c;
      color: #f56c6c;
    }
  }
  
  i {
    font-size: 14px;
  }
}

.builder-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.global-config-form {
  padding: 16px 0;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.config-label {
  font-size: 14px;
  color: #666;
}

.field-values-dialog {
  max-height: 400px;
  overflow-y: auto;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.field-item {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.field-name {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: #2d3436;
  word-break: break-word;
}

.empty-fields {
  text-align: center;
  padding: 40px;
  color: #adb5bd;
  font-size: 14px;
}

.submit-result {
  text-align: center;
  padding: 20px;
}

.result-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
  
  &.success {
    background: #f0f9eb;
    color: #67c23a;
  }
  
  &.error {
    background: #fef0f0;
    color: #f56c6c;
  }
}

.result-message {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
}

.error-list {
  text-align: left;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #666;
  }
  
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    
    li {
      display: flex;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
  
  .error-field {
    font-weight: 600;
    color: #f56c6c;
    margin-right: 8px;
  }
  
  .error-text {
    color: #666;
  }
}

.action-btn.primary {
  background: #409eff;
  color: white;
  
  &:hover {
    background: #66b1ff;
  }
}

.export-form {
  .export-item {
    margin-bottom: 16px;
  }

  .export-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #606266;
  }

  .export-tips {
    background: #f5f7fa;
    padding: 12px;
    border-radius: 4px;
    font-size: 13px;
    color: #909399;

    p {
      margin: 4px 0;
      line-height: 1.6;
    }

    strong {
      color: #606266;
    }
  }
}
</style>
