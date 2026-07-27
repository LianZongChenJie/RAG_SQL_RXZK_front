<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  getDataSetList,
  getMetricMenu,
  type MetricMenuItem,
  type DataSetItemResponse as MenuItem
} from "@/api/sourceApi";
import DataSourceSelect from "./DataSourceSelect.vue";
import QuickAccess from "./QuickAccess.vue";
import ResearchQuickAccess from "./ResearchQuickAccess.vue";

const emit = defineEmits<{
  (e: "select", item: MenuItem): void;
  (e: "quick-select", item: MetricMenuItem, strTitleList?: string[], strOptionList?: string[]): void;
  (e: "org-id-loaded", orgId: string | null): void; // ✅ 新增事件
}>();

// 左侧菜单数据
const dataChoose = ref<MenuItem[]>([]);
const quickAccess = ref<MetricMenuItem[]>([]);
const selectedId = ref<string | null>(null);
const selectedItem = ref<MenuItem | null>(null);

// 加载状态
const loadingItem = ref<string | null>(null);
const dataLoading = ref(false); // 数据集列表加载状态
const menuLoading = ref(false); // 快速导航加载状态

// 是否显示调研数据导航栏
const showResearchQuickAccess = ref(false);

const orgId = ref<string>('');
// 加载菜单数据（仅快速导航）
async function loadMenuData() {
  try {
    menuLoading.value = true; // 开始加载
    const res = await getMetricMenu();
    if (res.return?.nCode === 0 && res.response?.cdoList) {
      quickAccess.value = res.response.cdoList;
      // loadMenuData 的 lOrgId 可能为空（它是客观数据菜单接口），
      // 只在已有 orgId 时才覆盖，避免把 null 再传回去
      const menuOrgId = res.response?.lOrgId || null;
      if (menuOrgId !== null) {
        emit("org-id-loaded", menuOrgId);
      }
    }
  } catch (error) {
    ElMessage.error("加载菜单失败: " + (error instanceof Error ? error.message : String(error)));
  } finally {
    menuLoading.value = false; // 加载完成
  }
}

// 加载数据集列表（dataanalyze.wnsse.cn）
async function loadDataSetList() {
  try {
    dataLoading.value = true; // 开始加载
    const res = await getDataSetList();
    if (res.return?.nCode === 0 && res.response?.cdoList) {
      dataChoose.value = res.response.cdoList;// 保存 orgId
      orgId.value = res.response?.lOrgId || ''; // 保存 orgId
      const _lOrgId = res.response?.lOrgId || null;
      emit("org-id-loaded", _lOrgId); // ✅ 立即通知父组件
    }
    // 第一个数据集默认加载
    if (dataChoose.value.length > 0) {
      const first = dataChoose.value[0];
      // console.log("第一个数据集:", first);
      if (first) {
        selectedId.value = first.id;
        selectMenuItem(first);
      }
    }
  } catch (error) {
    console.log("加载数据集列表失败:", error);
  } finally {
    dataLoading.value = false; // 加载完成
  }
}

// 选择菜单项
function selectMenuItem(item: MenuItem) {
  if (item.id && loadingItem.value !== item.id) {
    loadingItem.value = item.id;
    setTimeout(() => {
      selectedId.value = item.id;
      selectedItem.value = item;
      loadingItem.value = null;
      emit("select", item);

      // 根据 nType 决定加载哪种导航栏
      const nType = Number(item.nType);
      if (nType === 1) {
        // 客观数据：加载客观数据导航菜单
        showResearchQuickAccess.value = false;
        loadMenuData();
      } else if (nType === 2 || nType === 3) {
        // 调研数据：显示调研数据导航栏
        showResearchQuickAccess.value = true;
      }
    }, 500);
  }
}

// 选择快速导航二级菜单项
function handleQuickSelect(item: MetricMenuItem) {
  emit("quick-select", item);
}

onMounted(() => {
  loadDataSetList();
});

// 处理调研数据快速导航选中
function handleResearchQuickSelect(item: MetricMenuItem, strTitleList?: string[], strOptionList?: string[]) {
  emit("quick-select", item, strTitleList, strOptionList);
}
</script>

<template>
  <div class="sidebar">
    <h4 class="page-title">学生就业数据分析</h4>
    <div class="menu-container">
      <DataSourceSelect
        :items="dataChoose"
        :selected-value="selectedId"
        :loading-item="loadingItem"
        :loading="dataLoading"
        @select="selectMenuItem"
      />
      <QuickAccess
        v-if="!showResearchQuickAccess"
        :items="quickAccess"
        :loading="menuLoading"
        @quick-select="handleQuickSelect"
      />
      <ResearchQuickAccess
        v-else
        :l-questionnaire-id="selectedItem?.lQuestionnaireId ?? ''"
        :str-table-name="selectedItem?.strTableName ?? ''"
        @quick-select="handleResearchQuickSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 300px;
  min-width: 300px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.menu-container {
  padding: 16px;
}

.page-title {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: #539e73;
  padding: 10px 14px;
  line-height: 32px;
  text-align: center;
}
</style>
