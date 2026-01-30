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

        <section v-else-if="view === 'detail'" class="detail-layout">
          <aside v-if="tocItems.length" class="toc-panel" :class="{ 'toc-visible': showToc }">
            <div class="toc-title">目录</div>
            <ul class="toc-list">
              <li
                v-for="item in tocItems"
                :key="item.id"
                class="toc-item"
                :style="{ paddingLeft: `${(item.level - tocBaseLevel) * 12}px` }"
              >
                <button
                  class="toc-link"
                  :class="{ 'toc-link-active': item.id === activeHeadingId }"
                  type="button"
                  @click="scrollToHeading(item.id)"
                >
                  {{ item.text }}
                </button>
              </li>
            </ul>
          </aside>
          <div class="detail-content animate-slide-up">
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
            <div class="md-preview">
              <article class="md-editor-preview" :class="markdownThemeClass" v-html="renderedContent"></article>
            </div>
            <div class="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-6 text-sm text-gray-400">
              <button
                v-if="prevPost"
                class="flex-1 text-left group hover:text-white transition-colors"
                @click="openPost(prevPost)"
              >
                <div class="text-xs uppercase tracking-widest text-gray-500 mb-2">上一篇</div>
                <div class="text-indigo-300 group-hover:text-indigo-200 text-base font-semibold">
                  {{ prevPost.title }}
                </div>
              </button>
              <div v-else class="flex-1"></div>
              <button
                v-if="nextPost"
                class="flex-1 text-right group hover:text-white transition-colors"
                @click="openPost(nextPost)"
              >
                <div class="text-xs uppercase tracking-widest text-gray-500 mb-2">下一篇</div>
                <div class="text-indigo-300 group-hover:text-indigo-200 text-base font-semibold">
                  {{ nextPost.title }}
                </div>
              </button>
              <div v-else class="flex-1"></div>
            </div>
          </div>
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

    <button v-if="showBackTop" class="back-to-top" type="button" @click="scrollToTop">
      <span class="iconify text-xl" data-icon="lucide:arrow-up"></span>
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';

function slugifyHeading(text, idMap) {
  const plain = String(text || '').replace(/<[^>]+>/g, '');
  const base = plain
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '');
  const safe = base || 'section';
  const count = idMap.get(safe) || 0;
  idMap.set(safe, count + 1);
  return count === 0 ? safe : `${safe}-${count + 1}`;
}

function inlineMarkdownToText(text) {
  const html = marked.parseInline(text || '');
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function encodeBase64(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (err) {
    return btoa(text);
  }
}

function decodeBase64(text) {
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch (err) {
    return atob(text);
  }
}

function createRenderer() {
  const idMap = new Map();
  const renderer = new marked.Renderer();
  renderer.code = (code, infostring) => {
    let text = code;
    let lang = infostring || '';
    if (code && typeof code === 'object') {
      text = code.text || '';
      lang = code.lang || lang;
    }
    const language = String(lang || '').trim().split(/\s+/)[0];
    let highlighted = '';
    try {
      if (language && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(text, { language }).value;
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
    } catch (err) {
      highlighted = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    const langClass = language ? ` language-${language}` : '';
    const langLabel = language || 'text';
    const encoded = encodeBase64(String(text || ''));
    return `
      <div class="code-block">
        <div class="code-block-header">
          <span class="code-dots"><i></i><i></i><i></i></span>
          <div class="code-actions">
            <span class="code-lang">${langLabel}</span>
            <button class="code-copy" type="button" data-code="${encoded}">
              <span class="iconify" data-icon="lucide:copy"></span>
              <span class="code-copy-text">复制</span>
            </button>
          </div>
        </div>
        <pre><code class="hljs${langClass}">${highlighted}</code></pre>
      </div>
    `;
  };
  renderer.heading = (text, level) => {
    if (text && typeof text === 'object') {
      const token = text;
      const tokenText = token.text || '';
      const tokenLevel = token.depth || 1;
      const id = slugifyHeading(tokenText, idMap);
      return `<h${tokenLevel} id="${id}">${marked.parseInline(tokenText)}</h${tokenLevel}>`;
    }
    const id = slugifyHeading(text, idMap);
    return `<h${level} id="${id}">${marked.parseInline(text || '')}</h${level}>`;
  };
  return renderer;
}

const posts = ref([]);
const categories = ref([]);
const tags = ref([]);
const categoryMap = ref({});
const categoryColorMap = ref({});
const tagMap = ref({});
const loading = ref(true);
const error = ref('');
const markdownTheme = ref('default');
const view = ref('home');
const activeSlug = ref('');
const mobileOpen = ref(false);
const showToc = ref(false);
const showBackTop = ref(false);
const activeHeadingId = ref('');
let tocObserver = null;
let tocScrollRaf = null;

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
  window.scrollTo({ top: 0, behavior: 'auto' });
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

function buildToc(markdown) {
  if (!markdown) return [];
  const tokens = marked.lexer(markdown);
  const idMap = new Map();
  return tokens
    .filter((token) => token.type === 'heading')
    .map((token) => {
      const text = token.text || '';
      return {
        id: slugifyHeading(text, idMap),
        text: inlineMarkdownToText(text),
        level: token.depth || 1,
      };
    })
    .filter((item) => item.level >= 1 && item.level <= 4);
}

function handleScroll() {
  const y = window.scrollY || 0;
  const visible = y > 160 && view.value === 'detail';
  showToc.value = visible;
  showBackTop.value = visible;
}

function scrollToHeading(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const headerOffset = 96;
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top, behavior: 'smooth' });
}

function setupTocObserver() {
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  if (view.value !== 'detail') return;
  const container = document.querySelector('.md-editor-preview');
  if (!container) return;
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4'));
  if (headings.length === 0) return;
  activeHeadingId.value = headings[0].id || '';
  tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting && entry.target.id)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) {
        activeHeadingId.value = visible[0].target.id;
        syncTocScroll();
      }
    },
    {
      rootMargin: '0px 0px -70% 0px',
      threshold: 0.1,
    },
  );
  headings.forEach((heading) => tocObserver.observe(heading));
}

