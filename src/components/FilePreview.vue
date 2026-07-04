<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import * as mammoth from 'mammoth'
import * as xlsx from 'xlsx'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import type { WorkBook, WorkSheet } from 'xlsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

interface FileItem {
  id: string
  name: string
  type: string
  url: string
  data?: ArrayBuffer
  rawFile?: File
}

interface PdfAnnotation {
  id: string
  x: number
  y: number
  text: string
  page: number
}

const fileInput = ref<HTMLInputElement | null>(null)
const fileList = ref<FileItem[]>([])
const previewVisible = ref(false)
const selectedFile = ref<FileItem | null>(null)
const excelData = ref<any[][]>([])
const excelHeaders = ref<string[]>([])
const editingCell = ref<{ row: number; col: number } | null>(null)
const cellValue = ref('')
const columnWidths = ref<Record<number, string>>({})
const docxContent = ref('')
const docxLoading = ref(false)
const pdfLoading = ref(false)
const pdfScale = ref(1)
const pdfPage = ref(1)
const pdfNumPages = ref(0)
const pdfCanvas = ref<HTMLCanvasElement | null>(null)
const isDocxEditing = ref(false)
const pdfAnnotations = ref<PdfAnnotation[]>([])
const isPdfEditing = ref(false)
const newAnnotationText = ref('')
const editingAnnotation = ref<PdfAnnotation | null>(null)
const annotationDialogVisible = ref(false)

const fileType = computed(() => {
  if (!selectedFile.value) return ''
  const ext = selectedFile.value.name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  return ''
})

watch(previewVisible, async (val) => {
  if (val && selectedFile.value) {
    if (fileType.value === 'docx') {
      docxLoading.value = true
      docxContent.value = ''
      await loadDocxContent(selectedFile.value)
    } else if (fileType.value === 'pdf') {
      pdfLoading.value = true
      pdfAnnotations.value = []
      await nextTick()
      await renderPdf()
    }
  }
})

async function loadDocxContent(fileItem: FileItem) {
  if (!fileItem.data) return
  
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: fileItem.data })
    docxContent.value = result.value
  } catch (error) {
    console.error('Failed to load docx:', error)
    docxContent.value = '<p>无法预览此Word文档，请下载查看</p>'
  } finally {
    docxLoading.value = false
  }
}

async function renderPdf() {
  if (!selectedFile.value?.data || !pdfCanvas.value) {
    pdfLoading.value = false
    return
  }

  try {
    const pdfData = new Uint8Array(selectedFile.value.data)
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise
    
    pdfNumPages.value = pdfDoc.numPages
    
    const page = await pdfDoc.getPage(pdfPage.value)
    const viewport = page.getViewport({ scale: pdfScale.value })
    
    const canvas = pdfCanvas.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    }
    
    await page.render(renderContext).promise
  } catch (error) {
    console.error('Failed to render PDF:', error)
  } finally {
    pdfLoading.value = false
  }
}

function openFileDialog() {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const arrayBuffer = e.target?.result as ArrayBuffer
    const url = URL.createObjectURL(file)
    fileList.value.push({
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      url,
      data: arrayBuffer,
      rawFile: file
    })
  }
  reader.readAsArrayBuffer(file)
  
  target.value = ''
}

function handleRemove(fileItem: FileItem) {
  const index = fileList.value.findIndex(f => f.id === fileItem.id)
  if (index !== -1) {
    fileList.value.splice(index, 1)
  }
}

function openPreview(fileItem: FileItem) {
  selectedFile.value = fileItem
  previewVisible.value = true
  
  if ((fileItem.name.endsWith('.xlsx') || fileItem.name.endsWith('.xls')) && fileItem.data) {
    parseExcel(fileItem.data)
  }
}

function parseExcel(data: ArrayBuffer) {
  const workbook: WorkBook = xlsx.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet: WorkSheet = workbook.Sheets[sheetName]
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 })
  
  if (jsonData.length > 0) {
    excelHeaders.value = jsonData[0] as string[]
    excelData.value = jsonData.slice(1) as any[][]
  }
}

function handleExcelCellClick(row: number, col: number) {
  editingCell.value = { row, col }
  cellValue.value = String(excelData.value[row]?.[col] || '')
  
  calculateColumnWidth(col)
}

