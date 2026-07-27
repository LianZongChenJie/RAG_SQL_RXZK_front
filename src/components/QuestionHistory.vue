<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPageQuestion, deleteQuestionById, topQuestion, cancelTop, type QuestionRecord } from '../api/sqlRag'
import { MoreFilled, CirclePlus, Top, Delete } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'select', record: QuestionRecord): void
  (e: 'new-chat'): void
  (e: 'delete', id: number): void
}>()

const props = defineProps<{
  modelValue?: boolean
}>()

const list = ref<QuestionRecord[]>([])
const loading = ref(false)
const selectedId = ref<number | null>(null)
const showMoreMenu = ref(false)
const moreMenuPosition = ref({ x: 0, y: 0 })
const currentRecord = ref<QuestionRecord | null>(null)

// 按时间分组
const groupedList = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 分离置顶数据和非置顶数据
  const topItems: QuestionRecord[] = []
  const normalItems: QuestionRecord[] = []

  list.value.forEach(item => {
    if (item.number != null && item.number > 0) {
      topItems.push(item)
    } else {
      normalItems.push(item)
    }
  })

  // 置顶数据按number升序排序
  topItems.sort((a, b) => a.number! - b.number!)

  // 非置顶数据按时间分组
  const timeGroups: { label: string; items: QuestionRecord[] }[] = [
    { label: '今天', items: [] },
    { label: '7天内', items: [] },
    { label: '30天内', items: [] },
    { label: '更早', items: [] },
  ]

  normalItems.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
  normalItems.forEach(item => {
    const itemDate = new Date(item.createTime)
    if (itemDate >= today) {
      timeGroups[0]!.items.push(item)
    } else if (itemDate >= sevenDaysAgo) {
      timeGroups[1]!.items.push(item)
    } else if (itemDate >= thirtyDaysAgo) {
      timeGroups[2]!.items.push(item)
    } else {
      timeGroups[3]!.items.push(item)
    }
  })

  // 组合：置顶分组 + 时间分组
  const result: { label: string; items: QuestionRecord[] }[] = []
  if (topItems.length > 0) {
    result.push({ label: '置顶', items: topItems })
  }
  result.push(...timeGroups.filter(g => g.items.length > 0))

  return result
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getPageQuestion({ pageNum: 1, pageSize: 100 })
    list.value = res.list
  } catch (err) {
    console.error('加载历史记录失败:', err)
  } finally {
    loading.value = false
  }
}

function handleSelect(record: QuestionRecord) {
  selectedId.value = record.id
  emit('select', record)
}

function handleNewChat() {
  selectedId.value = null
  emit('new-chat')
}

function handleMore(e: Event, record: QuestionRecord) {
  e.stopPropagation()
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const menuWidth = 120
  const menuHeight = 80 // 估算菜单高度
  const padding = 5

  let x = rect.left - menuWidth
  let y = rect.bottom + padding

  // 检查左边界
  if (x < padding) {
    x = rect.right + padding
  }

  // 检查右边界
  if (x + menuWidth > window.innerWidth - padding) {
    x = window.innerWidth - menuWidth - padding
  }

  // 检查下边界，如果超出则显示在按钮上方
  if (y + menuHeight > window.innerHeight - padding) {
    y = rect.top - menuHeight - padding
  }

  // 检查上边界
  if (y < padding) {
    y = padding
  }

  moreMenuPosition.value = { x, y }
  currentRecord.value = record
  showMoreMenu.value = true
}

// 点击其他地方关闭菜单
function closeMenu() {
  showMoreMenu.value = false
  currentRecord.value = null
}

// 判断当前记录是否已置顶
const isCurrentRecordTop = computed(() => {
  return currentRecord.value != null && currentRecord.value.number != null && currentRecord.value.number > 0
})

// 置顶
async function handleTop() {
  if (!currentRecord.value) return

  try {
    await topQuestion(String(currentRecord.value.id))
    ElMessage.success('置顶成功')
    await fetchData()
  } catch (err) {
    console.error('置顶失败:', err)
    ElMessage.error('置顶失败')
  } finally {
    closeMenu()
  }
}

