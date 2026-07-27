<script setup lang="ts">
import { ref, computed } from "vue";
import { ElIcon, ElSkeleton } from "element-plus";
import { Search, Loading } from "@element-plus/icons-vue";
import { getIconComponent } from "@/utils/icons";
import { type DataSetItemResponse as MenuItem } from "@/api/sourceApi";

const props = defineProps<{
  items: MenuItem[];
  selectedValue: string | null;
  loadingItem: string | null;
  loading?: boolean; // 整体加载状态
}>();

const emit = defineEmits<{
  (e: "select", item: MenuItem): void;
}>();

const showSearchBox = ref(false);
const searchText = ref("");

const filteredDataChoose = computed(() => {
  if (!searchText.value) {
    return props.items;
  }
  return props.items.filter((item) =>
    item.strName.toLowerCase().includes(searchText.value.toLowerCase()),
  );
});
</script>

<template>
  <div class="menu-section">
    <div class="section-header">
      <h4 class="section-title">数据源选择</h4>
      <el-icon class="search-icon" @click="showSearchBox = !showSearchBox">
        <Search />
      </el-icon>
    </div>

    <el-input
      v-if="showSearchBox"
      v-model="searchText"
      placeholder="搜索数据集"
      class="search-input"
      clearable
      @clear="searchText = ''"
    />

    <!-- 加载中的龙骨图 -->
    <div v-if="loading && items.length === 0" class="menu-items">
      <el-skeleton :rows="4" animated />
    </div>

    <!-- 数据列表 -->
    <div v-else class="menu-items">
      <div
        v-for="item in filteredDataChoose"
        :key="item.id"
        :class="[
          'menu-card',
          {
            active: selectedValue === item.id,
            loading: loadingItem === item.id,
          },
        ]"
        @click="emit('select', item)"
      >
        <div class="card-icon">
          <el-icon :size="20" color="#409EFF">
            <component :is="getIconComponent(item.icon)" />
          </el-icon>
        </div>
        <div class="card-content">
          <div class="card-title">{{ item.strName }}</div>
          <div v-if="loadingItem === item.id" class="card-tag tag-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            ...
          </div>
          <div
            v-else
            :class="['card-tag', { 'tag-pending': selectedValue !== item.id }]"
          >
            {{ selectedValue === item.id ? "已加载" : "待加载" }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showSearchBox && filteredDataChoose.length === 0"
      class="no-results"
    >
      未找到匹配的数据集
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
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

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 290px;
  overflow-y: auto;
  padding-right: 4px;
}

.menu-items::-webkit-scrollbar {
  width: 4px;
}

.menu-items::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 2px;
}

.menu-items::-webkit-scrollbar-track {
  background: transparent;
}

.menu-card {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-card:hover {
  border-color: #67c23a;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
}

.menu-card.active {
  border-color: #67c23a;
  background: #f0f9eb;
}

.card-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  border-radius: 8px;
}

.card-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  padding-right: 12px;
}

.card-tag {
  font-size: 12px;
  color: #67c23a;
  background: #d0f4d7;
  padding: 2px 8px;
  min-width: 38px;
  border-radius: 4px;
}

.card-tag.tag-pending {
  color: #909399;
  background: #eef0f4;
}

.card-tag.tag-loading {
  color: #409eff;
  background: #ecf5ff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.menu-card.loading {
  cursor: not-allowed;
  opacity: 0.8;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
