<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import BpmnWorkflow from './BpmnWorkflow.vue'

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

interface Workflow {
  id: string
  name: string
  category: string
  status: string
  createTime: string
  creator: string
  xml: string
  nodeConfigs?: NodeConfig[]
}

interface User {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'disabled'
  createTime: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  users: string[]
}

interface Department {
  id: string
  name: string
  parentId: string | null
  children?: Department[]
}

interface TaskOperation {
  id: string
  workflowId: string
  workflowName: string
  taskName: string
  applicant: string
  applyTime: string
  currentNode: string
  status: string
  assignee: string
}

const activeTab = ref<'designer' | 'workflow' | 'tasks' | 'roles' | 'users' | 'departments'>('designer')
const selectedWorkflowId = ref<string | null>(null)
const currentXml = ref('')
const workflowMode = ref<'view' | 'edit'>('edit')
const selectedUserId = ref<string>('')
const addUserId = ref<string>('')

const showRoleDialog = ref(false)
const showRoleMemberDialog = ref(false)
const showUserDialog = ref(false)
const showDeptDialog = ref(false)
const showDeptDeleteDialog = ref(false)
const showRemoveMemberConfirm = ref(false)
const showAddTaskDialog = ref(false)
const showViewWorkflowDialog = ref(false)
const viewWorkflowData = ref<Workflow | null>(null)
const showPublishDialog = ref(false)
const publishForm = reactive({
  name: '',
  category: ''
})
const showHtmlPreviewDialog = ref(false)
const htmlPreviewContent = ref('')
const importFileRef = ref<HTMLInputElement | null>(null)

const editRole = ref<Role | null>(null)
const currentRoleForMembers = ref<Role | null>(null)
const deleteRoleWithUsers = ref<Role | null>(null)
const userToRemove = ref<User | null>(null)
const editUser = ref<User | null>(null)
const editDept = ref<Department | null>(null)
const deleteDept = ref<Department | null>(null)
const deptTreeRef = ref()

const newTaskForm = reactive({
  workflowId: '',
  applicant: '',
  taskName: ''
})

const departments = reactive<Department[]>([
  {
    id: 'd1',
    name: '总公司',
    parentId: null,
    children: [
      {
        id: 'd2',
        name: '技术部',
        parentId: 'd1',
        children: [
          { id: 'd21', name: '前端组', parentId: 'd2' },
          { id: 'd22', name: '后端组', parentId: 'd2' },
        ]
      },
      {
        id: 'd3',
        name: '销售部',
        parentId: 'd1',
        children: [
          { id: 'd31', name: '华东区', parentId: 'd3' },
          { id: 'd32', name: '华南区', parentId: 'd3' },
        ]
      },
      { id: 'd4', name: '人事部', parentId: 'd1' },
      { id: 'd5', name: '财务部', parentId: 'd1' },
      { id: 'd6', name: '总经办', parentId: 'd1' },
      { id: 'd7', name: '业务部', parentId: 'd1' },
    ]
  }
])

const deptSearchKeyword = ref('')

watch(deptSearchKeyword, async (val) => {
  await nextTick()
  if (deptTreeRef.value) {
    deptTreeRef.value.filter(val)
  }
})

const users = reactive<User[]>([
  { id: '1', name: '王经理', role: 'departmentLeader', department: '技术部', status: 'active', createTime: '2026-01-15' },
  { id: '2', name: '李主管', role: 'departmentLeader', department: '销售部', status: 'active', createTime: '2026-02-20' },
  { id: '3', name: '张HR', role: 'hrManager', department: '人事部', status: 'active', createTime: '2026-03-10' },
  { id: '4', name: '赵专员', role: 'hrManager', department: '人事部', status: 'disabled', createTime: '2026-04-05' },
  { id: '5', name: '刘总', role: 'generalManager', department: '总经办', status: 'active', createTime: '2026-01-01' },
  { id: '6', name: '孙财务', role: 'finance', department: '财务部', status: 'active', createTime: '2026-05-18' },
  { id: '7', name: '周会计', role: 'finance', department: '财务部', status: 'active', createTime: '2026-06-22' },
  { id: '8', name: '吴业务', role: 'business', department: '业务部', status: 'disabled', createTime: '2026-07-01' },
])

const roles = reactive<Role[]>([
  { 
    id: '1', 
    name: '部门负责人', 
    description: '负责部门内部审批', 
    permissions: ['approve_department'],
    users: ['1', '2']
  },
  { 
    id: '2', 
    name: '人事经理', 
    description: '负责人事相关审批', 
    permissions: ['approve_hr'],
    users: ['3', '4']
  },
  { 
    id: '3', 
    name: '总经理', 
    description: '负责最终审批', 
    permissions: ['approve_general'],
    users: ['5']
  },
  { 
    id: '4', 
    name: '财务人员', 
    description: '负责财务审核', 
    permissions: ['approve_finance'],
    users: ['6', '7']
  },
  { 
    id: '5', 
    name: '业务人员', 
    description: '负责业务审批', 
    permissions: ['approve_business'],
    users: ['8']
  },
])

