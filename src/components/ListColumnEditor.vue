<script setup lang="ts">
import { ref, watch } from 'vue'

interface ListColumn {
  key: string
  label: string
  width?: string
  sortable?: boolean
  sortType?: string
}

const props = defineProps<{
  visible: boolean
  columns: ListColumn[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [columns: ListColumn[]]
}>()

const editingColumns = ref<ListColumn[]>([])

watch(() => props.columns, (newColumns) => {
  editingColumns.value = JSON.parse(JSON.stringify(newColumns))
}, { immediate: true, deep: true })

function addColumn() {
  editingColumns.value.push({
    key: 'newColumn',
    label: '新列',
    width: '150px',
    sortable: false,
    sortType: 'string'
  })
}

function removeColumn(index: number) {
  editingColumns.value.splice(index, 1)
}

function handleSave() {
  emit('save', [...editingColumns.value])
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
}

function handleVisibleChange(val: boolean) {
  emit('update:visible', val)
}
</script>

<template>
  <el-dialog
    :visible="visible"
    title="列配置"
    width="600px"
    append-to-body
    @update:visible="handleVisibleChange"
  >
    <div class="columns-editor">
      <div v-for="(col, index) in editingColumns" :key="index" class="column-item">
        <div class="column-header">
          <span>列 {{ index + 1 }}</span>
          <el-button size="small" type="danger" @click="removeColumn(index)">删除</el-button>
        </div>
        <el-input
          v-model="col.key"
          placeholder="字段名"
          style="margin-bottom: 8px;"
        />
        <el-input
          v-model="col.label"
          placeholder="列标题"
          style="margin-bottom: 8px;"
        />
        <el-input
          v-model="col.width"
          placeholder="宽度（如：150px）"
          style="margin-bottom: 8px;"
        />
        <div class="column-options">
          <el-switch
            v-model="col.sortable"
            active-text="可排序"
            inactive-text="不可排序"
            style="margin-bottom: 8px;"
          />
          <el-select
            v-model="col.sortType"
            placeholder="排序类型"
            style="width: 100%;"
          >
            <el-option label="字符串" value="string" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
          </el-select>
        </div>
      </div>
      <el-button size="small" type="primary" @click="addColumn" style="width: 100%; margin-top: 8px;">
        + 添加列
      </el-button>
    </div>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.columns-editor {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.column-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #dee2e6;

  span {
    font-size: 14px;
    font-weight: 600;
    color: #495057;
  }
}

.column-options {
  margin-top: 8px;
}
</style>