function calculateColumnWidth(col: number) {
  let maxLength = String(excelHeaders.value[col] || '').length
  
  excelData.value.forEach(row => {
    const cellValue = String(row[col] || '')
    maxLength = Math.max(maxLength, cellValue.length)
  })
  
  const width = Math.max(maxLength * 14 + 40, 80)
  columnWidths.value[col] = `${width}px`
}

function saveCellValue() {
  if (editingCell.value) {
    const { row, col } = editingCell.value
    if (!excelData.value[row]) {
      excelData.value[row] = []
    }
    excelData.value[row][col] = cellValue.value
    editingCell.value = null
    cellValue.value = ''
  }
}

function saveExcel() {
  const data = [excelHeaders.value, ...excelData.value]
  const worksheet: WorkSheet = xlsx.utils.aoa_to_sheet(data)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  
  const buffer = xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  
  downloadFile(selectedFile.value!.name, url)
}

async function savePdfWithAnnotations() {
  if (!selectedFile.value?.data || pdfAnnotations.value.length === 0) {
    saveFile()
    return
  }

  try {
    const pdfDoc = await PDFDocument.load(selectedFile.value.data)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    pdfAnnotations.value.forEach(annotation => {
      const page = pdfDoc.getPage(annotation.page - 1)
      const { height } = page.getSize()
      page.drawText(annotation.text, {
        x: annotation.x,
        y: height - annotation.y,
        font,
        size: 14,
        color: rgb(1, 0, 0)
      })
    })
    
    const pdfBytes = await pdfDoc.save()
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength)
    new Uint8Array(pdfBuffer).set(pdfBytes)
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    downloadFile(selectedFile.value.name, url)
  } catch (error) {
    console.error('Failed to save PDF:', error)
    saveFile()
  }
}

