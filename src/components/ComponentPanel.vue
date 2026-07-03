<script setup lang="ts">
import { componentList } from '@/data/components'
import { useCanvas } from '@/composables/useCanvas'

const { setDragState } = useCanvas()

function onDragStart(type: string, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('componentType', type)
  }
  setDragState({ isDragging: true, componentType: type })
}

function onDragEnd() {
  setDragState({ isDragging: false, componentType: '' })
}
</script>

<template>
  <div class="component-panel">
    <div class="panel-header">
      <h2>组件库</h2>
    </div>
    <div class="panel-content">
      <div
        v-for="component in componentList"
        :key="component.id"
        class="component-item"
        draggable="true"
        @dragstart="onDragStart(component.type, $event)"
        @dragend="onDragEnd"
      >
        <i :class="component.icon"></i>
        <span>{{ component.label }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.component-panel {
  width: 240px;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.component-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: grab;
  transition: border-color 0.2s, background-color 0.2s;
  
  &:hover {
    background: #eef2f7;
    border-color: #409eff;
  }
  
  &:active {
    cursor: grabbing;
  }
  
  &[draggable="true"] {
    user-select: none;
  }
  
  i {
    margin-right: 10px;
    font-size: 18px;
    color: #409eff;
  }
  
  span {
    font-size: 14px;
    color: #666;
  }
}
</style>
