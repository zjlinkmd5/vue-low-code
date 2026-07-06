# Page Builder

一个基于 Vue 3 + TypeScript + Element Plus 的可视化页面构建器，包含 BPM 工作流模块和页面构建器模块。

## 功能特性

---

### 一、页面构建器模块 (Page Builder)

#### 1. 可视化拖拽页面组件

- 支持多种组件类型：文本、标题、输入框、按钮、表格、日期选择器、日期范围选择器、卡片、分割线等
- 组件面板展示所有可用组件，支持拖拽添加到画布
- 画布支持组件的自由拖动和排序
- 实时预览页面效果

#### 2. 组件属性配置面板

- 节点名称编辑
- 审批角色配置（选择角色后，该角色下所有人员均可审批）
- 审批部门配置（选择部门后，该部门下所有人员均可审批）
- 指定人员配置（仅选中的人员有审批权限，优先级最高）
- 配置说明提示

#### 3. 代码编辑器 (CodeEditor)

- 使用 Monaco Editor 实现代码编辑
- 支持多种编程语言语法高亮
- 代码格式化功能
- 实时预览代码效果

#### 4. 文件预览组件 (FilePreview)

支持本地文件的上传、预览和编辑，支持以下文件类型：

##### PDF 文件
- 使用 pdfjs-dist 进行 PDF 渲染
- 支持缩放（50% - 300%）
- 支持翻页浏览
- 支持批注功能（添加、编辑、删除批注）
- 支持保存带有批注的 PDF 文件

##### Word 文件 (.docx)
- 使用 mammoth.js 将 DOCX 转换为 HTML
- 支持直接在浏览器中编辑文本内容
- 支持保存为 HTML 格式

##### Excel 文件 (.xlsx)
- 使用 xlsx 库解析 Excel 文件
- 支持点击单元格进行编辑
- 单元格编辑时自动撑开列宽以显示完整内容
- 支持保存为 xlsx 格式

#### 5. 列表列编辑器 (ListColumnEditor)

- 表格列配置管理
- 支持列排序
- 支持列宽设置

#### 6. 样式编辑器 (StyleEditor)

- 可视化样式编辑
- 支持多种样式属性

#### 7. 导出功能

- 导出为 HTML 文件
- 导出为 Vue 2/Vue 3+TS 项目包
- 支持日期格式 YYYY-MM-DD HH:mm:ss

---

### 二、BPM 工作流模块 (BPMN Workflow)

#### 1. 流程设计器 (Process Designer)

- 基于 bpmn-js 的可视化流程设计器
- 支持创建、编辑 BPMN 流程图
- 支持拖拽添加各种节点：开始事件、结束事件、用户任务、网关等
- 节点配置弹窗：点击方形任务节点（UserTask）显示配置弹窗
- 节点名称编辑：通过配置弹窗编辑节点名称，实时更新到流程图
- 工具栏显示：支持节点工具栏操作
- 画布操作：缩放、平移、适配视图
- 保存功能：保存流程为草稿状态
- 导出功能：导出为 BPMN XML、SVG 图片

#### 2. 工作流管理 (Workflow Management)

- 全局流程配置列表：展示所有全局可使用的流程
- 流程状态管理：草稿、发布、禁用
- 流程编辑和删除功能

#### 3. 任务操作 (Task Operations)

- 用户选择：按登录人筛选查看当前用户的操作列表
- 任务列表：展示当前用户需要处理的审批任务
- 任务状态：待审批、已完成、已驳回
- 任务操作：通过、驳回
- 新增任务：支持弹窗选择流程类型，数据源为工作流管理模块数据
- 查看流程详情：弹窗显示流程图和审批信息

#### 4. 流程详情弹窗 (Workflow Detail)