const taskOperations = reactive<TaskOperation[]>([
  { id: '1', workflowId: '1', workflowName: '请假审批流程', taskName: '部门审批', applicant: '张三', applyTime: '2026-07-06 09:30', currentNode: '部门审批', status: '待审批', assignee: '王经理' },
  { id: '2', workflowId: '1', workflowName: '请假审批流程', taskName: '人事审批', applicant: '李四', applyTime: '2026-07-06 10:15', currentNode: '人事审批', status: '待审批', assignee: '张HR' },
  { id: '3', workflowId: '2', workflowName: '报销审批流程', taskName: '财务审核', applicant: '王五', applyTime: '2026-07-06 11:00', currentNode: '财务审核', status: '待审批', assignee: '孙财务' },
  { id: '4', workflowId: '1', workflowName: '请假审批流程', taskName: '总经理审批', applicant: '赵六', applyTime: '2026-07-06 14:00', currentNode: '总经理审批', status: '待审批', assignee: '刘总' },
  { id: '5', workflowId: '2', workflowName: '报销审批流程', taskName: '部门审批', applicant: '钱七', applyTime: '2026-07-06 15:30', currentNode: '部门审批', status: '待审批', assignee: '李主管' },
])

const workflows = reactive<Workflow[]>([
  {
    id: '1',
    name: '请假审批流程',
    category: '人事',
    status: '已发布',
    createTime: '2026-07-01',
    creator: '张三',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL http://www.omg.org/spec/BPMN/2.0/20100501/BPMN20.xsd http://www.omg.org/spec/BPMN/20100524/DI http://www.omg.org/spec/BPMN/2.0/20100501/BPMNDI.xsd"
             id="Definitions_1"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="LeaveApproval" name="请假审批流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="申请"/>
    <userTask id="UserTask_1" name="部门审批" camunda:assignee="departmentLeader"/>
    <exclusiveGateway id="ExclusiveGateway_1" name="审批判断"/>
    <userTask id="UserTask_2" name="人事审批" camunda:assignee="hrManager"/>
    <userTask id="UserTask_3" name="总经理审批" camunda:assignee="generalManager"/>
    <endEvent id="EndEvent_1" name="结束"/>
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1"/>
    <sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="ExclusiveGateway_1"/>
    <sequenceFlow id="Flow_3" sourceRef="ExclusiveGateway_1" targetRef="UserTask_2" name="<=3天"/>
    <sequenceFlow id="Flow_4" sourceRef="ExclusiveGateway_1" targetRef="UserTask_3" name=">3天"/>
    <sequenceFlow id="Flow_5" sourceRef="UserTask_2" targetRef="EndEvent_1"/>
    <sequenceFlow id="Flow_6" sourceRef="UserTask_3" targetRef="EndEvent_1"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="LeaveApproval">
      <bpmndi:BPMNShape id="BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="138" y="126" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_1" bpmnElement="UserTask_1">
        <dc:Bounds x="240" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_ExclusiveGateway_1" bpmnElement="ExclusiveGateway_1">
        <dc:Bounds x="390" y="116" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_2" bpmnElement="UserTask_2">
        <dc:Bounds x="490" y="40" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_3" bpmnElement="UserTask_3">
        <dc:Bounds x="490" y="180" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="640" y="126" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="174" y="144"/>
        <di:waypoint x="240" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="340" y="140"/>
        <di:waypoint x="390" y="141"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_3" bpmnElement="Flow_3">
        <di:waypoint x="415" y="116"/>
        <di:waypoint x="415" y="80"/>
        <di:waypoint x="490" y="80"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_4" bpmnElement="Flow_4">
        <di:waypoint x="415" y="166"/>
        <di:waypoint x="415" y="220"/>
        <di:waypoint x="490" y="220"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_5" bpmnElement="Flow_5">
        <di:waypoint x="590" y="80"/>
        <di:waypoint x="590" y="144"/>
        <di:waypoint x="640" y="144"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_6" bpmnElement="Flow_6">
        <di:waypoint x="590" y="220"/>
        <di:waypoint x="590" y="144"/>
        <di:waypoint x="640" y="144"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`,
    nodeConfigs: [
      { nodeId: 'UserTask_1', nodeName: '部门审批', assignees: ['王经理', '李主管'], status: 'completed', completedTime: '2026-07-06 09:30', operator: '王经理' },
      { nodeId: 'UserTask_2', nodeName: '人事审批', assignees: ['张HR', '赵专员'], status: 'current' },
      { nodeId: 'UserTask_3', nodeName: '总经理审批', assignees: ['刘总'], status: 'pending' }
    ]
  },
  {
    id: '2',
    name: '报销审批流程',
    category: '财务',
    status: '已发布',
    createTime: '2026-07-02',
    creator: '李四',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL http://www.omg.org/spec/BPMN/2.0/20100501/BPMN20.xsd http://www.omg.org/spec/BPMN/20100524/DI http://www.omg.org/spec/BPMN/2.0/20100501/BPMNDI.xsd"
             id="Definitions_1"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="ExpenseApproval" name="报销审批流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="申请"/>
    <userTask id="UserTask_1" name="部门审批" camunda:assignee="departmentLeader"/>
    <userTask id="UserTask_2" name="财务审核" camunda:assignee="finance"/>
    <endEvent id="EndEvent_1" name="结束"/>
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1"/>
    <sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="UserTask_2"/>
    <sequenceFlow id="Flow_3" sourceRef="UserTask_2" targetRef="EndEvent_1"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="ExpenseApproval">
      <bpmndi:BPMNShape id="BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="138" y="126" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_1" bpmnElement="UserTask_1">
        <dc:Bounds x="240" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_2" bpmnElement="UserTask_2">
        <dc:Bounds x="390" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="540" y="126" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="174" y="144"/>
        <di:waypoint x="240" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="340" y="140"/>
        <di:waypoint x="390" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_3" bpmnElement="Flow_3">
        <di:waypoint x="490" y="140"/>
        <di:waypoint x="540" y="144"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`,
    nodeConfigs: [
      { nodeId: 'UserTask_1', nodeName: '部门审批', assignees: ['李主管'], status: 'completed', completedTime: '2026-07-06 10:00', operator: '李主管' },
      { nodeId: 'UserTask_2', nodeName: '财务审核', assignees: ['孙财务', '周会计'], status: 'rejected', completedTime: '2026-07-06 11:30', operator: '孙财务' }
    ]
  },
  {
    id: '3',
    name: '采购申请流程',
    category: '采购',
    status: '草稿',
    createTime: '2026-07-03',
    creator: '王五',
    xml: ''
  },
  {
    id: '4',
    name: '合同审批流程',
    category: '法务',
    status: '已发布',
    createTime: '2026-07-04',
    creator: '赵六',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL http://www.omg.org/spec/BPMN/2.0/20100501/BPMN20.xsd http://www.omg.org/spec/BPMN/20100524/DI http://www.omg.org/spec/BPMN/2.0/20100501/BPMNDI.xsd"
             id="Definitions_1"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="ContractApproval" name="合同审批流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="发起"/>
    <userTask id="UserTask_1" name="业务审核" camunda:assignee="business"/>
    <userTask id="UserTask_2" name="法务审批" camunda:assignee="legal"/>
    <userTask id="UserTask_3" name="财务审批" camunda:assignee="finance"/>
    <endEvent id="EndEvent_1" name="完成"/>
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1"/>
    <sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="UserTask_2"/>
    <sequenceFlow id="Flow_3" sourceRef="UserTask_2" targetRef="UserTask_3"/>
    <sequenceFlow id="Flow_4" sourceRef="UserTask_3" targetRef="EndEvent_1"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="ContractApproval">
      <bpmndi:BPMNShape id="BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="138" y="126" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_1" bpmnElement="UserTask_1">
        <dc:Bounds x="240" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_2" bpmnElement="UserTask_2">
        <dc:Bounds x="390" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_UserTask_3" bpmnElement="UserTask_3">
        <dc:Bounds x="540" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="690" y="126" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="174" y="144"/>
        <di:waypoint x="240" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="340" y="140"/>
        <di:waypoint x="390" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_3" bpmnElement="Flow_3">
        <di:waypoint x="490" y="140"/>
        <di:waypoint x="540" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_4" bpmnElement="Flow_4">
        <di:waypoint x="640" y="140"/>
        <di:waypoint x="690" y="144"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`
  }
])

const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL http://www.omg.org/spec/BPMN/2.0/20100501/BPMN20.xsd http://www.omg.org/spec/BPMN/20100524/DI http://www.omg.org/spec/BPMN/2.0/20100501/BPMNDI.xsd"
             id="Definitions_1"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1" name="开始"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

currentXml.value = defaultXml

function editWorkflow(workflow: typeof workflows[0]) {
  selectedWorkflowId.value = workflow.id
  currentXml.value = workflow.xml || defaultXml
  workflowMode.value = 'edit'
  activeTab.value = 'designer'
}

function handleXmlChange(xml: string) {
  currentXml.value = xml
  if (selectedWorkflowId.value) {
    const workflow = workflows.find(w => w.id === selectedWorkflowId.value)
    if (workflow) {
      workflow.xml = xml
    }
  }
}

function handleNodeConfigChange(config: NodeConfig) {
  const workflow = getSelectedWorkflow()
  if (workflow && workflow.nodeConfigs) {
    const index = workflow.nodeConfigs.findIndex(n => n.nodeId === config.nodeId)
    if (index >= 0) {
      workflow.nodeConfigs[index] = config
    } else {
      workflow.nodeConfigs.push(config)
    }
  }
}

function createNewWorkflow() {
  selectedWorkflowId.value = null
  currentXml.value = defaultXml
  workflowMode.value = 'edit'
  activeTab.value = 'designer'
}

function saveWorkflow() {
  if (currentXml.value) {
    if (selectedWorkflowId.value) {
      const workflow = workflows.find(w => w.id === selectedWorkflowId.value)
      if (workflow) {
        workflow.xml = currentXml.value
        workflow.status = '草稿'
      }
    } else {
      const newWorkflow: Workflow = {
        id: String(Date.now()),
        name: '未命名流程',
        category: '未分类',
        status: '草稿',
        createTime: new Date().toISOString().split('T')[0],
        creator: '当前用户',
        xml: currentXml.value,
        nodeConfigs: []
      }
      workflows.push(newWorkflow)
      selectedWorkflowId.value = newWorkflow.id
    }
  }
}

function publishWorkflow() {
  if (selectedWorkflowId.value) {
    const workflow = workflows.find(w => w.id === selectedWorkflowId.value)
    if (workflow) {
      publishForm.name = workflow.name || ''
      publishForm.category = workflow.category || ''
      showPublishDialog.value = true
    }
  }
}

function confirmPublish() {
  if (!publishForm.name.trim()) {
    ElMessage.warning('请输入流程名称')
    return
  }
  
  const exists = workflows.some(w => w.id !== selectedWorkflowId.value && w.name === publishForm.name.trim())
  if (exists) {
    ElMessage.warning('流程名称已存在，请修改')
    return
  }
  
  if (selectedWorkflowId.value) {
    const workflow = workflows.find(w => w.id === selectedWorkflowId.value)
    if (workflow) {
      workflow.name = publishForm.name.trim()
      workflow.category = publishForm.category.trim() || '默认分类'
      workflow.status = '已发布'
      workflowMode.value = 'view'
    }
  }
  showPublishDialog.value = false
  ElMessage.success('流程发布成功')
}

function previewHtml() {
  if (selectedWorkflowId.value) {
    const workflow = workflows.find(w => w.id === selectedWorkflowId.value)
    if (workflow) {
      const formattedXml = workflow.xml.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      htmlPreviewContent.value = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${workflow.name} - BPMN代码预览</title>
          <style>
            body { margin: 0; padding: 20px; background: #f5f5f5; font-family: monospace; font-size: 13px; }
            .preview-container { max-width: 100%; background: #1e1e1e; padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.3); overflow-x: auto; }
            .xml-content { color: #d4d4d4; white-space: pre-wrap; word-wrap: break-word; }
            .tag { color: #569cd6; }
            .attr-name { color: #9cdcfe; }
            .attr-value { color: #ce9178; }
            .comment { color: #6a9955; }
            h2 { color: #4ec9b0; margin-top: 0; }
            p { color: #858585; }
          </style>
        </head>
        <body>
          <div class="preview-container">
            <h2>${workflow.name}</h2>
            <p>分类：${workflow.category} | 状态：${workflow.status}</p>
            <hr style="border: 1px solid #333;">
            <div class="xml-content">${formattedXml}</div>
          </div>
        </body>
        </html>
      `
      showHtmlPreviewDialog.value = true
    }
  }
}

