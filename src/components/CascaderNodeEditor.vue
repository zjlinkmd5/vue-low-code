<script setup lang="ts">
import { defineOptions } from 'vue'
import type { CascaderOption } from '@/data/regionData'

defineOptions({ name: 'CascaderNodeEditor' })

const props = defineProps<{
  nodes: CascaderOption[]
  level?: number
}>()

function addChild(node: CascaderOption) {
  if (!node.children) node.children = []
  node.children.push({ value: '', label: '新节点' })
}

function removeNode(index: number) {
  props.nodes.splice(index, 1)
}
</script>

<template>
  <div class="cascader-node-editor" :style="{ marginLeft: level && level > 0 ? '24px' : '0' }">
    <div v-for="(node, index) in nodes" :key="index" class="node-item">
      <div class="node-row">
        <el-input v-model="node.label" placeholder="标签" size="small" class="node-input" />
        <el-input v-model="node.value" placeholder="值" size="small" class="node-input" />
        <el-button size="small" @click="addChild(node)">+子级</el-button>
        <el-button size="small" type="danger" @click="removeNode(index)">删除</el-button>
      </div>
      <CascaderNodeEditor
        v-if="node.children && node.children.length > 0"
        :nodes="node.children"
        :level="(level || 0) + 1"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.cascader-node-editor {
  .node-item {
    margin-bottom: 8px;
  }

  .node-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 4px;

    .node-input {
      flex: 1;
      min-width: 0;
    }
  }
}
</style>
