# Page Builder

一个基于 Vue 3 + TypeScript + Element Plus 的可视化页面构建器。

## 功能特性

### 1. 页面构建器 (PageBuilder)

- 可视化拖拽页面组件
- 支持多种组件类型：文本、输入框、按钮、表格、日期选择器等
- 实时预览页面效果
- 组件属性配置面板

### 2. 文件预览组件 (FilePreview)

支持本地文件的上传、预览和编辑，支持以下文件类型：

#### PDF 文件
- 使用 pdfjs-dist 进行 PDF 渲染
- 支持缩放（50% - 300%）
- 支持翻页浏览
- 支持批注功能（添加、编辑、删除批注）
- 支持保存带有批注的 PDF 文件

#### Word 文件 (.docx)
- 使用 mammoth.js 将 DOCX 转换为 HTML
- 支持直接在浏览器中编辑文本内容
- 支持保存为 HTML 格式

#### Excel 文件 (.xlsx)
- 使用 xlsx 库解析 Excel 文件
- 支持点击单元格进行编辑
- 单元格编辑时自动撑开列宽以显示完整内容
- 支持保存为 xlsx 格式

### 3. 代码编辑器 (CodeEditor)

- 使用 Monaco Editor 实现代码编辑
- 支持多种编程语言语法高亮
- 代码格式化功能

### 4. 属性面板 (PropertyPanel)

- 组件属性配置
- 样式编辑
- 事件绑定

### 5. 组件面板 (ComponentPanel)

- 可用组件列表
- 拖拽添加组件到画布

### 6. 列表列编辑器 (ListColumnEditor)

- 表格列配置管理
- 支持列排序
- 支持列宽设置

### 7. 样式编辑器 (StyleEditor)

- 可视化样式编辑
- 支持多种样式属性

## 技术栈

- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript 5.4+
- **UI 组件库**: Element Plus 2.6+
- **构建工具**: Vite 5.2+
- **样式**: SCSS

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
│   └── StyleEditor.vue  # 样式编辑器
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

## 使用说明

### 文件预览组件

1. 点击「上传文件」按钮选择本地文件
2. 在文件列表中点击文件名或「预览」按钮打开全屏预览弹窗
3. 根据文件类型进行相应操作：
   - **PDF**: 使用工具栏缩放、翻页，点击「编辑模式」添加批注
   - **Word**: 点击「编辑模式」直接编辑文本内容
   - **Excel**: 点击单元格进行编辑，列宽会自动适配内容

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT License