<template>
  <nav class="sticky top-0 z-50 bg-[#0f1115]/80 backdrop-blur-xl border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
      <div class="flex items-center space-x-3 group cursor-pointer" @click="$emit('home')">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
          <span class="iconify text-white text-xl" data-icon="lucide:terminal"></span>
        </div>
        <span class="text-xl font-bold tracking-tight text-white">DevLog<span class="text-indigo-500">_</span></span>
      </div>
      <div class="hidden lg:flex items-center space-x-6 text-sm font-medium text-gray-400 ml-6 flex-1 justify-start">
        <button
          v-for="item in items"
          :key="item.id || item.label"
          class="hover:text-white transition-colors"
          :class="{ 'text-white': isActive(item) }"
          @click="handleNav(item)"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="hidden md:flex items-center">
        <div class="relative">
          <input
            :value="modelValue"
            class="w-60 bg-[#161b22] border border-gray-800 rounded-full px-4 py-2 pr-9 text-xs text-gray-300 focus:border-indigo-500 outline-none"
            placeholder="全站搜索"
            @input="handleInput"
            @keydown.enter="$emit('submit')"
          />
          <span class="iconify text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" data-icon="lucide:search"></span>
        </div>
      </div>
      <button class="md:hidden text-gray-400" @click="toggleMobile">
        <span class="iconify text-2xl" data-icon="lucide:menu"></span>
      </button>
    </div>
    <div v-if="mobileOpen" class="md:hidden border-t border-gray-800 bg-[#0f1115]">
      <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col space-y-3 text-sm text-gray-400">
        <div class="relative">
          <input
            :value="modelValue"
            class="w-full bg-[#161b22] border border-gray-800 rounded-full px-4 py-2 pr-9 text-xs text-gray-300 focus:border-indigo-500 outline-none"
            placeholder="全站搜索"
            @input="handleInput"
            @keydown.enter="$emit('submit')"
          />
          <span class="iconify text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" data-icon="lucide:search"></span>
        </div>
        <button
          v-for="item in items"
          :key="`mobile-${item.id || item.label}`"
          class="text-left hover:text-white"
          :class="{ 'text-white': isActive(item) }"
          @click="handleNav(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
  isActive: {
    type: Function,
    default: () => false,
  },
});

const emit = defineEmits(['update:modelValue', 'nav', 'search', 'submit', 'home']);
const mobileOpen = ref(false);

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value;
}

function handleInput(event) {
  emit('update:modelValue', event.target.value);
  emit('search');
}

function handleNav(item) {
  emit('nav', item);
  mobileOpen.value = false;
}
</script>
