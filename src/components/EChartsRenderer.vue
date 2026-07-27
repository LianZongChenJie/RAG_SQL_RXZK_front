<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  option: Record<string, any>
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

function initChart() {
  if (!chartRef.value) {
    console.warn('[ECharts] chartRef is null')
    return
  }

  const rect = chartRef.value.getBoundingClientRect()
  console.log('[ECharts] container rect:', rect.width, rect.height)

  // 容器尺寸为0时，使用 ResizeObserver 等待布局稳定后再初始化
  if (rect.width === 0 || rect.height === 0) {
    console.warn('[ECharts] container has zero size, waiting for layout...')
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          observer.disconnect()
          doInitChart()
        }
      }
    })
    observer.observe(chartRef.value)
    return
  }

  doInitChart()
}

function doInitChart() {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(props.option, true)
  chartInstance.resize()

  // 双保险：下一帧再 resize 一次（解决布局未稳定问题）
  requestAnimationFrame(() => {
    chartInstance?.resize()
  })
}

function resizeChart() {
  chartInstance?.resize()
}

onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
  chartInstance = null
})

watch(() => props.option, () => {
  nextTick(() => {
    if (chartInstance) {
      // option 更新：不销毁实例，直接 setOption
      chartInstance.setOption(props.option, true)
      chartInstance.resize()
    } else {
      initChart()
    }
  })
}, { deep: true })
//   aspect-ratio: 2 / 1;
</script>

<template>
  <div ref="chartRef" class="echart-container"></div>
</template>
<style scoped>
.echart-container {
  width: 100%;
  min-height: 360px;
  margin-top: 10px;
}
</style>
