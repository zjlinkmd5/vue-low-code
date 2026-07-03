<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useCanvas } from '@/composables/useCanvas'
import RenderedComponent from './RenderedComponent.vue'

import Sortable from 'sortablejs'

const { components, selectedId, addComponent, removeComponent, moveComponent, selectComponent, setDragState, findComponent } = useCanvas()

const emit = defineEmits<{
  buttonClick: [submitType: string]
}>()

const isDragOver = ref(false)
const dropTargetId = ref<string | null>(null)
const dropTargetColumn = ref<number | null>(null)

const containerRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null
let dragOverTimeout: ReturnType<typeof setTimeout> | null = null

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  if (dragOverTimeout) {
    clearTimeout(dragOverTimeout)
    dragOverTimeout = null
  }
  isDragOver.value = true
}

function onDragLeave(event: DragEvent) {
  if (dragOverTimeout) {
    clearTimeout(dragOverTimeout)
  }
  const target = event.currentTarget as HTMLElement | null
  const clientX = event.clientX
  const clientY = event.clientY
  dragOverTimeout = setTimeout(() => {
    if (!target) {
      isDragOver.value = false
      dropTargetId.value = null
      dropTargetColumn.value = null
      dragOverTimeout = null
      return
    }
    const rect = target.getBoundingClientRect()
    const x = clientX
    const y = clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragOver.value = false
      dropTargetId.value = null
      dropTargetColumn.value = null
    }
    dragOverTimeout = null
  }, 50)
}

function onDrop(event: DragEvent, parentId?: string) {
  event.preventDefault()
  isDragOver.value = false
  dropTargetId.value = null
  dropTargetColumn.value = null
  
  const componentType = event.dataTransfer?.getData('componentType')
  if (componentType) {
    addComponent(componentType, parentId)
  }
  setDragState({ isDragging: false, componentType: '' })
}

function onCanvasClick() {
  selectComponent(null)
}

function handleSortEnd(oldIndex: number | undefined, newIndex: number | undefined) {
  if (oldIndex != null && newIndex != null && oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
    moveComponent(oldIndex, newIndex)
  }
}

function handleGridDragOver(event: DragEvent, gridId: string) {
  event.preventDefault()
  dropTargetId.value = gridId
}

function handleGridDragLeave() {
  dropTargetId.value = null
}

function handleColumnDragOver(event: DragEvent, gridId: string, columnIndex: number) {
  event.preventDefault()
  event.stopPropagation()
  dropTargetId.value = gridId
  dropTargetColumn.value = columnIndex
}

function handleColumnDragLeave() {
  dropTargetColumn.value = null
}

function handleColumnDrop(event: DragEvent, gridId: string, columnIndex: number) {
  event.preventDefault()
  event.stopPropagation()
  
  const componentType = event.dataTransfer?.getData('componentType')
  if (componentType) {
    const grid = findComponent(components.value, gridId)
    if (grid) {
      if (!grid.children) grid.children = []
      
      while (grid.children.length <= columnIndex) {
        grid.children.push(null as unknown as typeof grid.children[0])
      }
      
      const config = {
        id: `component-${Date.now()}`,
        type: componentType,
        props: { placeholder: '请输入', size: 'medium' },
        visibility: { enabled: false, conditions: [] },
        disabled: { enabled: false, conditions: [] },
        customAttrs: {}
      }
      
      grid.children[columnIndex] = config as typeof grid.children[0]
      selectComponent(config.id)
    }
  }
  
  dropTargetId.value = null
  dropTargetColumn.value = null
  setDragState({ isDragging: false, componentType: '' })
}

function initSortable() {
  if (containerRef.value && !sortableInstance) {
    sortableInstance = new Sortable(containerRef.value, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      delay: 100,
      delayOnTouchOnly: true,
      swapThreshold: 0.6,
      forceFallback: true,
      fallbackTolerance: 10,
      onStart(evt) {
        selectComponent(evt.item.dataset.id!)
        const item = evt.item as HTMLElement
        item.style.transform = 'rotate(3deg)'
      },
      onEnd(evt) {
        const item = evt.item as HTMLElement
        item.style.transform = ''
        handleSortEnd(evt.oldIndex, evt.newIndex)
      }
    })
  }
}

onMounted(() => {
  nextTick(() => {
    initSortable()
  })
})

onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
})
</script>

<template>
  <div
    class="canvas"
    :class="{ 'drag-over': isDragOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave($event)"
    @drop="onDrop"
    @click="onCanvasClick"
  >
    <div class="canvas-container">
      <div v-if="components.length === 0" class="empty-hint">
        <i class="el-icon-upload"></i>
        <p>从左侧拖拽组件到此处</p>
      </div>
      
      <div ref="containerRef" class="components-container">
        <RenderedComponent
          v-for="component in components"
          :key="component.id"
          :data-id="component.id"
          :component="component"
          :is-selected="component.id === selectedId"
          :is-drop-target="component.id === dropTargetId && component.type === 'Grid'"
          :drop-target-column="dropTargetColumn"
          @select="selectComponent"
          @delete="removeComponent"
          @drag-over-grid="(e: DragEvent) => handleGridDragOver(e, component.id)"
          @drag-leave-grid="handleGridDragLeave"
          @drop-grid="(e: DragEvent) => onDrop(e, component.id)"
          @drag-over-column="(e: DragEvent, columnIndex: number) => handleColumnDragOver(e, component.id, columnIndex)"
          @drag-leave-column="handleColumnDragLeave"
          @drop-column="(e: DragEvent, columnIndex: number) => handleColumnDrop(e, component.id, columnIndex)"
          @button-click="(submitType: string) => emit('buttonClick', submitType)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.canvas {
  flex: 1;
  height: 100%;
  background: #f5f7fa;
  overflow-y: auto;
  padding: 24px;
}

.canvas-container {
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100% - 48px);
  padding: 24px;
  background: #ffffff;
  border-radius: 8px;
  border: 2px solid transparent;
}

.canvas.drag-over .canvas-container {
  border-color: #409eff;
  background: #f0f5ff;
  border-style: dashed;
}

.components-container {
  min-height: 20px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #909399;
  
  i {
    font-size: 48px;
    margin-bottom: 16px;
    color: #c0c4cc;
  }
  
  p {
    font-size: 14px;
  }
}

:deep(.sortable-ghost) {
  opacity: 0.3;
  background: #e8f0fe;
  border: 2px dashed #409eff;
  border-radius: 8px;
  pointer-events: none;
}

:deep(.sortable-drag) {
  opacity: 0.95;
  background: #f0f5ff;
  border: 2px solid #409eff;
  border-radius: 8px;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}
</style>
