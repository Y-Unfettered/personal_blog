<template>
  <div v-if="posts.length === 0" class="text-gray-400">No posts.</div>
  <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <article
      v-for="post in posts"
      :key="post.id"
      class="group bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
      @click="$emit('open', post)"
    >
      <div class="h-48 bg-gray-800 overflow-hidden relative">
        <img
          v-if="post.cover"
          :alt="post.title"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          :src="post.cover"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
        <div v-if="post.categories && post.categories.length" class="absolute top-4 left-4">
          <span class="px-2 py-1 text-white text-xs font-bold rounded" :style="categoryBadgeStyle(post.categories[0])">
            {{ categoryName(post.categories[0]) }}
          </span>
        </div>
      </div>
      <div class="p-5 flex flex-col space-y-3">
        <div class="text-xs text-gray-500 flex items-center">
          <span class="iconify mr-1" data-icon="lucide:calendar"></span> {{ post.created_at }}
        </div>
        <h3 class="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors card-title">
          <span v-if="post.pinned" class="mr-2 px-2 py-0.5 text-xs rounded-full border border-indigo-500/40 text-indigo-300 bg-indigo-500/10">
            置顶
          </span>
          {{ post.title }}
        </h3>
        <p class="text-sm text-gray-400 card-summary">{{ post.summary }}</p>
        <div class="pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
          <span class="flex items-center">
            <span class="iconify mr-1" data-icon="lucide:tag"></span>
            {{ tagSummary(post.tags) }}
          </span>
          <span v-if="post.readingTime" class="flex items-center">
            <span class="iconify mr-1" data-icon="lucide:clock"></span>
            {{ post.readingTime }} min read
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({
  posts: { type: Array, default: () => [] },
  categoryName: { type: Function, required: true },
  categoryBadgeStyle: { type: Function, required: true },
  tagSummary: { type: Function, required: true },
});

defineEmits(['open']);
</script>
