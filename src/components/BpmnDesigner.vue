<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'

const canvasContainer = ref<HTMLDivElement | null>(null)

let bpmnModeler: BpmnModeler | null = null

const xmlContent = ref<string>('')
const loading = ref(false)
const saveSuccess = ref(false)

const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL http://www.omg.org/spec/BPMN/2.0/20100501/BPMN20.xsd http://www.omg.org/spec/BPMN/20100524/DI http://www.omg.org/spec/BPMN/2.0/20100501/BPMNDI.xsd"
             id="Definitions_1"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1" name="开始"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

async function initModeler() {
  if (!canvasContainer.value) return

  bpmnModeler = new BpmnModeler({
    container: canvasContainer.value
  })

  bpmnModeler.on('commandStack.changed', () => {
    saveSuccess.value = false
  })

  await importDiagram(defaultXml)
}

async function importDiagram(xml: string) {
  if (!bpmnModeler) return

  loading.value = true
  try {
    await bpmnModeler.importXML(xml)
    setTimeout(() => {
      const canvas = bpmnModeler?.get('canvas') as any
      if (canvas) {
        try {
          canvas.zoom('fit-viewport')
        } catch (zoomError) {
          console.warn('Failed to zoom fit-viewport:', zoomError)
          canvas.zoom(1)
        }
      }
    }, 100)
  } catch (error) {
    console.error('Failed to import diagram:', error)
  } finally {
    loading.value = false
  }
}

async function exportDiagram() {
  if (!bpmnModeler) return

  try {
    const result = await bpmnModeler.saveXML({ format: true })
    xmlContent.value = result.xml || ''
  } catch (error) {
    console.error('Failed to export diagram:', error)
  }
}

async function saveDiagram() {
  if (!bpmnModeler) return

  try {
    const result = await bpmnModeler.saveXML({ format: true })
    const blob = new Blob([result.xml || ''], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'workflow.bpmn'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to save diagram:', error)
  }
}

async function exportImage() {
  if (!bpmnModeler) return

  try {
    const result = await bpmnModeler.saveSVG()
    const blob = new Blob([result.svg || ''], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'workflow.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Failed to export image:', error)
  }
}

function clearCanvas() {
  importDiagram(defaultXml)
  xmlContent.value = ''
}

function handleXmlInput() {
  if (xmlContent.value.trim()) {
    importDiagram(xmlContent.value)
  }
}

watch(xmlContent, (newVal) => {
  if (newVal.trim()) {
    saveSuccess.value = false
  }
})

onMounted(() => {
  initModeler()
})

onUnmounted(() => {
  if (bpmnModeler) {
    bpmnModeler.destroy()
    bpmnModeler = null
  }
})
</script>

<template>
  <div class="bpmn-designer">
    <div class="designer-toolbar">
      <el-button type="primary" @click="saveDiagram">
        <i class="el-icon-download"></i>
        保存BPMN
      </el-button>
      <el-button type="success" @click="exportImage">
        <i class="el-icon-picture-outline"></i>
        导出图片
      </el-button>
      <el-button type="warning" @click="exportDiagram">
        <i class="el-icon-document"></i>
        导出XML
      </el-button>
      <el-button type="danger" @click="clearCanvas">
        <i class="el-icon-delete"></i>
        清空画布
      </el-button>
      <el-message v-if="saveSuccess" type="success" message="保存成功" :duration="2000" />
    </div>

    <div class="designer-content">
      <div class="canvas-area">
        <el-loading v-if="loading" text="加载中..." />
        <div ref="canvasContainer" class="canvas-container"></div>
      </div>
    </div>

    <div class="xml-panel">
      <el-collapse>
        <el-collapse-item title="BPMN XML" name="xml">
          <el-input
            v-model="xmlContent"
            type="textarea"
            :rows="10"
            placeholder="在此输入或粘贴BPMN XML内容..."
            @change="handleXmlInput"
          />
          <el-button type="primary" @click="handleXmlInput" style="margin-top: 10px;">
            导入XML
          </el-button>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bpmn-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.designer-toolbar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.designer-content {
  flex: 1;
  overflow: hidden;
}

.canvas-area {
  width: 100%;
  height: 100%;
  position: relative;
  background: #fafafa;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.xml-panel {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
}

:deep(.el-collapse-item__header) {
  padding: 12px 16px;
}

:deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}
</style>