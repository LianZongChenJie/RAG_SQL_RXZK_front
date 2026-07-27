<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { ArrowRight, Search } from "@element-plus/icons-vue";
import { getResearchMenu, type MetricMenuItem, type ResearchMenuParams } from "@/api/sourceApi";

const props = defineProps<{
  lQuestionnaireId: string;
  strTableName: string;
}>();

const emit = defineEmits<{
  (e: "quick-select", item: MetricMenuItem, strTitleList?: string[], strOptionList?: string[]): void;
}>();

const showQuickSearch = ref(false);
const quickSearchText = ref("");
const loading = ref(false);
const items = ref<MetricMenuItem[]>([]);

// 快速导航展开状态
const expandedCategories = ref<Set<string>>(new Set());

// 追踪当前选中的二级菜单项 ID
const activeItemId = ref<string | null>(null);

// 加载调研数据导航菜单
async function loadResearchMenu() {
  if (!props.lQuestionnaireId || !props.strTableName) {
    return;
  }

  loading.value = true;
  try {
    const params: ResearchMenuParams = {
      lQuestionnaireId: props.lQuestionnaireId,
      strTableName: props.strTableName
    };
    const res = await getResearchMenu(params);
    if (res.return?.nCode === 0 && res.response?.cdoList) {
      items.value = res.response.cdoList;
      // 默认展开第一个分类
      const firstCategory = items.value[0];
      if (firstCategory?.lId) {
        expandedCategories.value.add(firstCategory.lId);
      }
    } else {
      ElMessage.error(res.return?.strText || "加载调研导航失败");
    }
  } catch (error) {
    ElMessage.error("加载调研导航失败: " + (error instanceof Error ? error.message : String(error)));
  } finally {
    loading.value = false;
  }
}

// 切换分类展开状态
function toggleCategory(categoryId?: string) {
  if (!categoryId) return;
  const s = expandedCategories.value;
  if (s.has(categoryId)) {
    s.delete(categoryId);
  } else {
    s.add(categoryId);
  }
  expandedCategories.value = new Set(s);
}

// 过滤后的快速导航列表
function getFilteredItems() {
  if (!quickSearchText.value) {
    return items.value;
  }
  const keyword = quickSearchText.value.toLowerCase();
  return items.value.filter((category) =>
    category.strName?.toLowerCase().includes(keyword) ||
    category.children?.some(child => child.strName?.toLowerCase().includes(keyword))
  );
}

// 选择快速导航项
function handleQuickSelect(item: MetricMenuItem) {
  if (item.lId) {
    activeItemId.value = item.lId;
    // 传递 strTitleList 和 strOptionList 数组
    emit("quick-select", item, item.strTitleList, item.strOptionList);
  }
}

// 监听 props 变化，重新加载数据
watch(() => [props.lQuestionnaireId, props.strTableName], () => {
  if (props.lQuestionnaireId && props.strTableName) {
    loadResearchMenu();
  }
}, { immediate: true });
</script>

<template>
  <div class="menu-section">
    <div class="section-header">
      <h4 class="section-title">快速导航</h4>
      <el-icon class="search-icon" @click="showQuickSearch = !showQuickSearch">
        <Search />
      </el-icon>
    </div>

    <el-input
      v-if="showQuickSearch"
      v-model="quickSearchText"
      placeholder="搜索快速导航"
      class="search-input"
      clearable
      @clear="quickSearchText = ''"
    />

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading">
        <ArrowRight />
      </el-icon>
      <span>加载中...</span>
    </div>

    <div v-else class="quick-access-list">
      <template v-for="category in getFilteredItems()" :key="category.lId">
        <!-- 一级分类 -->
        <div class="quick-access-card">
          <div
            class="quick-access-header"
            :class="{ active: category.children?.some(child => child.lId === activeItemId) }"
            @click="toggleCategory(category.lId)"
          >
            <div class="header-left">
              <span class="header-title">{{ category.strName ?? '未命名分类' }}</span>
            </div>
            <el-icon
              class="expand-icon"
              :class="{ expanded: category.lId ? expandedCategories.has(category.lId) : false }"
            >
              <ArrowRight />
            </el-icon>
          </div>

          <!-- 二级菜单 -->
          <div
            v-show="category.lId && expandedCategories.has(category.lId)"
            class="quick-access-content"
          >
            <template v-for="level2 in category.children" :key="level2.lId">
              <!-- 二级分类 -->
              <div class="level2-card">
                <div
                  class="level2-header"
                  :class="{ active: level2.children?.some(child => child.lId === activeItemId) }"
                  @click="toggleCategory(level2.lId)"
                >
                  <span class="level2-title">{{ level2.strName ?? '未命名分类' }}</span>
                  <el-icon
                    class="expand-icon"
                    :class="{ expanded: level2.lId ? expandedCategories.has(level2.lId) : false }"
                  >
                    <ArrowRight />
                  </el-icon>
                </div>

                <!-- 三级叶子节点 -->
                <div
                  v-show="level2.lId && expandedCategories.has(level2.lId)"
                  class="level3-content"
                >
                  <div
                    v-for="level3 in level2.children"
                    :key="level3.lId"
                    class="sub-menu-item"
                    :class="{ active: activeItemId === level3.lId }"
                    @click.stop="handleQuickSelect(level3)"
                  >
                    <span class="sub-menu-title">{{ level3.strName ?? '未命名项' }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <div
      v-if="!loading && showQuickSearch && getFilteredItems().length === 0"
      class="no-results"
    >
      未找到匹配的快速导航
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}
.section-title {
  margin: 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}
.search-icon {
  cursor: pointer;
  color: #909399;
  font-size: 16px;
  transition: color 0.2s;
}
.search-icon:hover {
  color: #409eff;
}
.search-input {
  margin-bottom: 12px;
}
.loading-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}
.is-loading {
  animation: rotate 1s linear infinite;
}
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.no-results {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}
.quick-access-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick-access-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}
.quick-access-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-access-header:hover {
  background: #f5f7fa;
}
.quick-access-header.active {
  border-left: 3px solid #67c23a;
  background: #f0f9eb;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}
.expand-icon {
  color: #909399;
  transition: transform 0.2s;
}
.expand-icon.expanded {
  transform: rotate(90deg);
}
.quick-access-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 二级分类样式 */
.level2-card {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 4px;
  overflow: hidden;
}
.level2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.level2-header:hover {
  background: #f0f2f5;
}
.level2-header.active {
  border-left: 2px solid #409eff;
  background: #ecf5ff;
}
.level2-title {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

/* 三级叶子节点样式 */
.level3-content {
  padding: 4px 8px 8px;
}
.sub-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 8px;
}
.sub-menu-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}
.sub-menu-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.sub-menu-title {
  font-size: 12px;
  color: #606266;
}
</style>