function importBpmn() {
  importFileRef.value?.click()
}

function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const xml = e.target?.result as string
    currentXml.value = xml
    publishForm.name = ''
    publishForm.category = ''
    ElMessage.success('BPMN文件导入成功')
  }
  reader.readAsText(file)
  target.value = ''
}

function getSelectedWorkflow() {
  return workflows.find(w => w.id === selectedWorkflowId.value)
}

const filteredTaskOperations = computed(() => {
  if (!selectedUserId.value) return taskOperations
  const user = users.find(u => u.id === selectedUserId.value)
  if (!user) return taskOperations
  
  return taskOperations.filter(t => {
    if (t.assignee === user.name) return true
    
    const workflow = workflows.find(w => w.id === t.workflowId)
    if (!workflow || !workflow.nodeConfigs) return false
    
    const currentNodeConfig = workflow.nodeConfigs.find(c => c.status === 'current')
    if (!currentNodeConfig) return false
    
    if (currentNodeConfig.role && currentNodeConfig.role === user.role) return true
    
    if (currentNodeConfig.department && currentNodeConfig.department === user.department) return true
    
    if (currentNodeConfig.assignees && currentNodeConfig.assignees.includes(user.name)) return true
    
    return false
  })
})

const selectedUser = computed(() => {
  return users.find(u => u.id === selectedUserId.value)
})

