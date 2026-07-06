<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'

interface NodeConfig {
  nodeId: string
  nodeName: string
  assignees: string[]
  role?: string
  department?: string
  status: 'completed' | 'current' | 'pending' | 'rejected'
  completedTime?: string
  operator?: string
}

interface RoleOption {
  id: string
  name: string
}

interface DepartmentOption {
  id: string
  name: string
}

interface UserOption {
  id: string
  name: string
  department: string
}

const props = defineProps<{
  xml: string
  mode?: 'view' | 'edit'
  nodeConfigs?: NodeConfig[]
  roles?: RoleOption[]
  departments?: DepartmentOption[]
  users?: UserOption[]
  toolbar?: boolean
}>()

const emit = defineEmits<{
  (e: 'xml-change', xml: string): void
  (e: 'node-config-change', config: NodeConfig): void
}>()

const container = ref<HTMLDivElement | null>(null)
let bpmnModeler: BpmnModeler | null = null
let eventBus: any = null
let clickHandler: any = null

const loading = ref(false)
const currentZoom = ref(1)

const isEditMode = computed(() => props.mode !== 'view')

const showNodeDialog = ref(false)
const currentNode = ref<NodeConfig | null>(null)
const newAssignee = ref('')

async function initModeler() {
  if (!container.value) return

  bpmnModeler = new BpmnModeler({
    container: container.value
  })

  bpmnModeler.on('commandStack.changed', async () => {
    await exportDiagram()
  })

  eventBus = bpmnModeler.get('eventBus') as any
  
  clickHandler = (event: any) => {
    const element = event.element
    if (!element) return
    const taskTypes = ['bpmn:UserTask', 'bpmn:Task', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 'bpmn:ManualTask']
    if (taskTypes.includes(element.type)) {
      handleNodeClick(element)
    }
  }
  eventBus.on('element.click', clickHandler)

  await importDiagram(props.xml)
  
  setTimeout(() => {
    if (!isEditMode.value) {
      disableAllInteractions()
    } else {
      const palette = bpmnModeler?.get('palette') as any
      if (palette && palette._container) {
        const buttons = palette._container.querySelectorAll('.djs-palette-entry')
        buttons.forEach((btn: any) => {
          const title = btn.getAttribute('data-title')
          if (title) {
            btn.setAttribute('data-title', translatePaletteLabel(title))
          }
          const label = btn.querySelector('.djs-palette-title')
          if (label) {
            label.textContent = translatePaletteLabel(label.textContent)
          }
        })
      }
    }
  }, 300)
}

function disableAllInteractions() {
  const palette = bpmnModeler?.get('palette') as any
  const contextPad = bpmnModeler?.get('contextPad') as any
  const keyboard = bpmnModeler?.get('keyboard') as any
  const commandStack = bpmnModeler?.get('commandStack') as any
  
  if (palette && palette._container) {
    palette._container.style.display = 'none'
  }
  
  if (contextPad && contextPad._container) {
    contextPad._container.style.display = 'none'
  }
  
  if (keyboard) {
    try {
      keyboard.destroy()
    } catch (e) {
      console.warn('Failed to destroy keyboard:', e)
    }
  }
  
  if (commandStack) {
    commandStack._isExecuting = true
  }
  
  eventBus.off('element.dblclick')
  eventBus.off('element.mousedown')
  eventBus.off('element.mouseup')
  eventBus.off('element.hover')
  eventBus.off('element.contextmenu')
  
  const modelerContainer = (bpmnModeler as any)?._container || container.value
  if (modelerContainer) {
    modelerContainer.querySelectorAll('.djs-palette, .djs-context-pad, .djs-popup').forEach((el: any) => {
      el.style.display = 'none'
    })
  }
}

