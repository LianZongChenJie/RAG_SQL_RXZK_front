<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { chatWithQwenStream, type ChatParams } from "@/api";
import { saveQuestion } from "@/api/sqlRag";
import { getCookie } from "@/utils/http";
import EChartsRenderer from "@/components/EChartsRenderer.vue";
import DynamicTable from "@/components/DynamicTable.vue";
import { type DataSetItemResponse, type MetricMenuItem } from "@/api/sourceApi";

interface Message {
  role: "user" | "assistant";
  content: string;
  chartOption?: Record<string, any>;
  tableData?: { columns: any[]; data: any[] } | { columns: any[]; data: any[] }[];
}

const props = defineProps<{
  selectedValue: DataSetItemResponse | null;
  quickSelectItems: MetricMenuItem | null;
  researchLeafItem: MetricMenuItem | null;
  title: string;
  lOrgId: string | null;
  // 调研数据快速导航传递的标题和选项列表
  researchStrTitleList?: string[];
  researchStrOptionList?: string[];
}>();

const emit = defineEmits<{
  (e: "save-complete"): void;
}>();

const messages = ref<Message[]>([
  { role: "assistant", content: "你好！我是千问智能体，有什么可以帮你的吗？" },
]);
const inputText = ref("");
const loading = ref(false);
const streaming = ref(false);
const currentStreamText = ref("");
const progressMessage = ref("");
const chatContainer = ref<HTMLElement | null>(null);

// 选中的快捷导航名称
const selectedNavName = computed(() => {
  if (props.quickSelectItems?.strName) {
    return props.quickSelectItems.strName;
  }
  if (props.researchLeafItem?.strName) {
    return props.researchLeafItem.strName;
  }
  return "";
});

// 切换导航时清空输入框
watch(
  () => props.quickSelectItems,
  () => {
    inputText.value = "";
  }
);

watch(
  () => props.researchLeafItem,
  () => {
    inputText.value = "";
  }
);

let cancelStream: (() => void) | null = null;
let currentGeneratedSql = "";
let currentChartData = "";
let currentTableData = "";

function scrollToBottom() {
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  }, 50);
}