function approveOperation(task: typeof taskOperations[0]) {
  const index = taskOperations.findIndex(t => t.id === task.id)
  if (index >= 0) {
    taskOperations[index].status = '已审批'
    
    const workflow = workflows.find(w => w.id === task.workflowId)
    if (workflow && workflow.nodeConfigs) {
      let hasCurrent = false
      workflow.nodeConfigs.forEach(config => {
        if (config.status === 'current') {
          config.status = 'completed'
          config.completedTime = new Date().toLocaleString()
          hasCurrent = true
        }
      })
      
      if (hasCurrent) {
        workflow.nodeConfigs.forEach(config => {
          if (config.status === 'pending') {
            config.status = 'current'
            taskOperations[index].currentNode = config.nodeName
            return
          }
        })
      }
    }
  }
}

function rejectOperation(task: typeof taskOperations[0]) {
  const index = taskOperations.findIndex(t => t.id === task.id)
  if (index >= 0) {
    taskOperations[index].status = '已驳回'
    
    const workflow = workflows.find(w => w.id === task.workflowId)
    if (workflow && workflow.nodeConfigs) {
      workflow.nodeConfigs.forEach(config => {
        if (config.status === 'current') {
          config.status = 'rejected'
          config.completedTime = new Date().toLocaleString()
        }
      })
    }
  }
}

function viewTaskWorkflow(task: typeof taskOperations[0]) {
  const workflow = workflows.find(w => w.id === task.workflowId)
  if (workflow) {
    viewWorkflowData.value = workflow
    showViewWorkflowDialog.value = true
  }
}

function deleteRole(role: Role) {
  if (role.users.length > 0) {
    currentRoleForMembers.value = role
    deleteRoleWithUsers.value = role
    showRoleMemberDialog.value = true
  } else {
    const index = roles.findIndex(r => r.id === role.id)
    if (index >= 0) {
      roles.splice(index, 1)
    }
  }
}

function removeUserFromRole(role: Role, userId: string) {
  const index = role.users.findIndex(u => u === userId)
  if (index >= 0) {
    role.users.splice(index, 1)
  }
}

function getRoleUsers(role: Role) {
  return users.filter(u => role.users.includes(u.id))
}

function toggleUserStatus(user: User) {
  user.status = user.status === 'active' ? 'disabled' : 'active'
}

function deleteUser(user: User) {
  const index = users.findIndex(u => u.id === user.id)
  if (index >= 0) {
    users.splice(index, 1)
  }
}

function openRoleDialog(role?: Role) {
  if (role) {
    editRole.value = { ...role, users: [...role.users], permissions: [...role.permissions] }
  } else {
    editRole.value = { id: '', name: '', description: '', permissions: [], users: [] }
  }
  showRoleDialog.value = true
}

function saveRole() {
  if (editRole.value) {
    const existingRole = roles.find(r => r.id === editRole.value!.id && editRole.value!.id)
    if (existingRole) {
      Object.assign(existingRole, editRole.value)
    } else {
      editRole.value.id = String(Date.now())
      roles.push(editRole.value)
    }
    showRoleDialog.value = false
  }
}

