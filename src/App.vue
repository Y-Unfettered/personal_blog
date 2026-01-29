<template>
  <div>
    <nav class="sticky top-0 z-50 bg-[#0f1115]/80 backdrop-blur-xl border-b border-gray-800">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-3 group cursor-pointer" @click="goHome">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
            <span class="iconify text-white text-xl" data-icon="lucide:terminal"></span>
          </div>
          <span class="text-xl font-bold tracking-tight text-white">DevLog<span class="text-indigo-500">_</span></span>
        </div>
        <div class="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-400">
          <button class="hover:text-white transition-colors" @click="setView('home')">文章</button>
          <button class="hover:text-white transition-colors" @click="setView('categories')">分类</button>
          <button class="hover:text-white transition-colors" @click="setView('tags')">标签</button>
          <button class="hover:text-white transition-colors" @click="setView('about')">关于</button>
        </div>
        <button class="md:hidden text-gray-400" @click="toggleMobile">
          <span class="iconify text-2xl" data-icon="lucide:menu"></span>
        </button>
      </div>
      <div v-if="mobileOpen" class="md:hidden border-t border-gray-800 bg-[#0f1115]">
        <div class="max-w-6xl mx-auto px-4 py-3 flex flex-col space-y-2 text-sm text-gray-400">
          <button class="text-left hover:text-white" @click="setView('home')">文章</button>
          <button class="text-left hover:text-white" @click="setView('categories')">分类</button>
          <button class="text-left hover:text-white" @click="setView('tags')">标签</button>
          <button class="text-left hover:text-white" @click="setView('about')">关于</button>
        </div>
      </div>
    </nav>

    <main class="max-w-6xl mx-auto px-4 py-8 min-h-[calc(100vh-144px)]">
      <div v-if="loading" class="text-gray-400">Loading...</div>
      <div v-else-if="error" class="text-red-400">{{ error }}</div>

      <div v-else>
        <section v-if="view === 'home'" class="animate-slide-up">
          <div class="flex items-center justify-between mb-8">
            <h1 class="text-2xl font-bold text-white">最新发布</h1>
          </div>
          <div v-if="posts.length === 0" class="text-gray-400">No posts.</div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <article
              v-for="post in posts"
              :key="post.id"
              class="group bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
              @click="openPost(post)"
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
                <h3 class="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                  <span v-if="post.pinned" class="mr-2 px-2 py-0.5 text-xs rounded-full border border-indigo-500/40 text-indigo-300 bg-indigo-500/10">
                    置顶
                  </span>
                  {{ post.title }}
                </h3>
                <p class="text-sm text-gray-400 line-clamp-2 leading-relaxed">{{ post.summary }}</p>
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
        </section>

        <section v-else-if="view === 'detail'" class="animate-slide-up max-w-3xl mx-auto">
          <button class="mb-8 flex items-center text-gray-400 hover:text-white transition-colors group" @click="setView('home')">
            <span class="iconify mr-1 group-hover:-translate-x-1 transition-transform" data-icon="lucide:arrow-left"></span> 返回列表
          </button>
          <header class="mb-10 text-center">
            <div class="flex justify-center flex-wrap gap-2 mb-4">
              <span
                v-for="(name, idx) in namesFromIds(activePost?.categories, categoryMap)"
                :key="'detail-cat-' + idx"
                class="px-3 py-1 rounded-full text-xs border"
                :style="categoryChipStyle((activePost?.categories || [])[idx])"
              >
                {{ name }}
              </span>
            </div>
            <h1 class="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
              {{ activePost?.title }}
            </h1>
            <div class="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <span class="flex items-center"><span class="iconify mr-2" data-icon="lucide:calendar"></span> {{ activePost?.created_at }}</span>
              <span v-if="activePost?.readingTime" class="flex items-center"><span class="iconify mr-2" data-icon="lucide:clock"></span> {{ activePost?.readingTime }} min</span>
            </div>
          </header>
          <div class="markdown-content prose prose-invert max-w-none prose-indigo" v-html="renderedContent"></div>
        </section>

        <section v-else-if="view === 'categories'" class="animate-slide-up">
          <h1 class="text-2xl font-bold text-white mb-8">内容分类</h1>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-indigo-500/50 transition-all group"
            >
              <span class="iconify text-4xl mb-4" data-icon="lucide:folder" :style="{ color: cat.color || '#6366f1' }"></span>
              <h3 class="text-lg font-bold text-white mb-2">{{ cat.name }}</h3>
              <p class="text-sm text-gray-500">{{ cat.description || '暂无描述' }}</p>
              <div class="mt-6 flex justify-between items-center">
                <span class="text-xs text-indigo-400 font-bold">{{ cat.count }} 篇文章</span>
                <span class="iconify text-gray-600 group-hover:translate-x-1 transition-transform" data-icon="lucide:chevron-right"></span>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="view === 'tags'" class="animate-slide-up">
          <h1 class="text-2xl font-bold text-white mb-8">标签</h1>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="tag in tags"
              :key="tag.id"
              class="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-sm text-gray-300"
            >
              {{ tag.name }} <span class="text-gray-500 ml-1">({{ tag.count }})</span>
            </div>
          </div>
        </section>

        <section v-else-if="view === 'about'" class="animate-slide-up">
          <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-1">
              <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-8 text-center sticky top-24">
                <div class="w-24 h-24 mx-auto mb-6 relative">
                  <div class="rounded-full w-full h-full object-cover p-1 bg-indigo-500 shadow-xl shadow-indigo-500/20"></div>
                  <div class="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-[#161b22] rounded-full"></div>
                </div>
                <h2 class="text-xl font-bold text-white mb-2">DevLog</h2>
                <p class="text-sm text-gray-400 mb-6 font-mono">Full-stack & efficiency enthusiast</p>
                <div class="flex justify-center space-x-3">
                  <span class="iconify text-gray-400 hover:text-indigo-400 cursor-pointer text-xl" data-icon="lucide:github"></span>
                  <span class="iconify text-gray-400 hover:text-indigo-400 cursor-pointer text-xl" data-icon="lucide:twitter"></span>
                  <span class="iconify text-gray-400 hover:text-indigo-400 cursor-pointer text-xl" data-icon="lucide:mail"></span>
                </div>
              </div>
            </div>
            <div class="md:col-span-2 space-y-8">
              <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-8">
                <h3 class="text-xl font-bold text-white mb-6 flex items-center">
                  <span class="iconify text-indigo-500 mr-3" data-icon="lucide:user"></span> 关于这个博客
                </h3>
                <p class="text-gray-400 leading-relaxed text-sm">
                  这里记录我的学习、实验与思考。内容聚焦于现代 Web 开发、效率工具和工程实践。
                </p>
              </div>
              <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-8">
                <h3 class="text-xl font-bold text-white mb-6 flex items-center">
                  <span class="iconify text-indigo-500 mr-3" data-icon="lucide:zap"></span> 核心技能栈
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex items-center space-x-3 p-3 bg-gray-900 rounded-xl">
                    <span class="iconify text-lg text-emerald-400" data-icon="logos:typescript-icon"></span>
                    <span class="text-sm font-semibold">TypeScript</span>
                  </div>
                  <div class="flex items-center space-x-3 p-3 bg-gray-900 rounded-xl">
                    <span class="iconify text-lg text-orange-400" data-icon="logos:rust"></span>
                    <span class="text-sm font-semibold">Rust</span>
                  </div>
                  <div class="flex items-center space-x-3 p-3 bg-gray-900 rounded-xl">
                    <span class="iconify text-lg text-blue-400" data-icon="logos:react"></span>
                    <span class="text-sm font-semibold">React</span>
                  </div>
                  <div class="flex items-center space-x-3 p-3 bg-gray-900 rounded-xl">
                    <span class="iconify text-lg text-purple-400" data-icon="logos:ebpf"></span>
                    <span class="text-sm font-semibold">Cloud Native</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <footer class="bg-gray-900/30 border-t border-gray-800 py-10">
      <div class="max-w-6xl mx-auto px-4 text-center">
        <p class="text-gray-500 text-sm">© 2026 DevLog_ 个人博客</p>
        <div class="flex justify-center space-x-6 mt-4 text-gray-600">
          <a class="hover:text-indigo-400 text-xs" href="#/rss">RSS 订阅</a>
          <a class="hover:text-indigo-400 text-xs" href="#/sitemap">站点地图</a>
          <a class="hover:text-indigo-400 text-xs" href="#/privacy">隐私策略</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { marked } from 'marked';