function syncTocScroll() {
  if (!showToc.value) return;
  if (tocScrollRaf) cancelAnimationFrame(tocScrollRaf);
  tocScrollRaf = requestAnimationFrame(() => {
    const list = document.querySelector('.toc-list');
    const active = document.querySelector('.toc-link-active');
    if (!list || !active) return;
    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.top < listRect.top || activeRect.bottom > listRect.bottom) {
      active.scrollIntoView({ block: 'center' });
    }
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
const activeIndex = computed(() => posts.value.findIndex((p) => p.slug === activeSlug.value));
const prevPost = computed(() => (activeIndex.value > 0 ? posts.value[activeIndex.value - 1] : null));
const nextPost = computed(() =>
  activeIndex.value >= 0 && activeIndex.value < posts.value.length - 1 ? posts.value[activeIndex.value + 1] : null,
);
const tocItems = computed(() => buildToc(activePost.value?.content || ''));
const tocBaseLevel = computed(() => {
  if (!tocItems.value.length) return 1;
  return Math.min(...tocItems.value.map((item) => item.level));
});
const markdownThemeClass = computed(() => `${markdownTheme.value}-theme`);
const renderedContent = computed(() => {
  if (!activePost.value) return '';
  const renderer = createRenderer();
  return marked.parse(activePost.value.content || '', { renderer });
});

async function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function loadData() {
  try {
    const useApi = import.meta.env.DEV;
    const base = import.meta.env.BASE_URL || '/';
    const postsUrl = useApi ? '/api/posts' : `${base}data/posts.json`;
    const categoriesUrl = useApi ? '/api/categories' : `${base}data/categories.json`;
    const tagsUrl = useApi ? '/api/tags' : `${base}data/tags.json`;
    const settingsUrl = useApi ? '/api/settings' : `${base}data/settings.json`;

    const [postsRes, categoriesRes, tagsRes, settingsRes] = await Promise.all([
      fetch(postsUrl),
      fetch(categoriesUrl),
      fetch(tagsUrl),
      fetch(settingsUrl),
    ]);

    if (!postsRes.ok || !categoriesRes.ok || !tagsRes.ok) {
      throw new Error('Failed to load data JSON files.');
    }

    const postsData = await postsRes.json();
    const categoriesData = await categoriesRes.json();
    const tagsData = await tagsRes.json();
    const settingsData = settingsRes.ok ? await settingsRes.json() : {};

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
    markdownTheme.value = settingsData.markdownTheme || 'default';

    syncFromHash();
  } catch (err) {
    error.value = err && err.message ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  window.addEventListener('hashchange', syncFromHash);
  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('click', handleCodeCopy);
  loadData();
});

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash);
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleCodeCopy);
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  if (tocScrollRaf) {
    cancelAnimationFrame(tocScrollRaf);
    tocScrollRaf = null;
  }
});

watch(view, () => {
  handleScroll();
});

watch(
  () => [view.value, activePost.value?.content],
  async () => {
    await nextTick();
    setupTocObserver();
    syncTocScroll();
  },
);

