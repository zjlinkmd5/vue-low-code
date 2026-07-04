import JSZip from 'jszip'
import type { CanvasComponent } from '@/types'

export interface ExportOptions {
  format: 'html' | 'vue2' | 'vue3-ts'
}

export async function generateHtmlExport(components: CanvasComponent[], globalConfig: Record<string, unknown>): Promise<Blob> {
  const zip = new JSZip()
  
  const labelWidth = globalConfig.labelWidth || 'auto'
  const canvasWidth = globalConfig.canvasWidth || 1200

  const cascaderOptionsMap: Record<string, unknown[]> = {}
  const componentsHtml = components.map(c => generateComponentHtml(c, labelWidth as string, cascaderOptionsMap)).join('\n')

  zip.file('index.html', `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面导出</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://unpkg.com/element-plus/dist/index.full.js"></script>
  <script src="https://unpkg.com/element-plus/es/locale/lang/zh-cn.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <div class="canvas-container">
      ${componentsHtml}
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`)

  zip.file('styles.css', `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
.canvas-container { 
  max-width: ${canvasWidth}px; 
  margin: 0 auto; 
  padding: 24px; 
  background: #fff; 
  min-height: 100vh;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
.form-field { 
  display: flex; 
  align-items: flex-start; 
  margin-bottom: 16px; 
  padding: 12px; 
}
.form-field-vertical { flex-direction: column; align-items: flex-start; }
.form-label { 
  ${labelWidth !== 'auto' ? `width: ${labelWidth}px; flex-shrink: 0;` : 'flex: 0 0 auto;'}
  text-align: right; 
  padding-right: 12px; 
  font-weight: 500; 
  color: #606266; 
  font-size: 14px; 
  line-height: 32px;
  margin-bottom: 0;
}
.form-field-vertical .form-label { text-align: left; padding-right: 0; margin-bottom: 8px; }
.form-content { flex: 1; min-width: 0; }
.required-asterisk { color: #f56c6c; margin-right: 4px; }
.validation-error { color: #f56c6c; font-size: 12px; margin-top: 4px; display: block; }
.custom-range-picker { display: flex; align-items: center; gap: 8px; width: 100%; flex-wrap: wrap; }
.custom-range-picker .range-picker-item { flex: 1; min-width: 140px; }
.custom-range-picker span { color: #909399; white-space: nowrap; }
.custom-range-picker .quarter-picker { flex: 1; min-width: 140px; }
.grid-container { display: flex; gap: 20px; }
.grid-column { flex: 1; }
.el-select, .el-input, .el-cascader { width: 100%; }
.el-button + .el-button { margin-left: 8px; }
.card-component { margin-bottom: 16px; }
.text-component { line-height: 1.6; }
.heading-component h1 { font-size: 24px; margin: 0; font-weight: 600; }
.heading-component h2 { font-size: 20px; margin: 0; font-weight: 600; }
.heading-component h3 { font-size: 16px; margin: 0; font-weight: 600; }
.list-component { width: 100%; overflow-x: auto; }
.list-component .custom-list-table { width: 100%; }
.list-component .list-cell-text { display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.list-component .list-image-container img { max-width: 80px; max-height: 80px; object-fit: contain; border-radius: 4px; }
.list-component .lazy-image { background: #f5f5f5; border-radius: 4px; }`)

  zip.file('app.js', generateAppJs(components, cascaderOptionsMap))

  return zip.generateAsync({ type: 'blob' })
}