function translatePaletteLabel(label: string): string {
  const translations: Record<string, string> = {
    'Create Start Event': '创建开始事件',
    'Create Intermediate Throw Event': '创建中间抛出事件',
    'Create End Event': '创建结束事件',
    'Create Task': '创建任务',
    'Create Subprocess (collapsed)': '创建子流程（折叠）',
    'Create Subprocess (expanded)': '创建子流程（展开）',
    'Create Call Activity': '创建调用活动',
    'Create Gateway': '创建网关',
    'Create Parallel Gateway': '创建并行网关',
    'Create Inclusive Gateway': '创建包容网关',
    'Create Event-based Gateway': '创建事件网关',
    'Create Data Store Reference': '创建数据存储引用',
    'Create Data Object Reference': '创建数据对象引用',
    'Create Group': '创建分组',
    'Create Text Annotation': '创建文本注释',
    'Hand': '手工具',
    'Lasso': '套索工具',
    'Space': '空格工具',
    'Global Connect': '全局连接',
    'Create Sequence Flow': '创建连线',
    'Create Association': '创建关联',
    'Create Message Flow': '创建消息流'
  }
  return translations[label] || label
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    completed: '已完成',
    current: '当前步骤',
    pending: '待处理',
    rejected: '已驳回'
  }
  return statusMap[status] || '未知状态'
}

