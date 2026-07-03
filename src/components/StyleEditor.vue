<script setup lang="ts">
import { ref, watch } from 'vue'
import CodeEditor from './CodeEditor.vue'

const props = defineProps<{
  visible: boolean
  currentStyle: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', style: string): void
}>()

const dialogVisible = ref(props.visible)
const styleCode = ref(props.currentStyle)

watch(() => props.visible, (val) => {
  dialogVisible.value = val
})

watch(() => props.currentStyle, (val) => {
  styleCode.value = val
})

function handleSave() {
  emit('save', styleCode.value)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="自定义样式"
    width="600px"
    height="500px"
    @close="handleClose"
    @confirm="handleSave"
  >
    <div class="style-editor-container">
      <CodeEditor v-model="styleCode" language="css" />
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存样式</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.style-editor-container {
  width: 100%;
  height: 350px;
}
</style>