async function sendMessage() {
  // 检查是否选中了快捷导航
  const navName = props.quickSelectItems?.strName || props.researchLeafItem?.strName || "";
  if (!navName) {
    ElMessage.error("请选择一个快捷导航");
    return;
  }

  const text = inputText.value.trim();
  if (loading.value || streaming.value) return;

  const lId = props.selectedValue?.lId ?? "";
  const lQuestionnaireId = props.selectedValue?.lQuestionnaireId ?? "";
  const snapshotId = props.selectedValue?.lSnapshotId ?? "";
  const lRespondentId = props.selectedValue?.lRespondentId ?? "";
  const strTitleList = props.selectedValue?.strTitleList ?? "";
  const strOptionList = props.selectedValue?.strOptionList ?? "";
  const lOrgId = props.lOrgId ?? "";
  if (!lId && !lQuestionnaireId) {
    ElMessage.error("请选择一个有效数据集");
    return;
  }
  const dbName = props.selectedValue?.strDbName ?? "";
  if (!dbName) {
    ElMessage.error("请选择一个数据集");
    return;
  }
  const dbType = props.selectedValue?.nType;
  if (dbType !== undefined && ![1, 2, 3].includes(Number(dbType))) {
    ElMessage.error("数据集类型不支持，请选择调研数据集或客观数据集");
    return;
  }

  const nType = Number(dbType);
  let requestParams: ChatParams = { dbName, dbType, message: navName, messageDesc: text };

  if (nType === 1) {
    requestParams = {
      ...requestParams,
      tableName: props.selectedValue?.strTableName ?? "",
      lId,
      code: props.quickSelectItems?.strCode ?? "",
      sqlStr: props.quickSelectItems?.sqlStr ?? "",
      outType: props.quickSelectItems?.strOutType ?? "",
    };
  } else if (nType === 2 || nType === 3) {
    if (!lQuestionnaireId) {
      ElMessage.error("调研数据需要 lQuestionnaireId");
      return;
    }
    if (!snapshotId) {
      ElMessage.error("调研数据需要快照Id");
      return;
    }
    if (!lRespondentId) {
      ElMessage.error("调研数据需要调研对象Id");
      return;
    }
    // if (!strTitleList) {
    //   ElMessage.error("调研数据需要调研组合单选选项不能为空");
    //   return;
    // }
    // if (!strOptionList) {
    //   ElMessage.error("调研数据需要调研单选五维不能为空");
    //   return;
    // }
    if (!lOrgId) {
      ElMessage.error("调研数据需要组织Id");
      return;
    }
    // 优先使用快速导航传递的值，直接传数组
    requestParams = {
      ...requestParams,
      tableName: props.researchLeafItem?.strFullTableName ?? "",
      lQuestionnaireId,
      snapshotId,
      lRespondentId,
      strTitleList: props.researchStrTitleList?.length ? props.researchStrTitleList : undefined,
      strOptionList: props.researchStrOptionList?.length ? props.researchStrOptionList : undefined,
      lOrgId,
      strAnswerColumn: props.researchLeafItem?.strAnswerColumn ?? "",
      strType: props.researchLeafItem?.strType ?? "",
      strDesc: props.researchLeafItem?.strDesc ?? "",
      strName: props.researchLeafItem?.strName ?? "",
    };
  }

  messages.value.push({ role: "user", content: text });
  scrollToBottom();

  streaming.value = true;
  currentStreamText.value = "";
  progressMessage.value = "";
  currentGeneratedSql = "";
  currentChartData = "";
  currentTableData = "";

  messages.value.push({ role: "assistant", content: "" });
  const assistantIndex = messages.value.length - 1;

  cancelStream = chatWithQwenStream(requestParams, {
    onProgress: (msg: string) => {
      progressMessage.value = msg;
      scrollToBottom();
    },
    onMessage: (content: string) => {
      progressMessage.value = "";
      currentStreamText.value += content;
      scrollToBottom();
    },
    onChart: (chartData: Record<string, any>) => {
      console.log("[ChatPanel] onChart called, data keys:", Object.keys(chartData));
      const msg = messages.value[assistantIndex];
      if (msg) {
        msg.chartOption = chartData;
      }
      currentChartData = JSON.stringify(chartData);
    },
    onTableData: (tableData: any) => {
      const msg = messages.value[assistantIndex];
      console.log("[ChatPanel] onTableData called, data keys:", Object.keys(tableData));
      if (msg) {
        msg.tableData = tableData;
      }
      currentTableData = JSON.stringify(tableData);
    },
    onGeneratedSql: (sql: string) => {
      currentGeneratedSql = sql;
    },
    onComplete: () => {
      const msg = messages.value[assistantIndex];
      if (msg) {
        msg.content = currentStreamText.value;
      }
      progressMessage.value = "";
      streaming.value = false;
      cancelStream = null;
      scrollToBottom();

      // 获取导航名称
      const navName = props.quickSelectItems?.strName || props.researchLeafItem?.strName || "";
      saveQuestion({
        question: navName,
        questionDesc: text,
        generatedSql: currentGeneratedSql,
        tableData: currentTableData,
        message: currentStreamText.value,
        chartData: currentChartData,
      })
        .then(() => {
          emit("save-complete");
        })
        .catch((err) => {
          console.error("[ChatPanel] 保存问题数据失败:", err);
        });
    },
    onError: (error: Error) => {
      const msg = messages.value[assistantIndex];
      if (msg) {
        msg.content = currentStreamText.value || error.message || "请求失败，请稍后重试";
      }
      progressMessage.value = "";
      streaming.value = false;
      cancelStream = null;
      ElMessage.error(error.message || "请求失败，请稍后重试");
    },
  });
}