watch(showToc, (visible) => {
  if (visible) {
    syncTocScroll();
  }
});

function handleCodeCopy(event) {
  const btn = event.target?.closest?.('.code-copy');
  if (!btn) return;
  const encoded = btn.getAttribute('data-code') || '';
  if (!encoded) return;
  copyToClipboard(decodeBase64(encoded)).then(() => {
    const textEl = btn.querySelector('.code-copy-text');
    if (textEl) {
      textEl.textContent = '已复制';
      setTimeout(() => {
        textEl.textContent = '复制';
      }, 1200);
    }
  }).catch(() => {});
}
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

.md-preview {
  background: transparent;
}
.md-preview .md-editor-preview {
  padding: 0;
  background: transparent;
  color: #9ca3af;
}
.md-preview .md-editor-preview h1,
.md-preview .md-editor-preview h2,
.md-preview .md-editor-preview h3,
.md-preview .md-editor-preview h4,
.md-preview .md-editor-preview h5,
.md-preview .md-editor-preview h6 {
  color: #f3f4f6;
}
.md-preview .md-editor-preview h1,
.md-preview .md-editor-preview h2,
.md-preview .md-editor-preview h3,
.md-preview .md-editor-preview h4 {
  scroll-margin-top: 96px;
}

.md-preview .code-block {
  background: #1f2328;
  border: 1px solid #24292f;
  border-radius: 12px;
  overflow: hidden;
  margin: 18px 0;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}

.md-preview .code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1c2025;
  border-bottom: 1px solid #2a2f36;
}

.md-preview .code-dots {
  display: inline-flex;
  gap: 6px;
}

.md-preview .code-dots i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}

.md-preview .code-dots i:nth-child(1) { background: #ff5f56; }
.md-preview .code-dots i:nth-child(2) { background: #ffbd2e; }
.md-preview .code-dots i:nth-child(3) { background: #27c93f; }

.md-preview .code-lang {
  font-size: 0.7rem;
  text-transform: lowercase;
  letter-spacing: 0.06em;
  color: #9aa4b2;
}

.md-preview .code-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.md-preview .code-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #cbd5f5;
  font-size: 0.7rem;
  background: rgba(15, 23, 42, 0.35);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.md-preview .code-copy:hover {
  border-color: rgba(99, 102, 241, 0.6);
  color: #e0e7ff;
  background: rgba(99, 102, 241, 0.15);
}

.md-preview .code-copy .iconify {
  font-size: 0.85rem;
}

.md-preview .code-block pre {
  margin: 0;
  padding: 16px 18px;
  background: #1f2328;
  overflow-x: auto;
}

.md-preview .code-block pre::before,
.md-preview .code-block pre::after {
  display: none !important;
  content: none !important;
}

.md-preview .code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  background: transparent;
}

.detail-layout {
  position: relative;
}

.detail-content {
  max-width: 48rem;
  margin: 0 auto;
  min-width: 0;
}

.toc-panel {
  position: fixed;
  top: 120px;
  width: 220px;
  left: max(16px, calc(50% - 24rem - 220px - 32px - 200px));
  max-height: calc(100vh - 160px);
  padding: 16px 14px;
  border-radius: 14px;
  border: 1px solid rgba(31, 41, 55, 0.7);
  background: rgba(17, 24, 39, 0.92);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
  z-index: 40;
}

.toc-panel.toc-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.toc-title {
  color: #cbd5f5;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(70vh - 48px);
  overflow: auto;
}

.toc-list::-webkit-scrollbar {
  width: 6px;
}
.toc-list::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.35);
  border-radius: 999px;
}

.toc-item {
  position: relative;
}

.toc-link {
  width: 100%;
  text-align: left;
  font-size: 0.8rem;
  color: #9ca3af;
  line-height: 1.4;
  padding: 4px 6px;
  border-radius: 8px;
  transition: color 0.2s ease, background 0.2s ease;
}

.toc-link:hover {
  color: #e0e7ff;
  background: rgba(99, 102, 241, 0.12);
}

.toc-link-active {
  color: #e0e7ff;
  background: rgba(99, 102, 241, 0.22);
  box-shadow: inset 2px 0 0 rgba(99, 102, 241, 0.9);
}

.back-to-top {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(31, 41, 55, 0.8);
  background: rgba(31, 41, 55, 0.85);
  color: #e5e7eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, background 0.2s ease;
  z-index: 40;
}

.back-to-top:hover {
  transform: translateY(-4px);
  background: rgba(99, 102, 241, 0.35);
}

@media (max-width: 1100px) {
  .toc-panel {
    display: none;
  }
}
</style>