function getStatusType(status: string): string {
  const typeMap: Record<string, string> = {
    completed: 'success',
    current: 'primary',
    pending: 'info',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

function handleNodeClick(element: any) {
  const nodeId = element.id
  const nodeName = element.businessObject.name || '未命名节点'
  
  if (props.nodeConfigs) {
    const config = props.nodeConfigs.find(n => n.nodeId === nodeId)
    if (config) {
      currentNode.value = { ...config, nodeName }
    } else {
      currentNode.value = {
        nodeId,
        nodeName,
        assignees: [],
        status: 'pending'
      }
    }
  } else {
    currentNode.value = {
      nodeId,
      nodeName,
      assignees: [],
      status: 'pending'
    }
  }
  
  showNodeDialog.value = true
}

async function importDiagram(xml: string) {
  if (!bpmnModeler || !xml.trim()) return

  loading.value = true
  try {
    await bpmnModeler.importXML(xml)
    setTimeout(() => {
      try {
        const canvas = bpmnModeler?.get('canvas') as any
        if (canvas) {
          canvas.zoom('fit-viewport')
          const viewbox = canvas.viewbox()
          currentZoom.value = viewbox.scale || 1
        }
      } catch (zoomError) {
        console.warn('Failed to zoom fit-viewport:', zoomError)
      }
    }, 100)
    
    setTimeout(() => {
      highlightProcessNodes()
    }, 200)
  } catch (error) {
    console.error('Failed to import diagram:', error)
  } finally {
    loading.value = false
  }
}

function highlightProcessNodes() {
  if (!bpmnModeler) return

  const canvas = bpmnModeler.get('canvas') as any
  const elementRegistry = bpmnModeler.get('elementRegistry') as any
  
  const allElements = elementRegistry.getAll()
  
  if (isEditMode.value) {
    allElements.forEach((element: any) => {
      const gfx = canvas.getGraphics(element)
      if (!gfx) return
      gfx.style.stroke = ''
      gfx.style.strokeWidth = ''
      gfx.style.fill = ''
      gfx.style.filter = ''
      gfx.style.opacity = '1'
      const textElements = gfx.querySelectorAll('.djs-label text, .djs-shape text, .djs-element text, text')
      textElements.forEach((el: any) => {
        el.style.fill = ''
        el.style.opacity = '1'
      })
    })
    return
  }
  
  const nodeStatusMap = new Map<string, string>()
  props.nodeConfigs?.forEach(c => {
    nodeStatusMap.set(c.nodeId, c.status)
  })
  
  const completedNodeIds = props.nodeConfigs?.filter(c => c.status === 'completed').map(c => c.nodeId) || []
  const currentNodeIds = props.nodeConfigs?.filter(c => c.status === 'current').map(c => c.nodeId) || []
  const rejectedNodeIds = props.nodeConfigs?.filter(c => c.status === 'rejected').map(c => c.nodeId) || []
  
  const setNodeStyle = (gfx: any, stroke: string, strokeWidth: string, fill: string, textColor: string, opacity: string = '1', filter: string = '') => {
    const visualShapes = gfx.querySelectorAll('.djs-visual rect, .djs-visual circle, .djs-visual polygon, .djs-visual path')
    visualShapes.forEach((shape: any) => {
      shape.style.stroke = stroke
      shape.style.strokeWidth = strokeWidth
      shape.style.fill = fill
      shape.style.opacity = opacity
      if (filter) {
        shape.style.filter = filter
      }
    })
    
    const textElements = gfx.querySelectorAll('.djs-label text')
    textElements.forEach((el: any) => {
      el.style.fill = textColor
      el.style.fontWeight = 'normal'
      el.style.opacity = opacity
    })
  }

  const setConnectionStyle = (gfx: any, stroke: string, strokeWidth: string, opacity: string = '1') => {
    const pathElements = gfx.querySelectorAll('.djs-visual path, path')
    pathElements.forEach((path: any) => {
      path.style.stroke = stroke
      path.style.strokeWidth = strokeWidth
      path.style.opacity = opacity
    })
    
    const markerElements = gfx.querySelectorAll('.djs-visual marker')
    markerElements.forEach((marker: any) => {
      const markerPath = marker.querySelector('path')
      if (markerPath) {
        markerPath.style.fill = stroke
        markerPath.style.stroke = stroke
      }
    })
  }

  const getOutgoingFlows = (elementId: string): string[] => {
    return allElements
      .filter((el: any) => el.type === 'bpmn:SequenceFlow' && el.source?.id === elementId)
      .map((el: any) => el.id)
  }

  const getTargetNode = (flowId: string): any => {
    const flow = allElements.find((el: any) => el.id === flowId)
    return flow ? allElements.find((el: any) => el.id === flow.target?.id) : null
  }

  const startEvent = allElements.find((el: any) => el.type === 'bpmn:StartEvent')
  if (!startEvent) {
    return
  }

  const greenNodes = new Set<string>()
  const greenFlows = new Set<string>()
  const blueNodes = new Set<string>()
  const blueFlows = new Set<string>()
  const redNodes = new Set<string>()
  const redFlows = new Set<string>()

  const visitedNodes = new Set<string>()
  const visitedFlows = new Set<string>()
  
  const bfs = (startNode: any, color: 'green' | 'blue' | 'red', isRejectedPath: boolean = false) => {
    const queue: any[] = [startNode]
    const nodesSet = color === 'green' ? greenNodes : color === 'blue' ? blueNodes : redNodes
    const flowsSet = color === 'green' ? greenFlows : color === 'blue' ? blueFlows : redFlows
    
    while (queue.length > 0) {
      const currentNode = queue.shift()
      if (!currentNode || visitedNodes.has(currentNode.id)) continue
      
      visitedNodes.add(currentNode.id)
      nodesSet.add(currentNode.id)
      
      if (currentNode.type === 'bpmn:EndEvent') continue
      
      const outgoingFlows = getOutgoingFlows(currentNode.id)
      for (const flowId of outgoingFlows) {
        if (visitedFlows.has(flowId)) continue
        
        const targetNode = getTargetNode(flowId)
        if (!targetNode) continue
        
        const targetIsCompleted = completedNodeIds.includes(targetNode.id)
        const targetIsCurrent = currentNodeIds.includes(targetNode.id)
        
        if (color === 'green') {
          if (isRejectedPath) {
            flowsSet.add(flowId)
            visitedFlows.add(flowId)
            if (!redNodes.has(targetNode.id)) {
              redNodes.add(targetNode.id)
              redFlows.add(flowId)
            }
            if (!visitedNodes.has(targetNode.id)) {
              queue.push(targetNode)
            }
          } else if (targetIsCompleted) {
            flowsSet.add(flowId)
            visitedFlows.add(flowId)
            queue.push(targetNode)
          } else if (targetIsCurrent) {
            blueFlows.add(flowId)
            visitedFlows.add(flowId)
            blueNodes.add(targetNode.id)
          }
        } else if (color === 'blue') {
          flowsSet.add(flowId)
          visitedFlows.add(flowId)
          nodesSet.add(targetNode.id)
          queue.push(targetNode)
        } else if (color === 'red') {
          flowsSet.add(flowId)
          visitedFlows.add(flowId)
          nodesSet.add(targetNode.id)
          queue.push(targetNode)
        }
      }
    }
  }

  bfs(startEvent, 'green', rejectedNodeIds.length > 0)

  for (const rejectedNodeId of rejectedNodeIds) {
    const rejectedNode = allElements.find((el: any) => el.id === rejectedNodeId)
    if (rejectedNode) {
      bfs(rejectedNode, 'red', true)
    }
  }

  for (const currentNodeId of currentNodeIds) {
    const currentNode = allElements.find((el: any) => el.id === currentNodeId)
    if (currentNode && !redNodes.has(currentNodeId)) {
      bfs(currentNode, 'blue')
    }
  }
  
  allElements.forEach((element: any) => {
    const gfx = canvas.getGraphics(element)
    if (!gfx) return

    const isGreen = greenNodes.has(element.id)
    const isBlue = blueNodes.has(element.id)
    const isRed = redNodes.has(element.id)
    const isGreenFlow = greenFlows.has(element.id)
    const isBlueFlow = blueFlows.has(element.id)
    const isRedFlow = redFlows.has(element.id)
    const isCompleted = completedNodeIds.includes(element.id)
    const isCurrent = currentNodeIds.includes(element.id)
    const isRejected = rejectedNodeIds.includes(element.id)
    const hasConfig = props.nodeConfigs?.some(c => c.nodeId === element.id)
    
    const disabledTextColor = '#909399'
    
    if (element.type === 'bpmn:UserTask') {
      if (isRed || isRejected) {
        setNodeStyle(gfx, '#f56c6c', '3', '#fef0f0', '#f56c6c')
      } else if (isGreen || isCompleted) {
        setNodeStyle(gfx, '#67c23a', '3', '#f0f9eb', '#67c23a')
      } else if (isBlue || isCurrent) {
        setNodeStyle(gfx, '#409eff', '3', '#ecf5ff', '#409eff', '1', 'drop-shadow(0 0 8px rgba(64, 158, 255, 0.6))')
      } else if (hasConfig) {
        setNodeStyle(gfx, '#d9d9d9', '1', '#f5f5f5', '#d9d9d9')
      } else {
        setNodeStyle(gfx, '#d9d9d9', '1', '#fafafa', disabledTextColor, '0.4')
      }
    } else if (element.type === 'bpmn:SequenceFlow') {
      if (isRedFlow) {
        setConnectionStyle(gfx, '#f56c6c', '2')
      } else if (isGreenFlow) {
        setConnectionStyle(gfx, '#67c23a', '2')
      } else if (isBlueFlow) {
        setConnectionStyle(gfx, '#409eff', '2')
      } else {
        setConnectionStyle(gfx, '#d9d9d9', '1', '0.4')
      }
    } else if (element.type === 'bpmn:StartEvent') {
      if (isRed) {
        setNodeStyle(gfx, '#f56c6c', '3', '#fef0f0', '#f56c6c')
      } else if (isGreen) {
        setNodeStyle(gfx, '#67c23a', '3', '#f0f9eb', '#67c23a')
      } else {
        setNodeStyle(gfx, '#d9d9d9', '1', '#ffffff', '#d9d9d9')
      }
    } else if (element.type === 'bpmn:ExclusiveGateway' || element.type === 'bpmn:ParallelGateway' || element.type === 'bpmn:InclusiveGateway') {
      if (isRed) {
        setNodeStyle(gfx, '#f56c6c', '3', '#fef0f0', '#f56c6c')
      } else if (isGreen) {
        setNodeStyle(gfx, '#67c23a', '3', '#f0f9eb', '#67c23a')
      } else if (isBlue) {
        setNodeStyle(gfx, '#409eff', '2', '#f5faff', '#409eff')
      } else {
        setNodeStyle(gfx, '#d9d9d9', '1', '#f5f5f5', '#d9d9d9')
      }
    } else if (element.type === 'bpmn:EndEvent') {
      if (isRed) {
        setNodeStyle(gfx, '#f56c6c', '3', '#fef0f0', '#f56c6c')
      } else if (isGreen) {
        setNodeStyle(gfx, '#67c23a', '3', '#f0f9eb', '#67c23a')
      } else {
        setNodeStyle(gfx, '#d9d9d9', '1', '#ffffff', '#d9d9d9')
      }
    }
  })
}

async function exportDiagram() {
  if (!bpmnModeler) return

  try {
    const result = await bpmnModeler.saveXML({ format: true })
    emit('xml-change', result.xml || '')
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

function zoomIn() {
  if (bpmnModeler) {
    const canvas = bpmnModeler.get('canvas') as any
    const viewbox = canvas.viewbox()
    const scale = viewbox.scale || 1
    const newZoom = Math.min(scale + 0.1, 3)
    canvas.zoom(newZoom)
    currentZoom.value = newZoom
  }
}

function zoomOut() {
  if (bpmnModeler) {
    const canvas = bpmnModeler.get('canvas') as any
    const viewbox = canvas.viewbox()
    const scale = viewbox.scale || 1
    const newZoom = Math.max(scale - 0.1, 0.5)
    canvas.zoom(newZoom)
    currentZoom.value = newZoom
  }
}

function fitViewport() {
  if (bpmnModeler) {
    const canvas = bpmnModeler.get('canvas') as any
    try {
      canvas.zoom('fit-viewport')
      const viewbox = canvas.viewbox()
      currentZoom.value = viewbox.scale || 1
    } catch (zoomError) {
      console.warn('Failed to zoom fit-viewport:', zoomError)
    }
  }
}

function closeNodeDialog() {
  showNodeDialog.value = false
  currentNode.value = null
  newAssignee.value = ''
}

function saveNodeConfig() {
  if (currentNode.value) {
    const modeling = bpmnModeler?.get('modeling') as any
    const elementRegistry = bpmnModeler?.get('elementRegistry') as any
    const element = elementRegistry.get(currentNode.value.nodeId)
    
    if (modeling && element) {
      modeling.updateProperties(element, {
        name: currentNode.value.nodeName
      })
      
      const canvas = bpmnModeler?.get('canvas') as any
      if (canvas) {
        const gfx = canvas.getGraphics(element)
        if (gfx) {
          const labelElements = gfx.querySelectorAll('.djs-label, .djs-element text')
          labelElements.forEach((labelEl: any) => {
            labelEl.textContent = currentNode.value!.nodeName
          })
        }
      }
      
      setTimeout(() => {
        exportDiagram()
        highlightProcessNodes()
      }, 150)
    }
    
    emit('node-config-change', { ...currentNode.value })
    showNodeDialog.value = false
  }
}

watch(() => props.xml, (newXml) => {
  if (newXml && bpmnModeler) {
    importDiagram(newXml)
  }
})

watch(() => props.mode, () => {
  if (bpmnModeler) {
    bpmnModeler.destroy()
    bpmnModeler = null
    initModeler()
  }
})

watch(() => props.nodeConfigs, () => {
  highlightProcessNodes()
}, { deep: true })

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
  <div class="bpmn-workflow">
    <div class="workflow-toolbar">
      <div class="zoom-controls" v-if="isEditMode">
        <el-button size="small" @click="zoomOut">
          <i class="el-icon-zoom-out"></i>
          缩小
        </el-button>
        <span class="zoom-value">{{ Math.round(currentZoom * 100) }}%</span>
        <el-button size="small" @click="zoomIn">
          <i class="el-icon-zoom-in"></i>
          放大
        </el-button>
        <el-button size="small" @click="fitViewport">
          <i class="el-icon-full-screen"></i>
          适应窗口
        </el-button>
      </div>
      <div class="mode-indicator" v-if="isEditMode">
        <el-tag type="warning">编辑模式</el-tag>
      </div>
      <div class="legend" v-if="!isEditMode && nodeConfigs">
        <span class="legend-item">
          <span class="legend-dot completed"></span>
          已完成
        </span>
        <span class="legend-item">
          <span class="legend-dot current"></span>
          当前步骤
        </span>
        <span class="legend-item">
          <span class="legend-dot pending"></span>
          待处理
        </span>
        <span class="legend-item">
          <span class="legend-dot rejected"></span>
          已驳回
        </span>
      </div>
      <div class="action-buttons" v-if="isEditMode">
        <el-button type="primary" @click="saveDiagram">
          <i class="el-icon-download"></i>
          保存BPMN
        </el-button>
        <el-button type="success" @click="exportImage">
          <i class="el-icon-picture-outline"></i>
          导出图片
        </el-button>
      </div>
    </div>
    <div class="workflow-container">
      <el-loading v-if="loading" text="加载中..." />
      <div ref="container" class="canvas"></div>
    </div>

    <el-dialog
      v-model="showNodeDialog"
      title="节点配置"
      width="500px"
      @close="closeNodeDialog"
    >
      <div v-if="currentNode" class="node-dialog-content">
        <el-form label-width="100px">
          <el-form-item label="节点名称">
            <el-input v-model="currentNode.nodeName" :disabled="!isEditMode" />
          </el-form-item>
          <el-form-item v-if="!isEditMode && currentNode.status" label="审批状态">
            <el-tag :type="getStatusType(currentNode.status)" size="medium">
              {{ getStatusText(currentNode.status) }}
            </el-tag>
          </el-form-item>
          <el-form-item label="审批角色">
            <el-select v-model="currentNode.role" placeholder="选择审批角色" clearable :disabled="!isEditMode">
              <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
            </el-select>
            <span class="form-tip">选择角色后，该角色下所有人员均可审批</span>
          </el-form-item>
          <el-form-item label="审批部门">
            <el-select v-model="currentNode.department" placeholder="选择审批部门" clearable :disabled="!isEditMode">
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.name" />
            </el-select>
            <span class="form-tip">选择部门后，该部门下所有人员均可审批</span>
          </el-form-item>
          <el-form-item label="指定人员">
            <el-select v-model="currentNode.assignees" placeholder="选择指定审批人员" multiple :disabled="!isEditMode">
              <el-option v-for="user in users" :key="user.id" :label="user.name + ' (' + user.department + ')'" :value="user.name" />
            </el-select>
            <span class="form-tip">指定具体人员后，仅这些人员可审批</span>
          </el-form-item>
          <el-form-item label="配置说明">
            <div class="config-desc">
              <p>• 选择角色：该角色下所有人员都有审批权限</p>
              <p>• 选择部门：该部门下所有人员都有审批权限</p>
              <p>• 指定人员：仅选中的人员有审批权限（优先级最高）</p>
              <p>• 未选择任何配置：默认该节点不限制审批人员</p>
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="closeNodeDialog">{{ isEditMode ? '取消' : '关闭' }}</el-button>
        <el-button v-if="isEditMode" type="primary" @click="saveNodeConfig">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.bpmn-workflow {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.workflow-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-value {
  min-width: 50px;
  text-align: center;
  font-size: 13px;
  color: #606266;
}

.mode-indicator {
  flex: 1;
  text-align: center;
}

.legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  
  &.completed {
    background-color: #67c23a;
  }
  
  &.current {
    background-color: #409eff;
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.6);
  }
  
  &.pending {
    background-color: #d9d9d9;
  }
  
  &.rejected {
    background-color: #f56c6c;
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.workflow-container {
  flex: 1;
  position: relative;
  background: #fafafa;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
}

.node-dialog-content {
  padding: 10px 0;
}

.assignee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assignee-tag {
  margin-bottom: 4px;
}

.assignee-editor {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.assignee-input {
  flex: 1;
}

.status-select {
  width: 100%;
}

.empty-text {
  color: #909399;
  font-size: 13px;
}

.form-tip {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.config-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.config-desc p {
  margin: 4px 0;
}
</style>