function handleAddRoleUser() {
  if (editRole.value && addUserId.value) {
    if (!editRole.value.users.includes(addUserId.value)) {
      editRole.value.users.push(addUserId.value)
    }
    addUserId.value = ''
  }
}

function viewRoleUsers(role: Role) {
  currentRoleForMembers.value = role
  deleteRoleWithUsers.value = null
  showRoleMemberDialog.value = true
}

function confirmRemoveMember(user: User) {
  userToRemove.value = user
  showRemoveMemberConfirm.value = true
}

function doRemoveMember() {
  if (userToRemove.value && currentRoleForMembers.value) {
    removeUserFromRole(currentRoleForMembers.value, userToRemove.value.id)
    if (currentRoleForMembers.value.users.length === 0 && deleteRoleWithUsers.value) {
      showRoleMemberDialog.value = false
      const index = roles.findIndex(r => r.id === currentRoleForMembers.value!.id)
      if (index >= 0) {
        roles.splice(index, 1)
      }
    }
    showRemoveMemberConfirm.value = false
    userToRemove.value = null
  }
}

function openUserDialog(user?: User) {
  if (user) {
    editUser.value = { ...user }
  } else {
    editUser.value = { id: '', name: '', role: '', department: '', status: 'active', createTime: '' }
  }
  showUserDialog.value = true
}

function saveUser() {
  if (editUser.value) {
    const existingUser = users.find(u => u.id === editUser.value!.id && editUser.value!.id)
    if (existingUser) {
      Object.assign(existingUser, editUser.value)
    } else {
      editUser.value.id = String(Date.now())
      editUser.value.createTime = new Date().toISOString().split('T')[0]
      users.push(editUser.value)
    }
    showUserDialog.value = false
  }
}

function getAllDeptNames(): string[] {
  const names: string[] = []
  const traverse = (depts: Department[]) => {
    depts.forEach(dept => {
      names.push(dept.name)
      if (dept.children) traverse(dept.children)
    })
  }
  traverse(departments)
  return names
}

function getAllDepts(): Department[] {
  const allDepts: Department[] = []
  const traverse = (depts: Department[]) => {
    depts.forEach(dept => {
      allDepts.push(dept)
      if (dept.children) traverse(dept.children)
    })
  }
  traverse(departments)
  return allDepts
}

function getAllDeptOptions() {
  return getAllDepts().map(dept => ({
    id: dept.id,
    name: dept.name
  }))
}

function openDeptDialog(dept?: Department) {
  if (dept) {
    editDept.value = { ...dept }
  } else {
    editDept.value = { id: '', name: '', parentId: null }
  }
  showDeptDialog.value = true
}

function saveDept() {
  if (editDept.value) {
    const findDeptById = (depts: Department[], id: string): Department | null => {
      for (const dept of depts) {
        if (dept.id === id) return dept
        if (dept.children) {
          const found = findDeptById(dept.children, id)
          if (found) return found
        }
      }
      return null
    }

    const existingDept = findDeptById(departments, editDept.value!.id)
    if (existingDept) {
      existingDept.name = editDept.value!.name
      existingDept.parentId = editDept.value!.parentId
    } else {
      editDept.value.id = 'd' + Date.now()
      if (editDept.value.parentId) {
        const parent = findDeptById(departments, editDept.value.parentId)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(editDept.value!)
        }
      } else {
        departments.push(editDept.value!)
      }
    }
    showDeptDialog.value = false
  }
}

function confirmDeleteDept(dept: Department) {
  deleteDept.value = dept
  showDeptDeleteDialog.value = true
}

function getDeptUsers(deptId: string): User[] {
  const deptNames = new Set<string>()
  const getDeptName = (depts: Department[], id: string): string | null => {
    for (const dept of depts) {
      if (dept.id === id) return dept.name
      if (dept.children) {
        const found = getDeptName(dept.children, id)
        if (found) return found
      }
    }
    return null
  }

  const traverseDepts = (depts: Department[]) => {
    depts.forEach(dept => {
      if (dept.id === deptId || dept.parentId === deptId) {
        const name = getDeptName(departments, dept.id)
        if (name) deptNames.add(name)
      }
      if (dept.children) traverseDepts(dept.children)
    })
  }
  traverseDepts(departments)

  return users.filter(u => deptNames.has(u.department))
}

function isChild(childId: string, parentId: string): boolean {
  if (childId === parentId) return true
  const findParent = (depts: Department[], id: string): Department | null => {
    for (const dept of depts) {
      if (dept.id === id) return dept
      if (dept.children) {
        const found = findParent(dept.children, id)
        if (found) return found
      }
    }
    return null
  }

  const child = findParent(departments, childId)
  if (child && child.parentId) {
    return isChild(child.parentId, parentId)
  }
  return false
}

function doDeleteDept() {
  if (deleteDept.value) {
    const removeDept = (depts: Department[]): boolean => {
      const index = depts.findIndex(d => d.id === deleteDept.value!.id)
      if (index >= 0) {
        depts.splice(index, 1)
        return true
      }
      for (const dept of depts) {
        if (dept.children && removeDept(dept.children)) {
          return true
        }
      }
      return false
    }
    removeDept(departments)
    showDeptDeleteDialog.value = false
  }
}

function filterDeptNode(value: string, data: Department): boolean {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase())
}

function handleDeptClick() {
}

function handleDeptContextMenu(event: MouseEvent) {
  event.preventDefault()
}

function addTaskOperation() {
  newTaskForm.workflowId = ''
  newTaskForm.applicant = ''
  newTaskForm.taskName = ''
  showAddTaskDialog.value = true
}

