<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'

const container = ref<HTMLDivElement | null>(null)

let bpmnViewer: BpmnViewer | null = null

const props = defineProps<{
  xml: string
}>()

const loading = ref(false)

async function initViewer() {
  if (!container.value) return

  bpmnViewer = new BpmnViewer({
    container: container.value
  })

  bpmnViewer.on('element.click', (event: any) => {
    const element = event.element
    console.log('点击元素:', element)
  })

  await importDiagram(props.xml)
}

async function importDiagram(xml: string) {
  if (!bpmnViewer || !xml.trim()) return

  loading.value = true
  try {
    await bpmnViewer.importXML(xml)
    setTimeout(() => {
      const canvas = bpmnViewer?.get('canvas') as any
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

function zoomIn() {
  if (bpmnViewer) {
    const canvas = bpmnViewer.get('canvas') as any
    const viewbox = canvas.viewbox()
    const currentZoom = viewbox.scale || 1
    canvas.zoom(Math.min(currentZoom + 0.1, 3))
  }
}

function zoomOut() {
  if (bpmnViewer) {
    const canvas = bpmnViewer.get('canvas') as any
    const viewbox = canvas.viewbox()
    const currentZoom = viewbox.scale || 1
    canvas.zoom(Math.max(currentZoom - 0.1, 0.5))
  }
}

function fitViewport() {
  if (bpmnViewer) {
    const canvas = bpmnViewer.get('canvas') as any
    canvas.zoom('fit-viewport')
  }
}

watch(() => props.xml, (newXml) => {
  if (newXml && bpmnViewer) {
    importDiagram(newXml)
  }
})

onMounted(() => {
  initViewer()
})

onUnmounted(() => {
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }
})
</script>

<template>
  <div class="bpmn-viewer">
    <div class="viewer-toolbar">
      <el-button size="small" @click="zoomOut">
        <i class="el-icon-zoom-out"></i>
        缩小
      </el-button>
      <el-button size="small" @click="zoomIn">
        <i class="el-icon-zoom-in"></i>
        放大
      </el-button>
      <el-button size="small" @click="fitViewport">
        <i class="el-icon-full-screen"></i>
        适应窗口
      </el-button>
    </div>
    <div class="viewer-container">
      <el-loading v-if="loading" text="加载中..." />
      <div ref="container" class="canvas"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bpmn-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.viewer-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.viewer-container {
  flex: 1;
  position: relative;
  background: #fafafa;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
}
</style>