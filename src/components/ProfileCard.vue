<template>
  <div class="profile-card">
    <div class="profile-avatar">
      <img v-if="avatar" :src="avatar" :alt="name" />
      <div v-else class="avatar-ring"></div>
    </div>
    <h3 class="text-xl font-bold text-white">{{ name }}</h3>
    <p class="text-xs text-gray-400 mt-2">{{ subtitle }}</p>
    <p class="text-sm text-gray-500 mt-4 leading-relaxed">
      {{ motto }}
    </p>
    <div class="profile-actions">
      <button type="button" @click="$emit('primary')">{{ primaryLabel }}</button>
      <button v-if="secondaryLabel" type="button" class="ghost" @click="$emit('secondary')">{{ secondaryLabel }}</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  name: { type: String, default: 'Lemon' },
  subtitle: { type: String, default: '记录灵感 · 设计 · 代码' },
  motto: {
    type: String,
    default: '以持续输出为信仰，把每一次学习都变成可复用的经验。',
  },
  avatar: { type: String, default: '' },
  primaryLabel: { type: String, default: '了解我' },
  secondaryLabel: { type: String, default: '' },
});

defineEmits(['primary', 'secondary']);
</script>