function confirmAddTask() {
  if (!selectedUserId.value) {
    ElMessage.warning('请先选择登录人')
    return
  }
  if (!newTaskForm.workflowId) {
    ElMessage.warning('请选择流程类型')
    return
  }
  const workflow = workflows.find(w => w.id === newTaskForm.workflowId)
  if (!workflow) {
    ElMessage.warning('选择的流程不存在')
    return
  }
  
  const assignee = selectedUser.value?.name || ''
  const newTask: TaskOperation = {
    id: String(Date.now()),
    workflowId: newTaskForm.workflowId,
    workflowName: workflow.name,
    taskName: newTaskForm.taskName || '审批任务',
    applicant: newTaskForm.applicant || '新申请人',
    applyTime: new Date().toLocaleString(),
    currentNode: '开始',
    status: '待审批',
    assignee: assignee
  }
  taskOperations.push(newTask)
  showAddTaskDialog.value = false
  
  if (workflow.nodeConfigs) {
    workflow.nodeConfigs.forEach(config => {
      config.status = 'pending'
    })
  }
}

function deleteTaskOperation(task: TaskOperation) {
  const index = taskOperations.findIndex(t => t.id === task.id)
  if (index >= 0) {
    taskOperations.splice(index, 1)
  }
}
</script>

<template>
  <div class="bpmn-demo">
    <div class="demo-header">
      <h2>BPM工作流管理</h2>
      <p>基于 bpmn-js 的工作流设计与管理系统</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="demo-tabs">
      <el-tab-pane label="流程设计器" name="designer">
        <div class="tab-content">
          <div class="designer-header">
            <div class="header-info">
              <el-tag v-if="getSelectedWorkflow()" type="info">
                正在编辑: {{ getSelectedWorkflow()?.name }}
              </el-tag>
              <el-tag v-else type="warning">新建流程</el-tag>
            </div>
            <div class="header-actions">
              <el-button size="small" @click="createNewWorkflow">
                <i class="el-icon-plus"></i>
                新建
              </el-button>
              <el-button size="small" type="warning" v-if="workflowMode === 'edit'" @click="saveWorkflow">
                <i class="el-icon-save"></i>
                保存
              </el-button>
              <el-button size="small" type="primary" v-if="selectedWorkflowId && workflowMode === 'edit'" @click="publishWorkflow">
                <i class="el-icon-check"></i>
                发布流程
              </el-button>
              <el-button size="small" type="success" v-if="selectedWorkflowId" @click="workflowMode = 'view'">
                <i class="el-icon-view"></i>
                预览
              </el-button>
              <el-button size="small" type="info" v-if="selectedWorkflowId" @click="previewHtml">
                <i class="el-icon-document"></i>
                HTML预览
              </el-button>
              <el-button size="small" v-if="workflowMode === 'edit'" @click="importBpmn">
                <i class="el-icon-upload"></i>
                导入BPMN
              </el-button>
            </div>
          </div>
          <div class="workflow-wrapper">
            <BpmnWorkflow :xml="currentXml" :mode="workflowMode" :node-configs="getSelectedWorkflow()?.nodeConfigs" :roles="roles" :departments="getAllDeptOptions()" :users="users" @xml-change="handleXmlChange" @node-config-change="handleNodeConfigChange" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="工作流管理" name="workflow">
        <div class="workflow-content">
          <div class="card-header">
            <span>管理全局流程配置，所有用户可使用的流程定义</span>
            <el-button type="primary" @click="createNewWorkflow">
              <i class="el-icon-plus"></i>
              新建流程
            </el-button>
          </div>

          <el-table :data="workflows" border max-height="500">
            <el-table-column prop="name" label="流程名称" />
            <el-table-column prop="category" label="分类" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status === '已发布' ? 'success' : 'warning'">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" />
            <el-table-column prop="creator" label="创建人" />
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status !== '已发布'" size="small" type="primary" @click="editWorkflow(row)">编辑</el-button>
                <el-button v-if="row.status !== '已发布'" size="small" type="success" @click="selectedWorkflowId = row.id; publishWorkflow()">发布</el-button>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="任务操作" name="tasks">
        <div class="workflow-content">
          <div class="user-select-section">
            <span class="select-label">选择登录人：</span>
            <el-select v-model="selectedUserId" placeholder="请选择用户" class="user-select">
              <el-option label="全部用户" value="" />
              <el-option v-for="user in users" :key="user.id" :label="user.name + ' (' + user.department + ')'" :value="user.id" />
            </el-select>
            <el-tag v-if="selectedUser" type="info">
              当前操作人：{{ selectedUser.name }}
            </el-tag>
          </div>

          <div class="card-header" style="margin-top: 16px;">
            <span>当前用户的所有流程操作列表</span>
            <el-button type="primary" @click="addTaskOperation">
              <i class="el-icon-plus"></i>
              新增任务
            </el-button>
          </div>

          <el-table :data="filteredTaskOperations" border max-height="400">
            <el-table-column prop="workflowName" label="流程名称" />
            <el-table-column prop="currentNode" label="当前节点" />
            <el-table-column prop="applicant" label="申请人" />
            <el-table-column prop="applyTime" label="申请时间" />
            <el-table-column prop="assignee" label="处理人" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status === '待审批' ? 'warning' : row.status === '已审批' ? 'success' : 'danger'">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewTaskWorkflow(row)">查看流程</el-button>
                <el-button size="small" type="success" :disabled="row.status !== '待审批'" @click="approveOperation(row)">通过</el-button>
                <el-button size="small" type="danger" :disabled="row.status !== '待审批'" @click="rejectOperation(row)">驳回</el-button>
                <el-button size="small" type="danger" @click="deleteTaskOperation(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="角色管理" name="roles">
        <div class="workflow-content">
          <div class="card-header">
            <span>管理系统角色和权限，批量分配审批人员</span>
            <el-button type="primary" @click="openRoleDialog()">
              <i class="el-icon-plus"></i>
              新增角色
            </el-button>
          </div>

          <el-table :data="roles" border max-height="500">
            <el-table-column prop="name" label="角色名称" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="permissions" label="权限">
              <template #default="{ row }">
                <el-tag v-for="(perm, idx) in row.permissions" :key="idx" size="small">
                  {{ perm }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="成员数量" width="100">
              <template #default="{ row }">
                {{ row.users.length }}人
              </template>
            </el-table-column>
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openRoleDialog(row)">编辑</el-button>
                <el-button size="small" @click="viewRoleUsers(row)">查看成员</el-button>
                <el-button size="small" type="danger" @click="deleteRole(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="用户管理" name="users">
        <div class="workflow-content">
          <div class="card-header">
            <span>管理系统用户，设置用户状态及角色分配</span>
            <el-button type="primary" @click="openUserDialog()">
              <i class="el-icon-plus"></i>
              新增用户
            </el-button>
          </div>

          <el-table :data="users" border max-height="500">
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="role" label="角色标识" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" />
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openUserDialog(row)">编辑</el-button>
                <el-button 
                  size="small" 
                  :type="row.status === 'active' ? 'danger' : 'success'" 
                  @click="toggleUserStatus(row)"
                >
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button size="small" type="danger" @click="deleteUser(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="部门管理" name="departments">
        <div class="workflow-content">
          <div class="card-header">
            <span>管理部门组织结构，支持树形层级</span>
            <el-input v-model="deptSearchKeyword" placeholder="搜索部门名称" size="small" style="width: 200px; margin-right: 10px;" />
            <el-button type="primary" @click="openDeptDialog()">
              <i class="el-icon-plus"></i>
              新增部门
            </el-button>
          </div>

          <el-tree
            ref="deptTreeRef"
            :data="departments"
            :props="{ label: 'name', children: 'children' }"
            :filter-node-method="filterDeptNode"
            default-expand-all
            :indent="24"
            @node-click="handleDeptClick"
            @node-contextmenu="handleDeptContextMenu"
          >
            <template #default="{ node, data }">
              <span class="dept-tree-node">
                <span>{{ node.label }}</span>
                <span class="dept-tree-actions">
                  <el-button size="mini" @click.stop="openDeptDialog(data)">编辑</el-button>
                  <el-button size="mini" type="danger" @click.stop="confirmDeleteDept(data)">删除</el-button>
                </span>
              </span>
            </template>
          </el-tree>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog :title="editRole ? '编辑角色' : '新增角色'" v-model="showRoleDialog" width="500px">
      <el-form :model="editRole || {}" label-width="80px">
        <el-form-item label="角色名称">
          <el-input v-model="(editRole || {}).name" />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input v-model="(editRole || {}).description" type="textarea" />
        </el-form-item>
        <el-form-item label="权限">
          <el-select v-model="(editRole || {}).permissions" multiple placeholder="请选择权限">
            <el-option label="部门审批" value="approve_department" />
            <el-option label="人事审批" value="approve_hr" />
            <el-option label="总经理审批" value="approve_general" />
            <el-option label="财务审批" value="approve_finance" />
            <el-option label="业务审批" value="approve_business" />
          </el-select>
        </el-form-item>
        <el-form-item label="成员列表">
          <div v-if="editRole">
            <el-tag
              v-for="user in getRoleUsers(editRole)"
              :key="user.id"
              closable
              @close="removeUserFromRole(editRole!, user.id)"
            >
              {{ user.name }}
            </el-tag>
          </div>
          <el-select v-model="addUserId" placeholder="添加成员" @change="handleAddRoleUser">
            <el-option
              v-for="user in users.filter(u => !editRole?.users.includes(u.id))"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog :title="editUser ? '编辑用户' : '新增用户'" v-model="showUserDialog" width="500px">
      <el-form :model="editUser || {}" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="(editUser || {}).name" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="(editUser || {}).department" placeholder="请选择部门">
            <el-option v-for="dept in getAllDeptNames()" :key="dept" :label="dept" :value="dept" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="(editUser || {}).role" placeholder="请选择角色">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="(editUser || {}).status">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUserDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog :title="editDept ? '编辑部门' : '新增部门'" v-model="showDeptDialog" width="400px">
      <el-form :model="editDept || {}" label-width="80px">
        <el-form-item label="部门名称">
          <el-input v-model="(editDept || {}).name" />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-select v-model="(editDept || {}).parentId" placeholder="请选择上级部门">
            <el-option label="无（顶级部门）" :value="null" />
            <template v-for="dept in getAllDepts()" :key="dept.id">
              <el-option 
                :label="'└── ' + dept.name" 
                :value="dept.id"
                :disabled="editDept && isChild(dept.id, editDept.id)"
              />
            </template>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDeptDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDept">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog title="删除部门确认" v-model="showDeptDeleteDialog" width="400px">
      <div v-if="deleteDept">
        <p>确定要删除部门「{{ deleteDept.name }}」吗？</p>
        <div v-if="getDeptUsers(deleteDept.id).length > 0">
          <p style="color: #f56c6c; margin-top: 10px;">该部门下存在用户，无法删除：</p>
          <ul>
            <li v-for="user in getDeptUsers(deleteDept.id)" :key="user.id">
              {{ user.name }}
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDeptDeleteDialog = false">取消</el-button>
        <el-button 
          type="danger" 
          :disabled="deleteDept && getDeptUsers(deleteDept.id).length > 0" 
          @click="doDeleteDept"
        >
          确认删除
        </el-button>
      </template>
    </el-dialog>

    <el-dialog title="角色成员列表" v-model="showRoleMemberDialog" width="500px">
      <div v-if="currentRoleForMembers">
        <p v-if="deleteRoleWithUsers && currentRoleForMembers.users.length > 0" style="color: #f56c6c; margin-bottom: 16px;">
          该角色下存在用户，无法删除，请先移除成员：
        </p>
        <el-table :data="getRoleUsers(currentRoleForMembers)" border max-height="300">
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="department" label="部门" />
          <el-table-column prop="role" label="角色标识" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="confirmRemoveMember(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showRoleMemberDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog title="确认删除成员" v-model="showRemoveMemberConfirm" width="400px">
      <p v-if="userToRemove">确定要将用户「{{ userToRemove.name }}」从该角色中移除吗？</p>
      <template #footer>
        <el-button @click="showRemoveMemberConfirm = false">取消</el-button>
        <el-button type="danger" @click="doRemoveMember">确认移除</el-button>
      </template>
    </el-dialog>

    <el-dialog title="新增任务" v-model="showAddTaskDialog" width="450px">
      <el-form :model="newTaskForm" label-width="80px">
        <el-form-item label="流程类型" required>
          <el-select v-model="newTaskForm.workflowId" placeholder="请选择流程类型">
            <el-option v-for="wf in workflows" :key="wf.id" :label="wf.name" :value="wf.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务名称">
          <el-input v-model="newTaskForm.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="申请人">
          <el-input v-model="newTaskForm.applicant" placeholder="请输入申请人姓名" />
        </el-form-item>
        <el-form-item label="处理人">
          <el-tag type="info">{{ selectedUser?.name || '未选择' }}</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTaskDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddTask">确认新增</el-button>
      </template>
    </el-dialog>

    <el-dialog title="流程详情" v-model="showViewWorkflowDialog" width="800px" top="5vh">
      <div v-if="viewWorkflowData" class="workflow-view-container">
        <BpmnWorkflow :xml="viewWorkflowData.xml" mode="view" :node-configs="viewWorkflowData.nodeConfigs" :roles="roles" :departments="getAllDeptOptions()" :users="users" />
      </div>
      <template #footer>
        <el-button @click="showViewWorkflowDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog title="发布流程" v-model="showPublishDialog" width="450px">
      <el-form :model="publishForm" label-width="80px">
        <el-form-item label="流程名称" required>
          <el-input v-model="publishForm.name" placeholder="请输入流程名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="publishForm.category" placeholder="请输入流程分类" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPublishDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmPublish">确认发布</el-button>
      </template>
    </el-dialog>

    <el-dialog title="HTML预览" v-model="showHtmlPreviewDialog" width="900px" top="5vh">
      <iframe :srcdoc="htmlPreviewContent" style="width: 100%; height: 600px; border: 1px solid #ebeef5;" />
      <template #footer>
        <el-button @click="showHtmlPreviewDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <input ref="importFileRef" type="file" accept=".bpmn,.xml" style="display: none" @change="handleImportFile" />
  </div>
</template>

<style lang="scss" scoped>
.bpmn-demo {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  flex-shrink: 0;

  h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
  }

  p {
    margin: 0;
    opacity: 0.8;
  }
}