- BPMN 流程图展示
- 节点状态样式：
  - **已完成**：绿色边框(#67c23a)，浅绿色背景，绿色文字不加粗
  - **待办/当前步骤**：蓝色边框(#409eff)，浅蓝色背景，蓝色文字不加粗，带蓝色光晕
  - **已驳回**：红色边框(#f56c6c)，浅红色背景，红色文字不加粗
  - **连接线**：根据节点状态显示对应颜色（绿色/蓝色/红色）
- 节点点击：点击方形任务节点显示配置弹窗（只读模式）
- 审批状态显示：弹窗中显示当前节点的审批状态标签
- 图例说明：已完成、当前步骤、待处理、已驳回

#### 5. 角色管理 (Role Management)

- 角色列表：展示所有角色信息
- 角色新增/编辑：弹窗形式新增或编辑角色
- 角色成员管理：查看角色包含的用户，支持成员删除和二次确认
- 角色权限配置

#### 6. 用户管理 (User Management)

- 用户列表：展示所有用户信息
- 用户新增/编辑：弹窗形式新增或编辑用户
- 用户状态管理：激活、禁用
- 支持姓名、部门、角色的新增修改

#### 7. 部门管理 (Department Management)

- 树形部门结构：支持筛选的树形数据部门结构树
- 部门管理：新增、编辑、修改、删除
- 删除校验：无用户时二次确认即可删除，有用户时列出用户并不可删除
- 父子结构显示：虚线表示父子关系

---

## 技术栈

- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript 5.4+
- **UI 组件库**: Element Plus 2.6+
- **构建工具**: Vite 5.2+
- **样式**: SCSS
- **BPMN**: bpmn-js

## 核心依赖

| 依赖 | 用途 |
|------|------|
| `pdfjs-dist` | PDF 文件渲染 |
| `pdf-lib` | PDF 文件批注和编辑 |
| `mammoth` | Word DOCX 转 HTML |
| `xlsx` | Excel 文件解析和生成 |
| `@vue-office/*` | Vue Office 文档预览组件 |
| `monaco-editor` | 代码编辑器 |
| `sortablejs` | 拖拽排序 |
| `jszip` | ZIP 文件处理 |
| `bpmn-js` | BPMN 流程设计器 |
| `bpmn-js-properties-panel` | BPMN 属性面板 |

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
src/
├── components/          # 组件目录
│   ├── Canvas.vue       # 画布组件
│   ├── CodeEditor.vue   # 代码编辑器
│   ├── ComponentPanel.vue # 组件面板
│   ├── FilePreview.vue  # 文件预览组件
│   ├── ListColumnEditor.vue # 列表列编辑器
│   ├── ModalDialog.vue  # 模态对话框
│   ├── PageBuilder.vue  # 页面构建器
│   ├── PropertyPanel.vue # 属性面板
│   ├── RenderedComponent.vue # 渲染组件
│   ├── StyleEditor.vue  # 样式编辑器
│   ├── BpmnWorkflow.vue # BPMN 工作流组件
│   ├── BpmnDesigner.vue # BPMN 设计器组件
│   ├── BpmnViewer.vue   # BPMN 查看器组件
│   └── BpmnDemo.vue     # BPM 工作流演示组件
├── composables/         # 组合式函数
│   └── useCanvas.ts     # 画布逻辑
├── data/                # 数据配置
│   ├── components.ts    # 组件配置
│   └── regionData.ts    # 地区数据
├── types/               # TypeScript 类型定义
│   └── index.ts
├── utils/               # 工具函数
│   ├── exportGenerator.ts # 导出生成器
│   └── projectGenerator.ts # 项目生成器
├── App.vue              # 根组件
├── main.ts              # 入口文件
└── vite-env.d.ts        # Vite 环境类型
```

## 模块快照

### 页面构建器模块

![页面构建器快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Vue%203%20visual%20page%20builder%20interface%20with%20component%20panel%20on%20left%2C%20canvas%20in%20middle%2C%20property%20panel%20on%20right%2C%20clean%20modern%20UI%20design&image_size=landscape_16_9)

**功能说明**:
- 左侧：组件面板，展示所有可用组件
- 中间：画布区域，支持拖拽放置组件
- 右侧：属性配置面板，编辑选中组件的属性
- 顶部：工具栏，包含预览、导出等功能

### BPM 工作流模块

#### 流程设计器

![流程设计器快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=BPMN%20process%20designer%20interface%20with%20canvas%2C%20palette%20toolbar%20on%20left%2C%20workflow%20nodes%20like%20start%20event%2C%20user%20task%2C%20gateway%2C%20end%20event%2C%20modern%20web%20application&image_size=landscape_16_9)

**功能说明**:
- 左侧：工具栏，包含节点工具和操作按钮
- 中间：画布区域，BPMN 流程图编辑区
- 右侧：属性面板（可选）
- 底部：缩放控制和画布操作按钮

#### 任务操作

![任务操作快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Workflow%20task%20management%20interface%20with%20user%20selection%20dropdown%2C%20task%20list%20table%20showing%20pending%20completed%20rejected%20status%2C%20action%20buttons%2C%20modern%20UI&image_size=landscape_16_9)

**功能说明**:
- 用户选择下拉框：筛选不同登录人的任务列表
- 任务列表：展示待审批、已完成、已驳回的任务
- 操作按钮：查看流程、通过、驳回
- 新增任务：选择流程类型创建新任务

#### 流程详情

![流程详情快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Workflow%20detail%20dialog%20showing%20BPMN%20diagram%20with%20colored%20nodes%20green%20completed%20blue%20pending%20red%20rejected%2C%20legend%20at%20top%2C%20modern%20modal%20design&image_size=landscape_16_9)

**功能说明**:
- 图例说明：已完成（绿色）、当前步骤（蓝色）、待处理（灰色）、已驳回（红色）
- BPMN 流程图：根据审批状态显示不同颜色
- 节点点击：点击任务节点显示配置弹窗
- 弹窗内容：节点名称、审批状态、审批角色、审批部门、指定人员

#### 角色管理

![角色管理快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Role%20management%20interface%20with%20role%20list%20table%2C%20add%20edit%20delete%20buttons%2C%20member%20management%20modal%2C%20clean%20admin%20panel%20design&image_size=landscape_16_9)

**功能说明**:
- 角色列表：展示角色名称、描述、成员数量
- 操作按钮：编辑、查看成员、删除
- 成员管理：查看角色下的用户，支持删除成员

#### 用户管理

![用户管理快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=User%20management%20interface%20with%20user%20list%20table%20showing%20name%20department%20role%20status%2C%20edit%20enable%20disable%20buttons%2C%20modern%20admin%20UI&image_size=landscape_16_9)

**功能说明**:
- 用户列表：展示姓名、部门、角色、状态
- 操作按钮：编辑、启用/禁用
- 用户编辑：修改用户信息

#### 部门管理

![部门管理快照](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Department%20management%20interface%20with%20tree%20structure%20displaying%20company%20hierarchy%2C%20search%20functionality%2C%20add%20edit%20delete%20actions%2C%20modern%20enterprise%20UI&image_size=landscape_16_9)

**功能说明**:
- 树形结构：展示部门层级关系
- 搜索功能：支持部门名称搜索
- 操作按钮：新增、编辑、删除
- 删除校验：有用户的部门不可删除

## 使用说明

### 文件预览组件

1. 点击「上传文件」按钮选择本地文件
2. 在文件列表中点击文件名或「预览」按钮打开全屏预览弹窗
3. 根据文件类型进行相应操作：
   - **PDF**: 使用工具栏缩放、翻页，点击「编辑模式」添加批注
   - **Word**: 点击「编辑模式」直接编辑文本内容
   - **Excel**: 点击单元格进行编辑，列宽会自动适配内容

### BPM 工作流

1. **流程设计器**: 在「流程设计器」标签页创建和编辑流程图
2. **工作流管理**: 在「工作流管理」标签页管理全局流程配置
3. **任务操作**: 在「任务操作」标签页选择登录人查看和处理审批任务
4. **角色管理**: 在「角色管理」标签页管理角色和角色成员
5. **用户管理**: 在「用户管理」标签页管理用户信息
6. **部门管理**: 在「部门管理」标签页管理部门结构

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT License