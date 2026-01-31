<template>
  <div class="hero-card">
    <div v-if="slides.length" class="hero-carousel">
      <div
        v-for="(slide, idx) in slides"
        :key="slide.id || idx"
        class="hero-slide"
        :class="{ active: idx === activeIndex }"
        @click="$emit('open', slide)"
      >
        <img :src="slide.cover" :alt="slide.title" class="hero-image" />
        <div class="hero-overlay">
          <div class="hero-content">
            <p class="hero-kicker">精选推荐</p>
            <h2 class="hero-title">{{ slide.title }}</h2>
            <p class="hero-desc">{{ slide.summary }}</p>
            <button class="hero-cta" type="button">立即阅读</button>
          </div>
        </div>
      </div>
      <button class="hero-nav hero-prev" type="button" @click.stop="$emit('prev')">
        <span class="iconify" data-icon="lucide:chevron-left"></span>
      </button>
      <button class="hero-nav hero-next" type="button" @click.stop="$emit('next')">
        <span class="iconify" data-icon="lucide:chevron-right"></span>
      </button>
      <div class="hero-dots">
        <button
          v-for="(slide, idx) in slides"
          :key="`dot-${slide.id || idx}`"
          class="hero-dot"
          :class="{ active: idx === activeIndex }"
          type="button"
          @click.stop="$emit('select', idx)"
        ></button>
      </div>
    </div>
    <div v-else class="hero-carousel hero-fallback">
      <div class="hero-overlay">
        <div class="hero-content">
          <p class="hero-kicker">欢迎回来</p>
          <h2 class="hero-title">这里记录我的创作与思考</h2>
          <p class="hero-desc">发布新文章后，轮播图会自动展示最新的封面内容。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  slides: {
    type: Array,
    default: () => [],
  },
  activeIndex: {
    type: Number,
    default: 0,
  },
});

defineEmits(['prev', 'next', 'select', 'open']);
</script>