function generateAppJs(components: CanvasComponent[], cascaderOptionsMap: Record<string, unknown[]>): string {
  const fieldConfigs = components.map(c => {
    const fieldName = c.fieldBinding?.fieldName || ''
    const required = c.props.required || false
    const inputType = c.props.inputType || 'text'
    const compType = c.type
    const dateType = c.props.type || 'date'
    return `{ id: '${c.id}', fieldName: '${fieldName}', required: ${required}, inputType: '${inputType}', compType: '${compType}', dateType: '${dateType}' }`
  }).join(',')

  const compIds = components.map(c => `'${c.id}'`).join(', ')

  let cascaderOptionsDefs = ''
  for (const [id, options] of Object.entries(cascaderOptionsMap)) {
    cascaderOptionsDefs += `    const cascaderOptions_${id} = ${JSON.stringify(options)};\n`
  }

  const quarterOptions = JSON.stringify([
    { label: '第一季度', value: '1' },
    { label: '第二季度', value: '2' },
    { label: '第三季度', value: '3' },
    { label: '第四季度', value: '4' }
  ])

  const yearQuarterOptionsArray: { label: string; value: string }[] = []
  for (let y = 2020; y <= 2040; y++) {
    for (let q = 1; q <= 4; q++) {
      yearQuarterOptionsArray.push({ label: y + '年第' + q + '季度', value: y + '-' + q })
    }
  }
  const yearQuarterOptions = JSON.stringify(yearQuarterOptionsArray)

  const listDataMap: Record<string, unknown[]> = {}
  const listColumnsMap: Record<string, unknown[]> = {}
  components.forEach(c => {
    if (c.type === 'List') {
      listDataMap[c.id] = c.props.data as unknown[] || []
      listColumnsMap[c.id] = c.props.columns as unknown[] || []
    }
  })
  const listDataStr = JSON.stringify(listDataMap)
  const listColumnsStr = JSON.stringify(listColumnsMap)

  const appJsParts: string[] = []

  appJsParts.push(`const { createApp, ref } = Vue\n\ncreateApp({\n  setup() {\n`)

  appJsParts.push(`    const formData = ref({})\n`)
  appJsParts.push(`    const visibleComponents = ref({})\n`)
  appJsParts.push(`    const disabledComponents = ref({})\n`)
  appJsParts.push(`    const customStartDate = ref({})\n`)
  appJsParts.push(`    const customEndDate = ref({})\n`)
  appJsParts.push(`    const validationErrors = ref({})\n`)
  appJsParts.push(`    const listData = ref(${listDataStr})\n`)
  appJsParts.push(`    const listColumns = ref(${listColumnsStr})\n`)
  appJsParts.push(`    const listSortState = ref({})\n\n`)

  appJsParts.push(`    const regionOptions = [\n`)
  appJsParts.push(`      {"value":"110000","label":"北京市","children":[{"value":"110100","label":"北京市","children":[{"value":"110101","label":"东城区"},{"value":"110102","label":"西城区"},{"value":"110105","label":"朝阳区"},{"value":"110106","label":"丰台区"},{"value":"110107","label":"石景山区"},{"value":"110108","label":"海淀区"},{"value":"110109","label":"门头沟区"},{"value":"110111","label":"房山区"},{"value":"110112","label":"通州区"},{"value":"110113","label":"顺义区"},{"value":"110114","label":"昌平区"},{"value":"110115","label":"大兴区"},{"value":"110116","label":"怀柔区"},{"value":"110117","label":"平谷区"},{"value":"110118","label":"密云区"},{"value":"110119","label":"延庆区"}]}]},\n`)
  appJsParts.push(`      {"value":"310000","label":"上海市","children":[{"value":"310100","label":"上海市","children":[{"value":"310101","label":"黄浦区"},{"value":"310104","label":"徐汇区"},{"value":"310105","label":"长宁区"},{"value":"310106","label":"静安区"},{"value":"310107","label":"普陀区"},{"value":"310109","label":"虹口区"},{"value":"310110","label":"杨浦区"},{"value":"310115","label":"浦东新区"},{"value":"310116","label":"闵行区"},{"value":"310117","label":"宝山区"},{"value":"310118","label":"嘉定区"},{"value":"310120","label":"金山区"},{"value":"310121","label":"松江区"},{"value":"310122","label":"青浦区"},{"value":"310123","label":"奉贤区"},{"value":"310151","label":"崇明区"}]}]},\n`)
  appJsParts.push(`      {"value":"440000","label":"广东省","children":[{"value":"440100","label":"广州市","children":[{"value":"440103","label":"荔湾区"},{"value":"440104","label":"越秀区"},{"value":"440105","label":"海珠区"},{"value":"440106","label":"天河区"},{"value":"440111","label":"白云区"},{"value":"440112","label":"黄埔区"},{"value":"440113","label":"番禺区"},{"value":"440114","label":"花都区"},{"value":"440115","label":"南沙区"},{"value":"440117","label":"从化区"},{"value":"440118","label":"增城区"}]},{"value":"440300","label":"深圳市","children":[{"value":"440303","label":"罗湖区"},{"value":"440304","label":"福田区"},{"value":"440305","label":"南山区"},{"value":"440306","label":"宝安区"},{"value":"440307","label":"龙岗区"},{"value":"440308","label":"盐田区"},{"value":"440309","label":"龙华区"},{"value":"440310","label":"坪山区"},{"value":"440311","label":"光明区"}]}]}\n`)
  appJsParts.push(`    ]\n\n`)

  appJsParts.push(`    const quarterOptions = ${quarterOptions};\n`)
  appJsParts.push(`    const yearQuarterOptions = ${yearQuarterOptions};\n\n`)
  appJsParts.push(cascaderOptionsDefs)
  appJsParts.push(`    const fieldConfigs = [${fieldConfigs}]\n\n`)

  appJsParts.push(`    const compIds = [${compIds}]\n`)
  appJsParts.push(`    compIds.forEach(id => {\n`)
  appJsParts.push(`      visibleComponents.value[id] = true\n`)
  appJsParts.push(`      disabledComponents.value[id] = false\n`)
  appJsParts.push(`      customStartDate.value[id] = ''\n`)
  appJsParts.push(`      customEndDate.value[id] = ''\n`)
  appJsParts.push(`    })\n\n`)

  appJsParts.push(`    function formatDateTime(date) {\n`)
  appJsParts.push(`      const Y = date.getFullYear()\n`)
  appJsParts.push(`      const M = String(date.getMonth() + 1).padStart(2, '0')\n`)
  appJsParts.push(`      const D = String(date.getDate()).padStart(2, '0')\n`)
  appJsParts.push(`      const h = String(date.getHours()).padStart(2, '0')\n`)
  appJsParts.push(`      const m = String(date.getMinutes()).padStart(2, '0')\n`)
  appJsParts.push(`      const s = String(date.getSeconds()).padStart(2, '0')\n`)
  appJsParts.push(`      return Y + '-' + M + '-' + D + ' ' + h + ':' + m + ':' + s\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function getWeekStartEnd(dateStr) {\n`)
  appJsParts.push(`      const d = new Date(dateStr)\n`)
  appJsParts.push(`      const day = d.getDay() || 7\n`)
  appJsParts.push(`      const start = new Date(d)\n`)
  appJsParts.push(`      start.setDate(d.getDate() - day + 1)\n`)
  appJsParts.push(`      start.setHours(0, 0, 0, 0)\n`)
  appJsParts.push(`      const end = new Date(start)\n`)
  appJsParts.push(`      end.setDate(start.getDate() + 6)\n`)
  appJsParts.push(`      end.setHours(23, 59, 59, 0)\n`)
  appJsParts.push(`      return { start, end }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function getQuarterStartEnd(year, quarter) {\n`)
  appJsParts.push(`      const q = parseInt(quarter)\n`)
  appJsParts.push(`      const start = new Date(year, (q - 1) * 3, 1)\n`)
  appJsParts.push(`      start.setHours(0, 0, 0, 0)\n`)
  appJsParts.push(`      const end = new Date(year, q * 3, 0)\n`)
  appJsParts.push(`      end.setHours(23, 59, 59, 0)\n`)
  appJsParts.push(`      return { start, end }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function getDateType(compId) {\n`)
  appJsParts.push(`      const config = fieldConfigs.find(c => c.id === compId)\n`)
  appJsParts.push(`      return config ? config.dateType : 'date'\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleCustomRangeStartChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      if (!val) {\n`)
  appJsParts.push(`        formData.value[fieldName] = []\n`)
  appJsParts.push(`        return\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      const currentVal = formData.value[fieldName] || []\n`)
  appJsParts.push(`      const type = getDateType(compId)\n`)
  appJsParts.push(`      let startRange, endRange = null\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      if (type === 'weekrange') {\n`)
  appJsParts.push(`        startRange = getWeekStartEnd(val)\n`)
  appJsParts.push(`        if (currentVal && currentVal[1]) {\n`)
  appJsParts.push(`          endRange = getWeekStartEnd(currentVal[1])\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      } else if (type === 'quarterrange') {\n`)
  appJsParts.push(`        const [year, quarter] = val.split('-')\n`)
  appJsParts.push(`        startRange = getQuarterStartEnd(year, quarter)\n`)
  appJsParts.push(`        if (currentVal && currentVal[1]) {\n`)
  appJsParts.push(`          const [endYear, endQuarter] = currentVal[1].split('-')\n`)
  appJsParts.push(`          endRange = getQuarterStartEnd(endYear, endQuarter)\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      if (endRange && endRange.start >= startRange.start) {\n`)
  appJsParts.push(`        formData.value[fieldName] = [formatDateTime(startRange.start), formatDateTime(endRange.end)]\n`)
  appJsParts.push(`      } else {\n`)
  appJsParts.push(`        formData.value[fieldName] = [formatDateTime(startRange.start), formatDateTime(startRange.end)]\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleCustomRangeEndChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      if (!val) {\n`)
  appJsParts.push(`        formData.value[fieldName] = []\n`)
  appJsParts.push(`        return\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      const currentVal = formData.value[fieldName] || []\n`)
  appJsParts.push(`      const type = getDateType(compId)\n`)
  appJsParts.push(`      let endRange, startRange = null\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      if (type === 'weekrange') {\n`)
  appJsParts.push(`        endRange = getWeekStartEnd(val)\n`)
  appJsParts.push(`        if (currentVal && currentVal[0]) {\n`)
  appJsParts.push(`          startRange = getWeekStartEnd(currentVal[0])\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      } else if (type === 'quarterrange') {\n`)
  appJsParts.push(`        const [year, quarter] = val.split('-')\n`)
  appJsParts.push(`        endRange = getQuarterStartEnd(year, quarter)\n`)
  appJsParts.push(`        if (currentVal && currentVal[0]) {\n`)
  appJsParts.push(`          const [startYear, startQuarter] = currentVal[0].split('-')\n`)
  appJsParts.push(`          startRange = getQuarterStartEnd(startYear, startQuarter)\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      if (startRange && startRange.start <= endRange.end) {\n`)
  appJsParts.push(`        formData.value[fieldName] = [formatDateTime(startRange.start), formatDateTime(endRange.end)]\n`)
  appJsParts.push(`      } else {\n`)
  appJsParts.push(`        formData.value[fieldName] = [formatDateTime(endRange.start), formatDateTime(endRange.end)]\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleDateRangeChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      if (Array.isArray(val) && val.length === 2 && val[0] && val[1]) {\n`)
  appJsParts.push(`        const start = new Date(val[0])\n`)
  appJsParts.push(`        const end = new Date(val[1])\n`)
  appJsParts.push(`        start.setHours(0, 0, 0, 0)\n`)
  appJsParts.push(`        end.setHours(23, 59, 59, 0)\n`)
  appJsParts.push(`        formData.value[fieldName] = [formatDateTime(start), formatDateTime(end)]\n`)
  appJsParts.push(`      } else {\n`)
  appJsParts.push(`        formData.value[fieldName] = val\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleDateChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      if (!val) {\n`)
  appJsParts.push(`        formData.value[fieldName] = val\n`)
  appJsParts.push(`        return\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      const d = new Date(val)\n`)
  appJsParts.push(`      if (isNaN(d.getTime())) {\n`)
  appJsParts.push(`        formData.value[fieldName] = val\n`)
  appJsParts.push(`        return\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      const type = getDateType(compId)\n`)
  appJsParts.push(`      if (type === 'date' || type === 'week' || type === 'month' || type === 'year') {\n`)
  appJsParts.push(`        d.setHours(0, 0, 0, 0)\n`)
  appJsParts.push(`        formData.value[fieldName] = formatDateTime(d)\n`)
  appJsParts.push(`      } else if (type === 'datetime') {\n`)
  appJsParts.push(`        formData.value[fieldName] = formatDateTime(d)\n`)
  appJsParts.push(`      } else if (type === 'quarter') {\n`)
  appJsParts.push(`        const year = Math.floor(d.getFullYear() / 1000) * 1000 + (val - 1) * 250\n`)
  appJsParts.push(`        const quarter = ((val - 1) % 4) + 1\n`)
  appJsParts.push(`        const range = getQuarterStartEnd(year, quarter)\n`)
  appJsParts.push(`        formData.value[fieldName] = formatDateTime(range.start)\n`)
  appJsParts.push(`      } else {\n`)
  appJsParts.push(`        formData.value[fieldName] = val\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleInputChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      formData.value[fieldName] = val\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleSelectChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      formData.value[fieldName] = val\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleRadioChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      formData.value[fieldName] = val\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleCheckboxChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      formData.value[fieldName] = val\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleSwitchChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      formData.value[fieldName] = val\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleCascaderChange(compId, fieldName, val) {\n`)
  appJsParts.push(`      formData.value[fieldName] = val\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function validateForm() {\n`)
  appJsParts.push(`      let isValid = true\n`)
  appJsParts.push(`      validationErrors.value = {}\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      for (const config of fieldConfigs) {\n`)
  appJsParts.push(`        if (!config.fieldName) continue\n`)
  appJsParts.push(`        \n`)
  appJsParts.push(`        const value = formData.value[config.fieldName]\n`)
  appJsParts.push(`        \n`)
  appJsParts.push(`        if (config.required) {\n`)
  appJsParts.push(`          if (!value || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)) {\n`)
  appJsParts.push(`            validationErrors.value[config.id] = '此字段为必填项'\n`)
  appJsParts.push(`            isValid = false\n`)
  appJsParts.push(`          }\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      return isValid\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function resetForm() {\n`)
  appJsParts.push(`      for (const config of fieldConfigs) {\n`)
  appJsParts.push(`        if (config.fieldName) {\n`)
  appJsParts.push(`          formData.value[fieldName] = ''\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      validationErrors.value = {}\n`)
  appJsParts.push(`      compIds.forEach(id => {\n`)
  appJsParts.push(`        customStartDate.value[id] = ''\n`)
  appJsParts.push(`        customEndDate.value[id] = ''\n`)
  appJsParts.push(`      })\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleSubmit(submitType) {\n`)
  appJsParts.push(`      if (submitType === 'reset') {\n`)
  appJsParts.push(`        resetForm()\n`)
  appJsParts.push(`        return\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      if (submitType === 'submit') {\n`)
  appJsParts.push(`        if (!validateForm()) {\n`)
  appJsParts.push(`          alert('表单校验失败，请检查必填项')\n`)
  appJsParts.push(`          return\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      console.log('表单数据:', formData.value)\n`)
  appJsParts.push(`      alert(JSON.stringify(formData.value, null, 2))\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function isImageUrl(value) {\n`)
  appJsParts.push(`      const str = String(value)\n`)
  appJsParts.push(`      return /\\.(jpg|jpeg|png|gif|svg|webp)$/i.test(str) || str.startsWith('data:image')\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function initLazyImages() {\n`)
  appJsParts.push(`      const images = document.querySelectorAll('.lazy-image')\n`)
  appJsParts.push(`      if (images.length === 0) return\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      const observer = new IntersectionObserver((entries) => {\n`)
  appJsParts.push(`        entries.forEach(entry => {\n`)
  appJsParts.push(`          if (entry.isIntersecting) {\n`)
  appJsParts.push(`            const img = entry.target\n`)
  appJsParts.push(`            const src = img.getAttribute('data-src')\n`)
  appJsParts.push(`            if (src) {\n`)
  appJsParts.push(`              img.src = src\n`)
  appJsParts.push(`              img.classList.remove('lazy-image')\n`)
  appJsParts.push(`            }\n`)
  appJsParts.push(`            observer.unobserve(img)\n`)
  appJsParts.push(`          }\n`)
  appJsParts.push(`        })\n`)
  appJsParts.push(`      }, { rootMargin: '100px' })\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      images.forEach(img => observer.observe(img))\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    setTimeout(initLazyImages, 100)\n\n`)

  appJsParts.push(`    function getListData(compId) {\n`)
  appJsParts.push(`      const data = listData.value[compId] || []\n`)
  appJsParts.push(`      const sortState = listSortState.value[compId] || { key: '', order: 'ascending' }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      if (!sortState.key) {\n`)
  appJsParts.push(`        return data\n`)
  appJsParts.push(`      }\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      const columns = listColumns.value[compId] || []\n`)
  appJsParts.push(`      const column = columns.find(c => c.key === sortState.key)\n`)
  appJsParts.push(`      const sortType = column ? column.sortType || 'string' : 'string'\n`)
  appJsParts.push(`      \n`)
  appJsParts.push(`      return [...data].sort((a, b) => {\n`)
  appJsParts.push(`        const valA = a[sortState.key]\n`)
  appJsParts.push(`        const valB = b[sortState.key]\n`)
  appJsParts.push(`        \n`)
  appJsParts.push(`        if (sortType === 'number') {\n`)
  appJsParts.push(`          const numA = parseFloat(String(valA)) || 0\n`)
  appJsParts.push(`          const numB = parseFloat(String(valB)) || 0\n`)
  appJsParts.push(`          return sortState.order === 'ascending' ? numA - numB : numB - numA\n`)
  appJsParts.push(`        } else if (sortType === 'date') {\n`)
  appJsParts.push(`          const dateA = new Date(String(valA))\n`)
  appJsParts.push(`          const dateB = new Date(String(valB))\n`)
  appJsParts.push(`          return sortState.order === 'ascending' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()\n`)
  appJsParts.push(`        } else {\n`)
  appJsParts.push(`          return sortState.order === 'ascending' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA))\n`)
  appJsParts.push(`        }\n`)
  appJsParts.push(`      })\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    function handleListSort(compId, { prop, order }) {\n`)
  appJsParts.push(`      listSortState.value[compId] = { key: prop, order: order }\n`)
  appJsParts.push(`    }\n\n`)

  appJsParts.push(`    return {\n`)
  appJsParts.push(`      formData,\n`)
  appJsParts.push(`      visibleComponents,\n`)
  appJsParts.push(`      disabledComponents,\n`)
  appJsParts.push(`      customStartDate,\n`)
  appJsParts.push(`      customEndDate,\n`)
  appJsParts.push(`      yearQuarterOptions,\n`)
  appJsParts.push(`      validationErrors,\n`)
  appJsParts.push(`      regionOptions,\n`)
  appJsParts.push(`      formatDateTime,\n`)
  appJsParts.push(`      handleDateRangeChange,\n`)
  appJsParts.push(`      handleCustomRangeStartChange,\n`)
  appJsParts.push(`      handleCustomRangeEndChange,\n`)
  appJsParts.push(`      handleDateChange,\n`)
  appJsParts.push(`      handleInputChange,\n`)
  appJsParts.push(`      handleSelectChange,\n`)
  appJsParts.push(`      handleRadioChange,\n`)
  appJsParts.push(`      handleCheckboxChange,\n`)
  appJsParts.push(`      handleSwitchChange,\n`)
  appJsParts.push(`      handleCascaderChange,\n`)
  appJsParts.push(`      handleSubmit,\n`)
  appJsParts.push(`      isImageUrl,\n`)
  appJsParts.push(`      getListData,\n`)
  appJsParts.push(`      handleListSort\n`)
  appJsParts.push(`    }\n`)
  appJsParts.push(`  }\n`)
  appJsParts.push(`}).use(ElementPlus, { locale: ElementPlusLocaleZhCn }).mount('#app')`)

  return appJsParts.join('')
}

