<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Expand, Fold } from "@element-plus/icons-vue";
import LeftMenu from "@/components/LeftMenu.vue";
import ChatPanel from "@/components/ChatPanel.vue";
import QuestionHistory from "@/components/QuestionHistory.vue";
import { type MetricMenuItem, type DataSetItemResponse } from "@/api/sourceApi";

const selectedValue = ref<DataSetItemResponse | null>(null);
const quickSelectItems = ref<MetricMenuItem | null>(null);
const showHistory = ref(true);
const questionHistoryRef = ref<InstanceType<typeof QuestionHistory> | null>(null);
const chatPanelRef = ref<InstanceType<typeof ChatPanel> | null>(null);
const researchLeafItem = ref<MetricMenuItem | null>(null);
const lOrgId = ref<string | null>(null); // ✅ 改为 lOrgId
// 调研数据快速导航传递的标题和选项列表
const researchStrTitleList = ref<string[]>([]);
const researchStrOptionList = ref<string[]>([]);

const WIDTH_THRESHOLD = 1200;

function checkScreenWidth() {
  showHistory.value = window.innerWidth >= WIDTH_THRESHOLD;
}

onMounted(() => {
  checkScreenWidth();
  window.addEventListener("resize", checkScreenWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenWidth);
});

function handleMenuSelect(item: DataSetItemResponse) {
  selectedValue.value = item;
  quickSelectItems.value = null;
  researchLeafItem.value = null;
}

function getLeafItem(item: MetricMenuItem): MetricMenuItem {
  const firstChild = item.children?.[0];
  if (firstChild) {
    return getLeafItem(firstChild);
  }
  return item;
}

function handleQuickSelect(item: MetricMenuItem, strTitleList?: string[], strOptionList?: string[]) {
  if (item.children && item.children.length > 0) {
    const leaf = getLeafItem(item);
    quickSelectItems.value = leaf;
    researchLeafItem.value = leaf;
  } else {
    quickSelectItems.value = item;
    researchLeafItem.value = item;
  }
  // 保存调研数据的标题和选项列表
  researchStrTitleList.value = strTitleList || [];
  researchStrOptionList.value = strOptionList || [];
  chatPanelRef.value?.setInputText(item.strName || "");
}

function handleHistorySelect(record: any) {
  chatPanelRef.value?.loadHistory({
    question: record.question,
    message: record.message,
    chartData: record.chartData,
    tableData: record.tableData,
  });
}

function handleHistoryDelete() {
  chatPanelRef.value?.clearMessages();
}

function toggleHistory() {
  showHistory.value = !showHistory.value;
}

function handleNewChat() {
  chatPanelRef.value?.clearMessages();
}

function handleSaveComplete() {
  questionHistoryRef.value?.fetchData();
}

function handleOrgIdLoaded(orgId: string | null) {
  lOrgId.value = orgId;
}
</script>

<template>
  <div class="chat-layout">
    <!-- 左侧菜单 -->
    <LeftMenu @select="handleMenuSelect" @quick-select="handleQuickSelect"  @org-id-loaded="handleOrgIdLoaded"></LeftMenu>

    <!-- 右侧对话窗口 -->
    <ChatPanel
      ref="chatPanelRef"
      :selected-value="selectedValue"
      :quick-select-items="quickSelectItems"
      :research-leaf-item="researchLeafItem"
      :title="selectedValue?.strName || '智能体问答'"
      :l-org-id="lOrgId"
      :research-str-title-list="researchStrTitleList"
      :research-str-option-list="researchStrOptionList"
      @save-complete="handleSaveComplete"
    >
      <template #header-extra>
        <el-button
          type="primary"
          text
          :icon="showHistory ? Fold : Expand"
          @click="toggleHistory"
          class="history-toggle-btn"
        />
      </template>
    </ChatPanel>

    <!-- 右侧历史记录 -->
    <QuestionHistory
      v-show="showHistory"
      ref="questionHistoryRef"
      @select="handleHistorySelect"
      @delete="handleHistoryDelete"
      @new-chat="handleNewChat"
    />
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

:deep(.history-toggle-btn) {
  font-size: 22px;
  padding: 2px;
}
</style>