const posts = ref([]);
const categories = ref([]);
const tags = ref([]);
const categoryMap = ref({});
const categoryColorMap = ref({});
const tagMap = ref({});
const loading = ref(true);
const error = ref('');
const view = ref('home');
const activeSlug = ref('');
const mobileOpen = ref(false);

function sortPosts(list) {
  return list.slice().sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    const ad = a.created_at || '';
    const bd = b.created_at || '';
    return bd.localeCompare(ad);
  });
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value;
}

function setView(nextView) {
  view.value = nextView;
  mobileOpen.value = false;
  if (nextView === 'home') {
    window.location.hash = '#/';
  } else {
    window.location.hash = `#/${nextView}`;
  }
}

function goHome() {
  setView('home');
}

function openPost(post) {
  if (!post || !post.slug) return;
  activeSlug.value = post.slug;
  view.value = 'detail';
  window.location.hash = `#/post/${post.slug}`;
}

function namesFromIds(ids, map) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return ids.map((id) => map[id] || id);
}

function categoryName(id) {
  return categoryMap.value[id] || id || '';
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function categoryColor(id) {
  return categoryColorMap.value[id] || '#6366f1';
}

function categoryBadgeStyle(id) {
  const color = categoryColor(id);
  return {
    backgroundColor: hexToRgba(color, 0.85),
    color: '#ffffff',
  };
}

function categoryChipStyle(id) {
  const color = categoryColor(id);
  return {
    borderColor: hexToRgba(color, 0.45),
    color,
    backgroundColor: hexToRgba(color, 0.12),
  };
}

function countWordsFromMarkdown(markdown) {
  if (!markdown) return 0;
  let text = String(markdown);
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]*`/g, ' ');
  text = text.replace(/!\[[^\]]*]\([^)]+\)/g, ' ');
  text = text.replace(/\[[^\]]*]\([^)]+\)/g, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/[#>*_~\\-]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + latinWords;
}

function estimateReadingTimeMinutes(content) {
  const wordCount = countWordsFromMarkdown(content);
  if (!wordCount) return 0;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function tagSummary(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return '无标签';
  const names = ids.map((id) => tagMap.value[id] || id);
  return names.slice(0, 2).join(', ') + (names.length > 2 ? '…' : '');
}

function syncFromHash() {
  const hash = window.location.hash || '#/';
  if (hash.startsWith('#/post/')) {
    view.value = 'detail';
    activeSlug.value = hash.replace('#/post/', '').trim();
    return;
  }
  if (hash === '#/categories') return (view.value = 'categories');
  if (hash === '#/tags') return (view.value = 'tags');
  if (hash === '#/about') return (view.value = 'about');
  view.value = 'home';
}

const activePost = computed(() => posts.value.find((p) => p.slug === activeSlug.value) || null);
const renderedContent = computed(() => {
  if (!activePost.value) return '';
  return marked.parse(activePost.value.content || '');
});

async function loadData() {
  try {
    const useApi = import.meta.env.DEV;
    const base = import.meta.env.BASE_URL || '/';
    const postsUrl = useApi ? '/api/posts' : `${base}data/posts.json`;
    const categoriesUrl = useApi ? '/api/categories' : `${base}data/categories.json`;
    const tagsUrl = useApi ? '/api/tags' : `${base}data/tags.json`;

    const [postsRes, categoriesRes, tagsRes] = await Promise.all([
      fetch(postsUrl),
      fetch(categoriesUrl),
      fetch(tagsUrl),
    ]);

    if (!postsRes.ok || !categoriesRes.ok || !tagsRes.ok) {
      throw new Error('Failed to load data JSON files.');
    }

    const postsData = await postsRes.json();
    const categoriesData = await categoriesRes.json();
    const tagsData = await tagsRes.json();

    const rawPosts = useApi
      ? (Array.isArray(postsData) ? postsData : []).filter((p) => p.status === 'published')
      : (Array.isArray(postsData.posts) ? postsData.posts : []);
    posts.value = sortPosts(rawPosts.map((p) => ({
      ...p,
      readingTime: p.readingTime || estimateReadingTimeMinutes(p.content),
    })));
    categories.value = useApi
      ? (Array.isArray(categoriesData) ? categoriesData : [])
      : (Array.isArray(categoriesData.categories) ? categoriesData.categories : []);
    tags.value = useApi
      ? (Array.isArray(tagsData) ? tagsData : [])
      : (Array.isArray(tagsData.tags) ? tagsData.tags : []);
    categoryMap.value = Object.fromEntries(categories.value.map((c) => [c.id, c.name]));
    categoryColorMap.value = Object.fromEntries(categories.value.map((c) => [c.id, c.color || '#6366f1']));
    tagMap.value = Object.fromEntries(tags.value.map((t) => [t.id, t.name]));

    syncFromHash();
  } catch (err) {
    error.value = err && err.message ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  window.addEventListener('hashchange', syncFromHash);
  loadData();
});
</script>

<style>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out forwards;
}

.markdown-content p {
  color: #9ca3af;
  margin-bottom: 1rem;
  line-height: 1.7;
}

.markdown-content h2 {
  color: #f3f4f6;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.markdown-content code {
  background: #1f2937;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
}
</style>
