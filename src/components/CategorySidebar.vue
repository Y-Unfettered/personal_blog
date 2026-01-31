<template>
  <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-5">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-300">全部分类</h3>
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
        v-for="cat in categories"
        :key="cat.id"
        class="category-card"
        :class="{ active: selectedId === cat.id }"
        type="button"
        @click="$emit('select', cat)"
      >
        <span class="category-name">{{ cat.name }}</span>
        <span class="category-count">{{ cat.count }} 篇</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categories: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
});

defineEmits(['select', 'clear']);
</script>
