<template>
  <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-5">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-300">全部标签</h3>
      <button
        v-if="selectedId"
        class="text-xs text-indigo-400 hover:text-indigo-300"
        type="button"
        @click="$emit('clear')"
      >
        查看全部
      </button>
    </div>
    <div class="mt-4 flex flex-col gap-3">
      <button
        v-for="tag in tags"
        :key="tag.id"
        class="category-card"
        :class="{ active: selectedId === tag.id }"
        type="button"
        @click="$emit('select', tag)"
      >
        <span class="category-name">{{ tag.name }}</span>
        <span class="category-count">{{ tag.count }} 篇</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tags: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
});

defineEmits(['select', 'clear']);
</script>