function getFieldName(component: CanvasComponent): string {
  return component.fieldBinding?.fieldName || component.id
}

function generateComponentHtml(component: CanvasComponent, labelWidth: string, cascaderOptionsMap: Record<string, unknown[]>): string {
  const label = component.props.label as string || ''
  const required = component.props.required as boolean || false
  const isVertical = labelWidth !== 'auto' && parseFloat(labelWidth) > 600
  const fieldName = getFieldName(component)

  let labelHtml = ''
  if (label) {
    labelHtml = '<label class="form-label">' + (required ? '<span class="required-asterisk">*</span>' : '') + label + '</label>'
  }

  let contentHtml = ''
  
  switch (component.type) {
    case 'Text':
      contentHtml = generateTextHtml(component)
      break
    case 'Heading':
      contentHtml = generateHeadingHtml(component)
      break
    case 'Input':
      contentHtml = generateInputHtml(component, fieldName)
      break
    case 'Textarea':
      contentHtml = generateTextareaHtml(component, fieldName)
      break
    case 'Select':
      contentHtml = generateSelectHtml(component, fieldName)
      break
    case 'Radio':
      contentHtml = generateRadioHtml(component, fieldName)
      break
    case 'Checkbox':
      contentHtml = generateCheckboxHtml(component, fieldName)
      break
    case 'Switch':
      contentHtml = generateSwitchHtml(component, fieldName)
      break
    case 'DatePicker':
      contentHtml = generateDatePickerHtml(component, fieldName)
      break
    case 'DateRangePicker':
      contentHtml = generateDateRangePickerHtml(component, fieldName)
      break
    case 'Cascader':
      contentHtml = generateCascaderHtml(component, fieldName, cascaderOptionsMap)
      break
    case 'Button':
      contentHtml = generateButtonHtml(component)
      break
    case 'Card':
      contentHtml = generateCardHtml(component)
      break
    case 'Divider':
      contentHtml = generateDividerHtml(component)
      break
    case 'Grid':
      contentHtml = generateGridHtml(component, labelWidth, cascaderOptionsMap)
      break
    case 'List':
      contentHtml = generateListHtml(component)
      break
    default:
      contentHtml = '<div>未知组件: ' + component.type + '</div>'
  }

  if (component.type === 'Text' || component.type === 'Heading' || component.type === 'Button' || component.type === 'Card' || component.type === 'Divider' || component.type === 'List') {
    return contentHtml
  }

  return '<div v-show="visibleComponents[\'' + component.id + '\']" class="form-field ' + (isVertical && label ? 'form-field-vertical' : '') + '">' + labelHtml + '<div class="form-content">' + contentHtml + '<span v-if="validationErrors[\'' + component.id + '\']" class="validation-error">{{ validationErrors[\'' + component.id + '\'] }}</span></div></div>'
}

