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
    <div class="mt-4 space-y-4">
      <div v-for="(column, index) in groupedCategories" :key="index">
        <div class="text-xs text-gray-500 mb-2">{{ column.name }}</div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in column.categories"
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
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
});

defineEmits(['select', 'clear']);

const groupedCategories = computed(() => {
  const groups = {};
  
  // 按栏目分组分类
  props.categories.forEach(cat => {
    const column = cat.parent || '未分类';
    if (!groups[column]) {
      groups[column] = {
        name: column,
        categories: []
      };
    }
    groups[column].categories.push(cat);
  });
  
  // 转换为数组并返回
  return Object.values(groups);
});
</script>
