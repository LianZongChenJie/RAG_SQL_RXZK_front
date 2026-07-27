<script setup lang="ts">
import { ref, computed } from "vue";
import { ElIcon, ElSkeleton } from "element-plus";
import { ArrowRight, Search } from "@element-plus/icons-vue";
import { type MetricMenuItem } from "@/api/sourceApi";

const props = defineProps<{
  items: MetricMenuItem[];
  loading?: boolean; // 整体加载状态
}>();

const emit = defineEmits<{
  (e: "quick-select", item: MetricMenuItem): void;
}>();

const showQuickSearch = ref(false);
const quickSearchText = ref("");

// 快速导航展开状态 (按 lId 跟踪，使用 string 类型以匹配 lId)
const expandedCategories = ref<Set<string>>(new Set());

// 新增：追踪当前选中的二级菜单项 ID
const activeItemId = ref<string | null>(null);

function toggleExpand(categoryId?: string) {
  if (!categoryId) return;
  const s = expandedCategories.value;
  if (s.has(categoryId)) {
    s.delete(categoryId);
  } else {
    s.add(categoryId);
  }
  // 触发响应式更新
  expandedCategories.value = new Set(s);
}

// 过滤后的快速导航列表 (仅按一级菜单 strName 搜索)
const filteredQuickAccess = computed(() => {
  if (!quickSearchText.value) {
    return props.items;
  }
  const keyword = quickSearchText.value.toLowerCase();
  return props.items.filter((category) =>
    category.strName?.toLowerCase().includes(keyword)
  );
});

// 选择快速导航二级菜单项
function handleQuickSelect(item: MetricMenuItem) {
  if (item.lId) {
    emit("quick-select", item);
  }
  // 新增：更新选中状态
  if (item.lId) {
    activeItemId.value = item.lId;
  }
}
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

    <!-- 加载中的龙骨图 -->
    <div v-if="loading && items.length === 0" class="quick-access-list">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 快速导航列表 -->
    <div v-else class="quick-access-list">
      <div
        v-for="category in filteredQuickAccess"
        :key="category.lId"
        class="quick-access-card"
      >
        <!-- 修改：动态绑定 active 类，当该分类下有子项被选中时，一级菜单高亮 -->
        <div 
          class="quick-access-header" 
          :class="{ active: category.children?.some(child => child.lId === activeItemId) }"
          @click="toggleExpand(category.lId)"
        >
          <div class="header-left">
            <!-- 注：MetricMenuItem 类型中无 icon 字段，已移除图标相关代码 -->
            <span class="header-title">{{ category.strName ?? '未命名分类' }}</span>
          </div>
          <el-icon
            class="expand-icon"
            :class="{ expanded: category.lId ? expandedCategories.has(category.lId) : false }"
          >
            <ArrowRight />
          </el-icon>
        </div>
        
        <div
          v-show="category.lId && expandedCategories.has(category.lId)"
          class="quick-access-content"
        >
          <!-- 修改：动态绑定 active 类，并在点击时传入 item.lId -->
          <div
            v-for="item in category.children"
            :key="item.lId"
            class="sub-menu-item"
            :class="{ active: activeItemId === item.lId }"
            @click.stop="handleQuickSelect(item)"
          >
            <!-- 注：子级同样无 icon 字段，已移除图标相关代码 -->
            <span class="sub-menu-title">{{ item.strName ?? '未命名项' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showQuickSearch && filteredQuickAccess.length === 0"
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

/* 新增：一级菜单选中样式（边框线颜色:#67c23a） */
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
.sub-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
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

/* 新增：二级菜单选中样式（与当前的 hover 效果一致） */
.sub-menu-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.sub-menu-title {
  font-size: 13px;
  color: #606266;
}
</style>