async function saveDocx() {
  if (!selectedFile.value) return
  
  const blob = new Blob([docxContent.value], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  downloadFile(selectedFile.value.name.replace(/\.(docx|doc)$/, '.html'), url)
}

function saveFile() {
  downloadFile(selectedFile.value!.name, selectedFile.value!.url)
}

function downloadFile(name: string, url: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function closePreview() {
  previewVisible.value = false
  selectedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  docxContent.value = ''
  docxLoading.value = false
  pdfLoading.value = false
  isDocxEditing.value = false
  isPdfEditing.value = false
  pdfAnnotations.value = []
  newAnnotationText.value = ''
  editingAnnotation.value = null
  annotationDialogVisible.value = false
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'el-icon-file'
  if (ext === 'docx' || ext === 'doc') return 'el-icon-document'
  if (ext === 'xlsx' || ext === 'xls') return 'el-icon-s-data'
  return 'el-icon-file'
}

function addPdfAnnotation() {
  if (!newAnnotationText.value.trim()) return
  
  pdfAnnotations.value.push({
    id: Date.now().toString(),
    x: 50 + Math.random() * 200,
    y: 50 + Math.random() * 400,
    text: newAnnotationText.value,
    page: pdfPage.value
  })
  newAnnotationText.value = ''
}

function editAnnotation(annotation: PdfAnnotation) {
  editingAnnotation.value = annotation
  annotationDialogVisible.value = true
}

function deleteAnnotation(id: string) {
  pdfAnnotations.value = pdfAnnotations.value.filter(a => a.id !== id)
}

function updateAnnotation() {
  if (editingAnnotation.value) {
    const index = pdfAnnotations.value.findIndex(a => a.id === editingAnnotation.value!.id)
    if (index !== -1) {
      pdfAnnotations.value[index] = { ...editingAnnotation.value }
    }
    editingAnnotation.value = null
    annotationDialogVisible.value = false
  }
}

function zoomIn() {
  pdfScale.value = Math.min(pdfScale.value + 0.1, 3)
  renderPdf()
}

function zoomOut() {
  pdfScale.value = Math.max(pdfScale.value - 0.1, 0.5)
  renderPdf()
}

function goToPage(page: number) {
  if (page >= 1 && page <= pdfNumPages.value) {
    pdfPage.value = page
    renderPdf()
  }
}
</script>

<template>
  <div class="file-preview-component">
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.docx,.doc,.xlsx,.xls"
      class="hidden-input"
      @change="handleFileSelect"
    />
    <el-button type="primary" @click="openFileDialog">
      <i class="el-icon-plus"></i>
      上传文件
    </el-button>

    <div v-if="fileList.length > 0" class="file-list">
      <h4 class="file-list-title">已上传文件</h4>
      <div class="file-items">
        <div
          v-for="file in fileList"
          :key="file.id"
          class="file-item"
        >
          <div class="file-info" @click="openPreview(file)">
            <i :class="getFileIcon(file.name)" class="file-icon"></i>
            <span class="file-name">{{ file.name }}</span>
          </div>
          <div class="file-actions">
            <el-button size="small" type="primary" @click="openPreview(file)">
              <i class="el-icon-view"></i>
              预览
            </el-button>
            <el-button size="small" type="danger" @click="handleRemove(file)">
              <i class="el-icon-delete"></i>
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      title="文件预览"
      width="100%"
      top="0"
      class="fullscreen-file-dialog"
      append-to-body
      @close="closePreview"
    >
      <div class="preview-container">
        <div class="preview-toolbar">
          <span class="preview-title">{{ selectedFile?.name }}</span>
          <div class="preview-buttons">
            <el-button v-if="fileType === 'pdf'" type="warning" @click="isPdfEditing = !isPdfEditing">
              <i class="el-icon-edit"></i>
              {{ isPdfEditing ? '退出编辑' : '编辑模式' }}
            </el-button>
            <el-button v-if="fileType === 'docx'" type="warning" @click="isDocxEditing = !isDocxEditing">
              <i class="el-icon-edit"></i>
              {{ isDocxEditing ? '退出编辑' : '编辑模式' }}
            </el-button>
            <el-button type="success" @click="fileType === 'excel' ? saveExcel() : (fileType === 'pdf' ? savePdfWithAnnotations() : (fileType === 'docx' ? saveDocx() : saveFile()))">
              <i class="el-icon-download"></i>
              保存文件
            </el-button>
            <el-button type="danger" @click="closePreview">
              <i class="el-icon-close"></i>
              关闭
            </el-button>
          </div>
        </div>

        <div v-if="fileType === 'pdf' && isPdfEditing" class="pdf-edit-panel">
          <div class="edit-panel-content">
            <span class="edit-label">添加批注:</span>
            <el-input v-model="newAnnotationText" placeholder="输入批注内容" style="width: 300px;" @keyup.enter="addPdfAnnotation" />
            <el-button type="primary" @click="addPdfAnnotation">添加</el-button>
            
            <div v-if="pdfAnnotations.length > 0" class="annotation-list">
              <h4>批注列表</h4>
              <el-table :data="pdfAnnotations" border style="width: 100%; margin-top: 10px;">
                <el-table-column prop="text" label="批注内容" />
                <el-table-column prop="page" label="页码" />
                <el-table-column label="操作" width="150">
                  <template #default="{ row }">
                    <el-button size="small" @click="editAnnotation(row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="deleteAnnotation(row.id)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <el-dialog v-model="annotationDialogVisible" title="编辑批注">
              <el-input v-model="editingAnnotation!.text" />
              <template #footer>
                <el-button @click="annotationDialogVisible = false; editingAnnotation = null">取消</el-button>
                <el-button type="primary" @click="updateAnnotation">确定</el-button>
              </template>
            </el-dialog>
          </div>
        </div>

        <div class="preview-content">
          <div v-if="fileType === 'pdf'" class="document-viewer">
            <div class="pdf-toolbar">
              <el-button size="small" @click="zoomOut">-</el-button>
              <span>{{ Math.round(pdfScale * 100) }}%</span>
              <el-button size="small" @click="zoomIn">+</el-button>
              <span style="margin-left: 20px;">第 {{ pdfPage }} / {{ pdfNumPages }} 页</span>
              <el-button size="small" @click="goToPage(pdfPage - 1)" :disabled="pdfPage <= 1">上一页</el-button>
              <el-button size="small" @click="goToPage(pdfPage + 1)" :disabled="pdfPage >= pdfNumPages">下一页</el-button>
            </div>
            <el-loading v-if="pdfLoading" text="加载中..." />
            <div class="pdf-canvas-wrapper">
              <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
            </div>
          </div>
          
          <div v-else-if="fileType === 'docx'" class="document-viewer">
            <el-loading v-if="docxLoading" text="加载中..." />
            <div 
              contenteditable="true"
              v-html="docxContent" 
              class="docx-content"
              :class="{ editing: isDocxEditing }"
            ></div>
          </div>
          
          <div v-else-if="fileType === 'excel'" class="excel-viewer">
            <el-table :data="excelData" border style="width: 100%;">
              <el-table-column
                v-for="(header, index) in excelHeaders"
                :key="index"
                :label="header"
                :width="columnWidths[index]"
              >
                <template #default="{ row, $index }">
                  <div
                    class="editable-cell"
                    :class="{ editing: editingCell?.row === $index && editingCell?.col === index }"
                    @click="handleExcelCellClick($index, index)"
                  >
                    <span v-if="!(editingCell?.row === $index && editingCell?.col === index)">
                      {{ row[index] }}
                    </span>
                    <el-input
                      v-else
                      v-model="cellValue"
                      @blur="saveCellValue"
                      @keyup.enter="saveCellValue"
                      class="cell-input"
                      size="large"
                    />
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.file-preview-component {
  padding: 16px;
}

.hidden-input {
  display: none;
}

.file-list {
  margin-top: 16px;
}

.file-list-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.file-items {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f5f7fa;
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  .file-icon {
    font-size: 24px;
    color: #409eff;
  }

  .file-name {
    font-size: 14px;
    color: #303133;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.file-actions {
  display: flex;
  gap: 8px;
}

.preview-container {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;

  .preview-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .preview-buttons {
    display: flex;
    gap: 8px;
  }
}

.pdf-edit-panel {
  padding: 12px 16px;
  background: #fffbe6;
  border-bottom: 1px solid #ffe58f;
  flex-shrink: 0;

  .edit-panel-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .edit-label {
    font-size: 14px;
    font-weight: 500;
  }

  .annotation-list {
    width: 100%;
    margin-top: 12px;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.document-viewer {
  width: 100%;
  height: calc(100vh - 180px);
  position: relative;
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.pdf-canvas-wrapper {
  width: 100%;
  height: calc(100% - 40px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
  background: #f5f5f5;
}

.pdf-canvas {
  max-width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.docx-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 500px;
  
  &.editing {
    outline: 2px dashed #409eff;
    outline-offset: -4px;
  }
  
  :deep(p) {
    margin: 0 0 1em 0;
    line-height: 1.8;
  }
  
  :deep(h1) {
    font-size: 24px;
    font-weight: bold;
    margin: 0 0 0.5em 0;
  }
  
  :deep(h2) {
    font-size: 20px;
    font-weight: bold;
    margin: 0 0 0.5em 0;
  }
  
  :deep(h3) {
    font-size: 18px;
    font-weight: bold;
    margin: 0 0 0.5em 0;
  }
  
  :deep(ul), :deep(ol) {
    margin: 0 0 1em 2em;
    padding: 0;
  }
  
  :deep(li) {
    margin: 0.3em 0;
  }
  
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
  }
  
  :deep(th), :deep(td) {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  :deep(th) {
    background-color: #f5f7fa;
    font-weight: bold;
  }
  
  :deep(:focus) {
    outline: none;
  }
}

.excel-viewer {
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.editable-cell {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #ecf5ff;
  }

  &.editing {
    background-color: #fff;
    border: 1px solid #409eff;
    padding: 0;
    border-radius: 4px;
  }

  .cell-input {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    border: none;
    outline: none;
    box-sizing: border-box;
    padding: 0;
    margin: 0;

    :deep(.el-input__wrapper) {
      padding: 0 8px;
      border: none;
      box-shadow: none;
      min-height: 44px;
      display: flex;
      align-items: center;
    }

    :deep(.el-input__inner) {
      padding: 0;
      font-size: inherit;
    }
  }
}

:deep(.fullscreen-file-dialog) {
  .el-dialog {
    width: 100% !important;
    margin: 0;
    top: 0;
  }

  .el-dialog__header {
    padding: 16px 20px;
    background: #f5f7fa;
    border-bottom: 1px solid #ebeef5;
  }

  .el-dialog__body {
    padding: 0;
    max-height: calc(100vh - 60px);
    overflow: hidden;
  }
}
</style>