function stopStream() {
  if (cancelStream) {
    cancelStream();
    cancelStream = null;
    streaming.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// 暴露方法给父组件调用
function clearMessages() {
  messages.value = [
    { role: "assistant", content: "你好！我是千问智能体，有什么可以帮你的吗？" },
  ];
}

function loadHistory(record: { question: string; message: string; chartData?: string; tableData?: string }) {
  messages.value = [];

  let chartOption: Record<string, any> | undefined;
  try {
    if (record.chartData) {
      chartOption = JSON.parse(record.chartData);
    }
  } catch (err) {
    console.error("[ChatPanel] 解析历史图表数据失败:", err);
  }

  let tableData: { columns: any[]; data: any[] } | { columns: any[]; data: any[] }[] | undefined;
  try {
    if (record.tableData) {
      tableData = JSON.parse(record.tableData);
    }
  } catch (err) {
    console.error("[ChatPanel] 解析历史表格数据失败:", err);
  }

  messages.value.push(
    { role: "user", content: record.question },
    { role: "assistant", content: record.message, chartOption, tableData },
  );
  scrollToBottom();
}

function setInputText(text: string) {
  inputText.value = text;
}

defineExpose({ clearMessages, loadHistory, setInputText });
</script>

<template>
  <div class="chat-main">
    <div class="chat-header">
      <span class="chat-title">{{ title }}</span>
      <slot name="header-extra"></slot>
    </div>

    <div ref="chatContainer" class="chat-messages">
      <template v-for="(msg, index) in messages" :key="index">
        <div
          v-if="msg.content || msg.chartOption"
          :class="['message', msg.role === 'user' ? 'message-user' : 'message-assistant']"
        >
          <div class="message-avatar">
            {{ msg.role === "user" ? "😊" : "🤖" }}
          </div>
          <div class="message-bubble">
            <div class="message-content">{{ msg.content }}</div>
            <div v-if="msg.chartOption" class="message-other-content">
              <EChartsRenderer v-if="msg.chartOption" :option="msg.chartOption" />
            </div>
            <div v-if="msg.tableData" class="message-other-content">
              <DynamicTable
                v-if="Array.isArray(msg.tableData)"
                :tables="msg.tableData"
              />
              <DynamicTable
                v-else
                :columns="msg.tableData.columns"
                :data="msg.tableData.data"
              />
            </div>
          </div>
        </div>
      </template>
      <div v-if="streaming" class="message message-assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">
          <div class="message-content">
            {{ currentStreamText
            }}<span v-if="progressMessage" class="thinking">{{ progressMessage }}</span
            ><span v-else class="typing-cursor">▌</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div v-if="selectedNavName" class="selected-nav-name">
        <span class="nav-value">{{ selectedNavName }}</span>
      </div>
      <div class="input-wrapper">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          placeholder="选中快捷导航后可发送问题"
          :disabled="streaming"
          resize="none"
          @keydown="handleKeydown"
        />
        <el-button
          v-if="streaming"
          type="danger"
          @click="stopStream"
          class="send-btn"
        >
          停止
        </el-button>
        <el-button
          v-else
          type="primary"
          :disabled="!selectedNavName"
          @click="sendMessage"
          class="send-btn"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-header {
  padding: 14px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f8f9fb;
}

.message {
  display: flex;
  gap: 10px;
  max-width: 80%;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 8px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
}

.message-user .message-bubble {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 2px;
}

.message-assistant .message-bubble {
  background: #fff;
  color: #303133;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 2px;
}

.message-content,
.message-other-content {
  white-space: pre-wrap;
}

.message-other-content {
  min-width: 700px;
  padding: 5px 0;
}

.thinking {
  color: #909399;
  animation: blink 1.4s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.typing-cursor {
  animation: cursor-blink 1s infinite;
  color: #409eff;
  margin-left: 2px;
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.chat-input-area {
  padding: 12px 24px 16px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-nav-name {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
}

.selected-nav-name .nav-label {
  color: #909399;
}

.selected-nav-name .nav-value {
  color: #409eff;
  font-weight: 500;
}

.chat-input-area .el-input,
.chat-input-area .send-btn {
  flex-shrink: 0;
}

.chat-input-area :deep(.el-input) {
  width: auto;
}

.chat-input-area .input-wrapper {
  display: flex;
  gap: 12px;
  width: 100%;
}

.send-btn {
  flex-shrink: 0;
  height: 74px;
  width: 80px;
  font-size: 15px;
}
</style>
