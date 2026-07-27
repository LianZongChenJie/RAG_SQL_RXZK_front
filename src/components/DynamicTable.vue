<template>
  <!-- 支持单个表格或多个表格 -->
  <template v-if="isMultipleTables">
    <!-- 多个表格：循环渲染每个表格 -->
    <div v-for="(table, index) in tables" :key="index" class="table-wrapper">
      <el-table :data="table.data" border style="width: 100%">
        <el-table-column
          v-for="column in table.columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          align="center"
        >
          <template #default="scope">
            <slot :name="column.prop" :row="scope.row" :value="scope.row[column.prop]">
              {{ scope.row[column.prop] }}
            </slot>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </template>
  <template v-else>
    <!-- 单个表格：兼容旧格式 -->
    <el-table :data="data" border style="width: 100%">
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        align="center"
      >
        <template #default="scope">
          <slot :name="column.prop" :row="scope.row" :value="scope.row[column.prop]">
            {{ scope.row[column.prop] }}
          </slot>
        </template>
      </el-table-column>
    </el-table>
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Column {
  prop: string;
  label: string;
}

interface Table {
  columns: Column[];
  data: Record<string, any>[];
}

// 定义组件接收的 Props
const props = defineProps<{
  columns?: Column[];
  data?: Record<string, any>[];
  tables?: Table[];
}>();

// 判断是否为多表格格式
const isMultipleTables = computed(() => {
  return props.tables && Array.isArray(props.tables) && props.tables.length > 0;
});
</script>

<style scoped>
.table-wrapper {
  margin-bottom: 16px;
}

.table-wrapper:last-child {
  margin-bottom: 0;
}
</style>