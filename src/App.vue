<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
/* 隐藏所有滚动条 */
::-webkit-scrollbar {
  display: none;
}

/* Firefox */
* {
  scrollbar-width: none;
}

/* IE/Edge */
* {
  -ms-overflow-style: none;
}
</style>