function generateTextHtml(component: CanvasComponent): string {
  const content = component.props.content as string || ''
  const fontSize = component.props.fontSize as string || '16px'
  const fontWeight = component.props.fontWeight as string || 'normal'
  const color = component.props.color as string || '#333333'
  const textAlign = component.props.textAlign as string || 'left'

  return '<div class="text-component" style="font-size: ' + fontSize + '; font-weight: ' + fontWeight + '; color: ' + color + '; text-align: ' + textAlign + ';">' + content + '</div>'
}

function generateHeadingHtml(component: CanvasComponent): string {
  const content = component.props.content as string || ''
  const level = component.props.level as number || 1
  const color = component.props.color as string || '#333333'

  const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
  return '<div class="heading-component"><' + tag + ' style="color: ' + color + ';">' + content + '</' + tag + '></div>'
}

function generateInputHtml(component: CanvasComponent, fieldName: string): string {
  const placeholder = component.props.placeholder as string || '请输入内容'
  const disabled = component.props.disabled as boolean || false
  const clearable = component.props.clearable as boolean || true
  const maxlength = component.props.maxLength as number

  return '<el-input v-model="formData[\'' + fieldName + '\']" @input="handleInputChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" :placeholder="' + JSON.stringify(placeholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" :clearable="' + clearable + '"' + (maxlength ? ' :maxlength="' + maxlength + '"' : '') + ' />'
}

function generateTextareaHtml(component: CanvasComponent, fieldName: string): string {
  const placeholder = component.props.placeholder as string || '请输入内容'
  const disabled = component.props.disabled as boolean || false
  const clearable = component.props.clearable as boolean || true
  const maxlength = component.props.maxLength as number
  const rows = component.props.rows as number || 4
  const showWordLimit = component.props.showWordLimit as boolean || false

  return '<el-input v-model="formData[\'' + fieldName + '\']" @input="handleInputChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" type="textarea" :placeholder="' + JSON.stringify(placeholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" :clearable="' + clearable + '"' + (maxlength ? ' :maxlength="' + maxlength + '"' : '') + ' :rows="' + rows + '" :show-word-limit="' + showWordLimit + '" />'
}

function generateSelectHtml(component: CanvasComponent, fieldName: string): string {
  const placeholder = component.props.placeholder as string || '请选择'
  const disabled = component.props.disabled as boolean || false
  const options = component.props.options as {label: string; value: unknown}[] || []
  const multiple = component.props.multiple as boolean || false

  const optionsHtml = options.map(o => '<el-option :label="' + JSON.stringify(o.label) + '" :value="' + JSON.stringify(o.value) + '" />').join('\n')

  return '<el-select v-model="formData[\'' + fieldName + '\']" @change="handleSelectChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" :placeholder="' + JSON.stringify(placeholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '"' + (multiple ? ' multiple' : '') + '>' + optionsHtml + '</el-select>'
}

function generateRadioHtml(component: CanvasComponent, fieldName: string): string {
  const options = component.props.options as {label: string; value: unknown}[] || []
  
  const optionsHtml = options.map(o => '<el-radio :label="' + JSON.stringify(o.value) + '">' + o.label + '</el-radio>').join('\n')

  return '<el-radio-group v-model="formData[\'' + fieldName + '\']" @change="handleRadioChange(\'' + component.id + '\', \'' + fieldName + '\', $event)">' + optionsHtml + '</el-radio-group>'
}

function generateCheckboxHtml(component: CanvasComponent, fieldName: string): string {
  const options = component.props.options as {label: string; value: unknown}[] || []
  
  const optionsHtml = options.map(o => '<el-checkbox :label="' + JSON.stringify(o.value) + '">' + o.label + '</el-checkbox>').join('\n')

  return '<el-checkbox-group v-model="formData[\'' + fieldName + '\']" @change="handleCheckboxChange(\'' + component.id + '\', \'' + fieldName + '\', $event)">' + optionsHtml + '</el-checkbox-group>'
}

function generateSwitchHtml(component: CanvasComponent, fieldName: string): string {
  const disabled = component.props.disabled as boolean || false

  return '<el-switch v-model="formData[\'' + fieldName + '\']" @change="handleSwitchChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" />'
}

function generateDatePickerHtml(component: CanvasComponent, fieldName: string): string {
  const type = component.props.type as string || 'date'
  const placeholder = component.props.placeholder as string || '请选择日期'
  const disabled = component.props.disabled as boolean || false

  const formatMap: Record<string, string> = {
    week: 'YYYY[年的第]w[周]',
    month: 'YYYY[年]MM[月]',
    year: 'YYYY[年]',
    quarter: 'YYYY[年第]Q[季度]',
    datetime: 'YYYY-MM-DD HH:mm:ss'
  }

  const format = formatMap[type] || 'YYYY-MM-DD'
  const valueFormat = type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'

  if (type === 'quarter') {
    return '<div class="custom-range-picker"><div class="quarter-picker"><el-select v-model="quarterStartYear[\'' + component.id + '\']" placeholder="选择年份" style="width: 45%; margin-right: 10%;"><el-option v-for="y in 20" :key="2020 + y" :label="(2020 + y) + \'年\'" :value="2020 + y" /></el-select><el-select v-model="quarterStartQuarter[\'' + component.id + '\']" placeholder="选择季度" style="width: 45%;" @change="handleDateChange(\'' + component.id + '\', \'' + fieldName + '\', quarterStartQuarter[\'' + component.id + '\'])"><el-option :label="\'第一季度\'" :value="\'1\'" /><el-option :label="\'第二季度\'" :value="\'2\'" /><el-option :label="\'第三季度\'" :value="\'3\'" /><el-option :label="\'第四季度\'" :value="\'4\'" /></el-select></div></div>'
  }

  return '<el-date-picker v-model="formData[\'' + fieldName + '\']" @change="handleDateChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" type="' + type + '" :format="\'' + format + '\'" :value-format="\'' + valueFormat + '\'" :placeholder="' + JSON.stringify(placeholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" style="width: 100%;" />'
}

function generateDateRangePickerHtml(component: CanvasComponent, fieldName: string): string {
  const type = component.props.type as string || 'daterange'
  const disabled = component.props.disabled as boolean || false
  const startPlaceholder = component.props.startPlaceholder as string || '开始日期'
  const endPlaceholder = component.props.endPlaceholder as string || '结束日期'

  if (type === 'weekrange') {
    return '<div class="custom-range-picker"><el-date-picker v-model="customStartDate[\'' + component.id + '\']" @change="handleCustomRangeStartChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" type="week" :format="\'YYYY[年的第]w[周]\'" :value-format="\'YYYY-MM-DD\'" :placeholder="' + JSON.stringify(startPlaceholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" class="range-picker-item" /><span>至</span><el-date-picker v-model="customEndDate[\'' + component.id + '\']" @change="handleCustomRangeEndChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" type="week" :format="\'YYYY[年的第]w[周]\'" :value-format="\'YYYY-MM-DD\'" :placeholder="' + JSON.stringify(endPlaceholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" class="range-picker-item" /></div>'
  }

  if (type === 'quarterrange') {
    return '<div class="custom-range-picker"><el-select v-model="customStartDate[\'' + component.id + '\']" placeholder="选择开始季度" style="width: 45%;" @change="handleCustomRangeStartChange(\'' + component.id + '\', \'' + fieldName + '\', $event)"><el-option v-for="opt in yearQuarterOptions" :key="opt.value" :label="opt.label" :value="opt.value" /></el-select><span>至</span><el-select v-model="customEndDate[\'' + component.id + '\']" placeholder="选择结束季度" style="width: 45%;" @change="handleCustomRangeEndChange(\'' + component.id + '\', \'' + fieldName + '\', $event)"><el-option v-for="opt in yearQuarterOptions" :key="opt.value" :label="opt.label" :value="opt.value" /></el-select></div>'
  }

  const formatMap: Record<string, string> = {
    daterange: 'YYYY-MM-DD',
    monthrange: 'YYYY[年]MM[月]',
    yearrange: 'YYYY[年]',
    datetimerange: 'YYYY-MM-DD HH:mm:ss'
  }

  const rangeSeparator = '至'
  const format = formatMap[type] || 'YYYY-MM-DD'
  const valueFormat = type === 'datetimerange' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'

  return '<el-date-picker v-model="formData[\'' + fieldName + '\']" @change="handleDateRangeChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" type="' + type + '" :range-separator="\'' + rangeSeparator + '\'" :start-placeholder="' + JSON.stringify(startPlaceholder) + '" :end-placeholder="' + JSON.stringify(endPlaceholder) + '" :format="\'' + format + '\'" :value-format="\'' + valueFormat + '\'" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" style="width: 100%;" />'
}

function generateCascaderHtml(component: CanvasComponent, fieldName: string, cascaderOptionsMap: Record<string, unknown[]>): string {
  const placeholder = component.props.placeholder as string || '请选择'
  const disabled = component.props.disabled as boolean || false
  const dataType = component.props.dataType as string || 'region'
  const options = component.props.options as {value: string; label: string; children?: unknown[]}[] || []

  if (dataType === 'region') {
    return '<el-cascader v-model="formData[\'' + fieldName + '\']" @change="handleCascaderChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" :options="regionOptions" :placeholder="' + JSON.stringify(placeholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" />'
  }

  cascaderOptionsMap[component.id] = options
  return '<el-cascader v-model="formData[\'' + fieldName + '\']" @change="handleCascaderChange(\'' + component.id + '\', \'' + fieldName + '\', $event)" :options="cascaderOptions_' + component.id + '" :placeholder="' + JSON.stringify(placeholder) + '" :disabled="disabledComponents[\'' + component.id + '\'] || ' + disabled + '" />'
}

function generateButtonHtml(component: CanvasComponent): string {
  const text = component.props.text as string || '按钮'
  const type = component.props.type as string || 'primary'
  const size = component.props.size as string || 'medium'
  const submitType = component.props.submitType as string || 'none'

  return '<el-button type="' + type + '" size="' + size + '" @click="handleSubmit(\'' + submitType + '\')">' + text + '</el-button>'
}

function generateCardHtml(component: CanvasComponent): string {
  const title = component.props.title as string || ''
  const shadow = component.props.shadow as string || 'hover'
  
  return '<el-card class="card-component" :title="' + JSON.stringify(title) + '" :shadow="' + JSON.stringify(shadow) + '"><div style="padding: 16px;">卡片内容区域</div></el-card>'
}

function generateDividerHtml(component: CanvasComponent): string {
  const direction = component.props.direction as string || 'horizontal'
  const content = component.props.content as string || ''

  return '<el-divider :direction="' + JSON.stringify(direction) + '">' + content + '</el-divider>'
}

function generateGridHtml(component: CanvasComponent, labelWidth: string, cascaderOptionsMap: Record<string, unknown[]>): string {
  const columns = component.props.columns as number || 2
  const gutter = component.props.gutter as number || 20
  const children = component.children || []

  if (columns === 2 && children.length > 0) {
    const mid = Math.ceil(children.length / 2)
    const leftHtml = children.slice(0, mid).map(c => generateComponentHtml(c, labelWidth, cascaderOptionsMap)).join('\n')
    const rightHtml = children.slice(mid).map(c => generateComponentHtml(c, labelWidth, cascaderOptionsMap)).join('\n')
    return '<div class="grid-container" style="gap: ' + gutter + 'px;"><div class="grid-column">' + leftHtml + '</div><div class="grid-column">' + rightHtml + '</div></div>'
  }

  const childrenHtml = children.map(c => generateComponentHtml(c, labelWidth, cascaderOptionsMap)).join('\n')

  return '<div class="grid-container" style="gap: ' + gutter + 'px;"><div class="grid-column" v-for="(col, idx) in ' + columns + '" :key="idx">' + childrenHtml + '</div></div>'
}

function generateListHtml(component: CanvasComponent): string {
  const columns = component.props.columns as Array<{ key: string; label: string; width?: string; sortable?: boolean; sortType?: string }> || []
  const data = component.props.data as Array<Record<string, unknown>> || []
  const maxHeight = component.props.maxHeight as string || 'auto'
  const useVirtualScroll = data.length > 100

  const columnsHtml = columns.map((col) => {
    const width = col.width ? ' :width="' + JSON.stringify(col.width) + '"' : ''
    const sortable = col.sortable ? ' :sortable="true"' : ''
    const prop = col.key
    const label = col.label

    return '<el-table-column' + width + sortable + ' :prop="' + JSON.stringify(prop) + '" :label="' + JSON.stringify(label) + '"><template #default="{ row }"><span v-if="isImageUrl(row[\'' + prop + '\'])" class="list-image-container"><img :data-src="row[\'' + prop + '\']" class="lazy-image" :alt="' + JSON.stringify(label) + '" /></span><span v-else class="list-cell-text" :title="String(row[\'' + prop + '\'])">{{ row[\'' + prop + '\'] }}</span></template></el-table-column>'
  }).join('\n')

  const height = maxHeight === 'auto' ? '600' : maxHeight.replace('px', '')
  const virtualScrollAttr = useVirtualScroll ? ' :virtual-scroll="true" :virtual-scroll-item-size="48"' : ''

  return '<div class="list-component"><el-table :data="getListData(\'' + component.id + '\')" :height="' + height + '"' + virtualScrollAttr + ' class="custom-list-table" @sort-change="(e) => handleListSort(\'' + component.id + '\', e)" border>' + columnsHtml + '</el-table></div>'
}