// 取消置顶
async function handleCancelTop() {
  if (!currentRecord.value) return

  try {
    await cancelTop(String(currentRecord.value.id))
    ElMessage.success('取消置顶成功')
    await fetchData()
  } catch (err) {
    console.error('取消置顶失败:', err)
    ElMessage.error('取消置顶失败')
  } finally {
    closeMenu()
  }
}

// 删除
async function handleDelete() {
  if (!currentRecord.value) return
  
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteQuestionById(String(currentRecord.value.id))
    ElMessage.success('删除成功')
    emit('delete', currentRecord.value.id)
    await fetchData()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
      ElMessage.error('删除失败')
    }
  } finally {
    closeMenu()
  }
}

onMounted(() => {
  fetchData()

  // 点击其他地方关闭菜单
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.more-menu-container') && !target.closest('.history-more')) {
      closeMenu()
    }
  })
})

defineExpose({ fetchData })
</script>

<template>
  <div class="question-history">
    <!-- 开启新对话按钮 -->
    <div class="new-chat-btn" @click="handleNewChat">
      <el-icon><CirclePlus /></el-icon>
      <span>开启新对话</span>
    </div>

    <!-- 历史列表 -->
    <div class="history-list" v-loading="loading">
      <template v-for="group in groupedList" :key="group.label">
        <div class="history-group-label">{{ group.label }}</div>
        <div
          v-for="item in group.items"
          :key="item.id"
          :class="['history-item', { active: selectedId === item.id }]"
          @click="handleSelect(item)"
        >
          <span class="history-title-text">{{ item.question }}</span>
          <el-icon class="history-more" @click="handleMore($event, item)">
            <MoreFilled />
          </el-icon>
        </div>
      </template>
      <div v-if="!loading && list.length === 0" class="history-empty">
        暂无历史记录
      </div>
    </div>

    <!-- 更多操作菜单 -->
    <div
      v-if="showMoreMenu"
      class="more-menu-container"
      :style="{
        left: moreMenuPosition.x + 'px',
        top: moreMenuPosition.y + 'px'
      }"
    >
      <div class="more-menu-item" @click="isCurrentRecordTop ? handleCancelTop() : handleTop()">
        <el-icon><Top /></el-icon>
        <span>{{ isCurrentRecordTop ? '取消置顶' : '置顶' }}</span>
      </div>
      <div class="more-menu-item delete" @click="handleDelete">
        <el-icon><Delete /></el-icon>
        <span>删除</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-history {
  width: 260px;
  min-width: 260px;
  background: #f5f7fa;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 开启新对话按钮 */
.new-chat-btn {
  margin: 12px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  transition: all 0.2s;
  flex-shrink: 0;
}

.new-chat-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.new-chat-btn .el-icon {
  font-size: 16px;
}

/* 历史列表 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
}

/* 时间分组标签 */
.history-group-label {
  padding: 8px 12px 4px;
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

/* 历史项 */
.history-item {
  padding: 10px 12px;
  margin: 2px 4px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: background 0.2s;
}

.history-item:hover {
  background: #e6f2ff;
}

.history-item.active {
  background: #ecf5ff;
}

.history-item.active .history-title-text {
  color: #409eff;
}

.history-title-text {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.history-more {
  font-size: 14px;
  color: #c0c4cc;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 2px;
  border-radius: 4px;
}

.history-item:hover .history-more {
  opacity: 1;
}

.history-more:hover {
  background: #dcdfe6;
  color: #606266;
}

/* 空状态 */
.history-empty {
  text-align: center;
  color: #909399;
  padding: 40px 0;
  font-size: 13px;
}

/* 更多操作菜单 */
.more-menu-container {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
}

.more-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
  transition: background 0.2s;
}

.more-menu-item:hover {
  background: #f5f7fa;
}

.more-menu-item.delete {
  color: #f56c6c;
}

.more-menu-item.delete:hover {
  background: #fef0f0;
}

.more-menu-item .el-icon {
  font-size: 16px;
}
</style>
