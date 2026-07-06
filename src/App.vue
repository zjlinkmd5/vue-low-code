<script setup lang="ts">
import { ref } from 'vue'
import PageBuilder from './components/PageBuilder.vue'
import BpmnDemo from './components/BpmnDemo.vue'

const activeModule = ref<'pagebuilder' | 'bpmn'>('pagebuilder')
</script>

<template>
  <div class="app-container">
    <div class="app-header">
      <div class="header-left">
        <h1>可视化页面构建器</h1>
      </div>
      <div class="header-right">
        <el-radio-group v-model="activeModule" size="large">
          <el-radio-button label="pagebuilder">页面构建器</el-radio-button>
          <el-radio-button label="bpmn">BPM工作流</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    <div class="app-content">
      <PageBuilder v-if="activeModule === 'pagebuilder'" />
      <BpmnDemo v-else />
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.header-left h1 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.app-content {
  flex: 1;
  overflow: hidden;
}
</style>