.demo-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

:deep(.el-tab-pane) {
  height: 100%;
}

.tab-content {
  height: calc(100% - 56px);
  display: flex;
  flex-direction: column;
}

.designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.workflow-wrapper {
  flex: 1;
  overflow: hidden;
}

.workflow-content {
  height: calc(100% - 56px);
  overflow: auto;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.preview-label {
  font-size: 13px;
  color: #909399;
}

.preview-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

:deep(.el-card) {
  margin-bottom: 16px;
}

:deep(.el-card__body) {
  padding: 12px;
}

:deep(.el-table) {
  font-size: 13px;
  
  th {
    background-color: #fafafa;
    font-weight: 600;
    color: #303133;
  }
  
  td {
    padding: 10px 12px;
  }
}

:deep(.el-card__header) {
  padding: 12px 16px;
  flex-shrink: 0;
}

.user-select-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
}

.select-label {
  font-size: 14px;
  color: #606266;
}

.user-select {
  width: 200px;
}

.role-select {
  width: 100%;
  margin-bottom: 16px;
}

.role-members {
  h4 {
    margin: 16px 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.dept-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 0;
}

.dept-tree-actions {
  display: flex;
  gap: 4px;
}

:deep(.el-tree-node__content) {
  padding: 10px 0 !important;
}

:deep(.el-tree-node) {
  margin: 4px 0;
}

:deep(.el-tree) {
  position: relative;
}

:deep(.el-tree-node) {
  position: relative;
  padding-left: 24px;
}

:deep(.el-tree-node::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 26px;
  width: 1px;
  height: calc(100% - 26px);
  border-left: 1px dashed #d9d9d9;
}

:deep(.el-tree-node::after) {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  width: 18px;
  height: 1px;
  border-top: 1px dashed #d9d9d9;
}

:deep(.el-tree-node:first-child::before) {
  top: 26px;
}

:deep(.el-tree-node:last-child::before) {
  height: 12px;
}

:deep(.el-tree-node__children) {
  padding-left: 0;
}

:deep(.el-tree-node__children .el-tree-node) {
  padding-left: 24px;
}

.workflow-view-container {
  height: 500px;
}
</style>