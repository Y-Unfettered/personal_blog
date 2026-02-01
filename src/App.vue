<template>
  <div>
    <NavBar
      v-model="searchQuery"
      :items="visibleNavItems"
      :is-active="isNavActive"
      @nav="handleNavClick"
      @search="handleSearchInput"
      @submit="applySearch"
      @home="goHome"
    />
    <div v-if="emailCopied" class="toast">已复制邮箱</div>

    <main class="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-144px)]">
      <div v-if="loading" class="text-gray-400">Loading...</div>
      <div v-else-if="error" class="text-red-400">{{ error }}</div>

      <div v-else>
        <section v-if="view === 'home'" class="animate-slide-up space-y-10">
          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <HeroCarousel
              :slides="heroSlides"
              :active-index="heroIndex"
              @next="nextHero"
              @prev="prevHero"
              @select="heroIndex = $event"
              @open="openPost"
            />
            <ProfileCard
              :name="profile.name"
              :subtitle="profile.subtitle"
              :motto="profile.motto"
              :avatar="profile.avatar"
              @primary="setView('about')"
            />
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] gap-6">
            <div class="lg:col-start-1 lg:row-start-1">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h1 class="text-2xl font-bold text-white">{{ homeTitle }}</h1>
                </div>
                <button
                  v-if="hasActiveFilters"
                  class="text-xs text-indigo-400 hover:text-indigo-300"
                  type="button"
                  @click="clearFilters"
                >
                  清除筛选
                </button>
              </div>
            </div>
            <div class="lg:col-start-1 lg:row-start-2">
              <PostGrid
                :posts="filteredPosts"
                :category-name="categoryName"
                :category-badge-style="categoryBadgeStyle"
                :tag-summary="tagSummary"
                @open="openPost"
              />
            </div>
            <div class="hidden lg:block lg:col-start-2 lg:row-start-1"></div>
            <aside class="space-y-4 lg:col-start-2 lg:row-start-2">
              <CategorySidebar
                :categories="orderedCategories"
                :selected-id="selectedCategoryId"
                @select="selectCategory"
                @clear="clearCategoryFilter"
              />
              <TagSidebar
                :tags="orderedTags"
                :selected-id="selectedTagId"
                @select="selectTag"
                @clear="clearTagFilter"
              />
            </aside>
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
              v-for="cat in categoriesWithCounts"
              :key="cat.id"
              class="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-indigo-500/50 transition-all group cursor-pointer"
              @click="setCategoryFilter(cat.id)"
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

        <section v-else-if="view === 'column'" class="animate-slide-up">
          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] gap-6">
            <div class="lg:col-start-1 lg:row-start-1">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h1 class="text-2xl font-bold text-white">{{ columnTitle }}</h1>
                </div>
                <button
                  class="text-xs text-indigo-400 hover:text-indigo-300"
                  type="button"
                  @click="goHome"
                >
                  返回首页
                </button>
              </div>
            </div>
            <div class="lg:col-start-1 lg:row-start-2">
              <PostGrid
                :posts="columnPosts"
                :category-name="categoryName"
                :category-badge-style="categoryBadgeStyle"
                :tag-summary="tagSummary"
                @open="openPost"
              />
            </div>
            <div class="hidden lg:block lg:col-start-2 lg:row-start-1"></div>
            <aside class="space-y-4 lg:col-start-2 lg:row-start-2">
              <CategorySidebar
                :categories="orderedCategories"
                :selected-id="selectedCategoryId"
                @select="selectCategory"
                @clear="clearCategoryFilter"
              />
              <TagSidebar
                :tags="orderedTags"
                :selected-id="selectedTagId"
                @select="selectTag"
                @clear="clearTagFilter"
              />
            </aside>
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
                  <img
                    v-if="profile.avatar"
                    :src="profile.avatar"
                    :alt="profile.name"
                    class="rounded-full w-full h-full object-cover p-1 bg-indigo-500 shadow-xl shadow-indigo-500/20"
                  />
                  <div v-else class="rounded-full w-full h-full object-cover p-1 bg-indigo-500 shadow-xl shadow-indigo-500/20"></div>
                  <div class="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-[#161b22] rounded-full"></div>
                </div>
                <h2 class="text-xl font-bold text-white mb-2">{{ profile.name }}</h2>
                <p class="text-sm text-gray-400 mb-6 font-mono">{{ profile.subtitle }}</p>
                <div class="profile-social">
                  <button
                    class="profile-social-btn"
                    type="button"
                    :disabled="!profile.github"
                    aria-label="GitHub"
                    @click="openExternal(profile.github)"
                  >
                    <span class="iconify text-xl" data-icon="lucide:github"></span>
                  </button>
                  <button
                    class="profile-social-btn"
                    type="button"
                    :disabled="!profile.planet"
                    aria-label="知识星球"
                    @click="openExternal(profile.planet)"
                  >
                    <img class="profile-social-icon" src="https://img.lemontop.asia/zhishi.svg" alt="知识星球" />
                  </button>
                  <button
                    class="profile-social-btn"
                    type="button"
                    :disabled="!profile.email"
                    aria-label="邮箱"
                    @click="copyProfileEmail"
                  >
                    <span class="iconify text-xl" data-icon="lucide:mail"></span>
                  </button>
                </div>
              </div>
            </div>
            <div class="md:col-span-2 space-y-8">
              <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-8">
                <h3 class="text-xl font-bold text-white mb-6 flex items-center">
                  <span class="iconify text-indigo-500 mr-3" data-icon="lucide:user"></span> {{ about.title }}
                </h3>
                <p class="text-gray-400 leading-relaxed text-sm">
                  {{ about.content }}
                </p>
              </div>
              <div class="bg-[#161b22] border border-gray-800 rounded-2xl p-8">
                <h3 class="text-xl font-bold text-white mb-6 flex items-center">
                  <span class="iconify text-indigo-500 mr-3" data-icon="lucide:zap"></span> {{ about.skillsTitle }}
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div v-for="(skill, idx) in about.skills" :key="`skill-${idx}`" class="flex items-center space-x-3 p-3 bg-gray-900 rounded-xl">
                    <span class="iconify text-lg" :data-icon="skill.icon" :style="{ color: skill.color || '#a3a3a3' }"></span>
                    <span class="text-sm font-semibold">{{ skill.label }}</span>
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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import NavBar from './components/NavBar.vue';
import HeroCarousel from './components/HeroCarousel.vue';
import ProfileCard from './components/ProfileCard.vue';
import PostGrid from './components/PostGrid.vue';
import CategorySidebar from './components/CategorySidebar.vue';
import TagSidebar from './components/TagSidebar.vue';

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
const navItems = ref([]);
const categoryMap = ref({});
const categoryColorMap = ref({});
const tagMap = ref({});
const loading = ref(true);
const error = ref('');
const markdownTheme = ref('default');
const view = ref('home');
const activeSlug = ref('');
const searchQuery = ref('');
const selectedCategoryId = ref('');
const selectedTagId = ref('');
const profile = reactive({
  name: 'Lemon',
  subtitle: '记录灵感 · 设计 · 代码',
  motto: '以持续输出为信仰，把每一次学习都变成可复用的经验。',
  avatar: '',
  github: '',
  planet: '',
  email: '',
});
const about = reactive({
  title: '关于这个博客',
  content: '这里记录我的学习、实验与思考。内容聚焦于现代 Web 开发、效率工具和工程实践。',
  skillsTitle: '核心技能栈',
  skills: [
    { label: 'TypeScript', icon: 'logos:typescript-icon', color: '#34d399' },
    { label: 'Rust', icon: 'logos:rust', color: '#f97316' },
    { label: 'React', icon: 'logos:react', color: '#60a5fa' },
    { label: 'Cloud Native', icon: 'logos:ebpf', color: '#a855f7' },
  ],
});
const showToc = ref(false);
const showBackTop = ref(false);
const emailCopied = ref(false);
const activeColumnLabel = ref('');
const activeColumnPath = ref('');
const activeColumnCategoryId = ref('');
const activeHeadingId = ref('');
let tocObserver = null;
let tocScrollRaf = null;
const heroIndex = ref(0);
let heroTimer = null;
let emailCopyTimer = null;

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

const DEFAULT_NAV = [
  { id: 'nav-home', label: '首页', href: '#/' },
  { id: 'nav-design', label: '设计创作', href: '#/category/设计创作' },
  { id: 'nav-tech', label: '技术笔记', href: '#/category/技术笔记' },
  { id: 'nav-tools', label: '工具分享', href: '#/category/工具分享' },
  { id: 'nav-issues', label: '问题记录', href: '#/category/问题记录' },
  { id: 'nav-life', label: '生活随笔', href: '#/category/生活随笔' },
  { id: 'nav-about', label: '关于我', href: '#/about' },
];

function setView(nextView) {
  view.value = nextView;
  if (nextView !== 'column') {
    activeColumnLabel.value = '';
    activeColumnPath.value = '';
    activeColumnCategoryId.value = '';
  }
  if (nextView !== 'home') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
  }
  if (nextView === 'home') {
    window.location.hash = '#/';
  } else {
    window.location.hash = `#/${nextView}`;
  }
}

function goHome() {
  clearFilters();
  setView('home');
}

function normalizeNavHref(item) {
  return item && item.href ? String(item.href).trim() : '';
}

function normalizePath(value) {
  if (!value) return '';
  let path = String(value).trim();
  if (path.startsWith('#')) path = path.slice(1);
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

function isColumnNavItem(item) {
  if (!item) return false;
  const path = normalizePath(item.href).toLowerCase();
  if (!path || path === '/' || path === '#/' || path === '#') return false;
  if (path.includes('/about')) return false;
  return true;
}

function findNavByPath(path) {
  const target = normalizePath(path).toLowerCase();
  const list = visibleNavItems.value;
  return list.find((item) => normalizePath(item.href).toLowerCase() === target);
}

function setColumnView(navItem) {
  if (!navItem) return;
  const label = String(navItem.label || '').trim();
  const path = normalizePath(navItem.href);
  activeColumnLabel.value = label;
  activeColumnPath.value = path;
  const cat = findCategoryBySlugOrName(label);
  activeColumnCategoryId.value = cat ? cat.id : '';
  view.value = 'column';
  selectedCategoryId.value = '';
  selectedTagId.value = '';
}

function setColumnViewByPath(path) {
  const nav = findNavByPath(path);
  if (!nav || !isColumnNavItem(nav)) return false;
  setColumnView(nav);
  return true;
}

function categorySlugFromId(categoryId) {
  const cat = categories.value.find((c) => c.id === categoryId);
  if (!cat) return categoryId || '';
  return cat.slug || cat.id;
}

function tagSlugFromId(tagId) {
  const tag = tags.value.find((t) => t.id === tagId);
  if (!tag) return tagId || '';
  return tag.slug || tag.id;
}

function findCategoryBySlugOrName(slugOrName) {
  const key = String(slugOrName || '').trim();
  if (!key) return null;
  return (
    categories.value.find((c) => c.slug === key) ||
    categories.value.find((c) => c.id === key) ||
    categories.value.find((c) => c.name === key)
  );
}

function findTagBySlugOrName(slugOrName) {
  const key = String(slugOrName || '').trim();
  if (!key) return null;
  return (
    tags.value.find((t) => t.slug === key) ||
    tags.value.find((t) => t.id === key) ||
    tags.value.find((t) => t.name === key)
  );
}

function setCategoryFilter(categoryId) {
  selectedCategoryId.value = categoryId || '';
  selectedTagId.value = '';
  view.value = 'home';
  const slug = categorySlugFromId(categoryId);
  window.location.hash = slug ? `#/category/${encodeURIComponent(slug)}` : '#/';
}

function setTagFilter(tagId) {
  selectedTagId.value = tagId || '';
  selectedCategoryId.value = '';
  view.value = 'home';
  const slug = tagSlugFromId(tagId);
  window.location.hash = slug ? `#/tag/${encodeURIComponent(slug)}` : '#/';
}

function clearCategoryFilter() {
  selectedCategoryId.value = '';
  window.location.hash = '#/';
}

function clearTagFilter() {
  selectedTagId.value = '';
  window.location.hash = '#/';
}

function clearFilters() {
  searchQuery.value = '';
  selectedCategoryId.value = '';
  selectedTagId.value = '';
}

function handleNavClick(item) {
  const href = normalizeNavHref(item);
  if (/^https?:\/\//i.test(href)) {
    window.open(href, '_blank');
    return;
  }
  if (href.startsWith('#/category/')) {
    const slug = decodeURIComponent(href.replace('#/category/', '').trim());
    const cat = findCategoryBySlugOrName(slug);
    if (cat) setCategoryFilter(cat.id);
    else window.location.hash = href;
    return;
  }
  if (href.startsWith('#/tag/')) {
    const slug = decodeURIComponent(href.replace('#/tag/', '').trim());
    const tag = findTagBySlugOrName(slug);
    if (tag) setTagFilter(tag.id);
    else window.location.hash = href;
    return;
  }
  if (href === '#/' || href === '#') {
    clearFilters();
    setView('home');
    return;
  }
  if (href === '#/about') {
    setView('about');
    return;
  }
  if (href) {
    if (setColumnViewByPath(href)) {
      window.location.hash = `#${normalizePath(href)}`;
      return;
    }
    window.location.hash = href;
    return;
  }
  const fallback = findCategoryBySlugOrName(item?.label || '');
  if (fallback) {
    setCategoryFilter(fallback.id);
  }
}

function handleSearchInput() {
  if (view.value !== 'home') {
    view.value = 'home';
    window.location.hash = '#/';
  }
}

function applySearch() {
  handleSearchInput();
}

function isNavActive(item) {
  const href = normalizeNavHref(item);
  if (!href || href === '#/' || href === '#') {
    return view.value === 'home' && !selectedCategoryId.value;
  }
  if (href === '#/about') return view.value === 'about';
  if (href.startsWith('#/category/')) {
    const slug = decodeURIComponent(href.replace('#/category/', '').trim());
    const cat = findCategoryBySlugOrName(slug);
    return cat ? selectedCategoryId.value === cat.id : false;
  }
  if (href.startsWith('#/tag/')) {
    const slug = decodeURIComponent(href.replace('#/tag/', '').trim());
    const tag = findTagBySlugOrName(slug);
    return tag ? selectedTagId.value === tag.id : false;
  }
  if (view.value === 'column') {
    return normalizePath(href) === activeColumnPath.value;
  }
  return false;
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

function selectCategory(cat) {
  if (!cat) return;
  setCategoryFilter(cat.id);
}

function selectTag(tag) {
  if (!tag) return;
  setTagFilter(tag.id);
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

function matchesSearch(post, query) {
  if (!query) return true;
  const q = String(query || '').toLowerCase();
  const categoriesText = (post.categories || []).map((id) => categoryName(id)).join(' ');
  const tagsText = (post.tags || []).map((id) => tagMap.value[id] || id).join(' ');
  const base = `${post.title || ''} ${post.summary || ''} ${categoriesText} ${tagsText}`.toLowerCase();
  return base.includes(q);
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

function nextHero() {
  if (!heroSlides.value.length) return;
  heroIndex.value = (heroIndex.value + 1) % heroSlides.value.length;
}

function prevHero() {
  if (!heroSlides.value.length) return;
  heroIndex.value = (heroIndex.value - 1 + heroSlides.value.length) % heroSlides.value.length;
}

function startHeroTimer() {
  if (heroTimer) clearInterval(heroTimer);
  if (heroSlides.value.length <= 1) return;
  heroTimer = setInterval(() => {
    nextHero();
  }, 6000);
}

function syncFromHash() {
  const hash = window.location.hash || '#/';
  if (hash.startsWith('#/post/')) {
    view.value = 'detail';
    activeSlug.value = hash.replace('#/post/', '').trim();
    return;
  }
  if (hash.startsWith('#/category/')) {
    const slug = decodeURIComponent(hash.replace('#/category/', '').trim());
    const cat = findCategoryBySlugOrName(slug);
    if (cat) selectedCategoryId.value = cat.id;
    selectedTagId.value = '';
    view.value = 'home';
    return;
  }
  if (hash.startsWith('#/tag/')) {
    const slug = decodeURIComponent(hash.replace('#/tag/', '').trim());
    const tag = findTagBySlugOrName(slug);
    if (tag) selectedTagId.value = tag.id;
    selectedCategoryId.value = '';
    view.value = 'home';
    return;
  }
  if (hash === '#/categories') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'categories');
  }
  if (hash === '#/tags') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'tags');
  }
  if (hash === '#/about') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'about');
  }
  const path = normalizePath(hash);
  if (setColumnViewByPath(path)) {
    return;
  }
  view.value = 'home';
}

const categoryCounts = computed(() => {
  const counts = {};
  posts.value.forEach((post) => {
    if (!Array.isArray(post.categories)) return;
    post.categories.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return counts;
});

const tagCounts = computed(() => {
  const counts = {};
  posts.value.forEach((post) => {
    if (!Array.isArray(post.tags)) return;
    post.tags.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return counts;
});

const categoriesWithCounts = computed(() =>
  categories.value.map((cat) => ({
    ...cat,
    count: categoryCounts.value[cat.id] || 0,
  })),
);

const tagsWithCounts = computed(() =>
  tags.value.map((tag) => ({
    ...tag,
    count: tagCounts.value[tag.id] || 0,
  })),
);

const orderedCategories = computed(() =>
  categoriesWithCounts.value
    .slice()
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return String(a.name || '').localeCompare(String(b.name || ''));
    }),
);

const orderedTags = computed(() =>
  tagsWithCounts.value
    .slice()
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return String(a.name || '').localeCompare(String(b.name || ''));
    }),
);

const visibleNavItems = computed(() => {
  const list = Array.isArray(navItems.value) && navItems.value.length ? navItems.value : DEFAULT_NAV;
  return list
    .filter((item) => item && item.label && item.visible !== false)
    .slice()
    .sort((a, b) => (Number(a.order || 0) || 0) - (Number(b.order || 0) || 0));
});

const heroSlides = computed(() => {
  const slides = posts.value.filter((post) => post.pinned && post.cover).slice(0, 4);
  return slides;
});

const filteredPosts = computed(() => {
  const query = String(searchQuery.value || '').trim();
  let list = posts.value.slice();
  if (selectedCategoryId.value) {
    list = list.filter((post) => Array.isArray(post.categories) && post.categories.includes(selectedCategoryId.value));
  }
  if (selectedTagId.value) {
    list = list.filter((post) => Array.isArray(post.tags) && post.tags.includes(selectedTagId.value));
  }
  if (query) {
    list = list.filter((post) => matchesSearch(post, query));
  }
  return list;
});

const columnPosts = computed(() => {
  const query = String(searchQuery.value || '').trim();
  let list = posts.value.slice();
  if (activeColumnCategoryId.value) {
    list = list.filter((post) => Array.isArray(post.categories) && post.categories.includes(activeColumnCategoryId.value));
  } else if (activeColumnLabel.value) {
    list = list.filter((post) =>
      Array.isArray(post.categories) && post.categories.some((id) => categoryMap.value[id] === activeColumnLabel.value)
    );
  } else {
    list = [];
  }
  if (query) {
    list = list.filter((post) => matchesSearch(post, query));
  }
  return list;
});

const columnTitle = computed(() => activeColumnLabel.value || '栏目');

const hasActiveFilters = computed(() => {
  return !!(selectedCategoryId.value || selectedTagId.value || String(searchQuery.value || '').trim());
});

const homeTitle = computed(() => {
  if (selectedCategoryId.value) {
    const cat = categories.value.find((c) => c.id === selectedCategoryId.value);
    return cat ? `当前分类：${cat.name}` : '当前分类';
  }
  if (selectedTagId.value) {
    const tag = tags.value.find((t) => t.id === selectedTagId.value);
    return tag ? `当前标签：${tag.name}` : '当前标签';
  }
  const query = String(searchQuery.value || '').trim();
  if (query) return `搜索结果：${query}`;
  return '最新发布';
});

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

function openExternal(url) {
  const target = String(url || '').trim();
  if (!target) return;
  const href = /^https?:\/\//i.test(target) ? target : `https://${target}`;
  window.open(href, '_blank', 'noopener');
}

async function copyProfileEmail() {
  const email = String(profile.email || '').trim();
  if (!email) return;
  try {
    await copyToClipboard(email);
    emailCopied.value = true;
    if (emailCopyTimer) clearTimeout(emailCopyTimer);
    emailCopyTimer = setTimeout(() => {
      emailCopied.value = false;
    }, 1500);
  } catch {
    // ignore
  }
}

async function loadData() {
  try {
    const useApi = import.meta.env.DEV;
    const base = import.meta.env.BASE_URL || '/';
    const postsUrl = useApi ? '/api/posts' : `${base}data/posts.json`;
    const categoriesUrl = useApi ? '/api/categories' : `${base}data/categories.json`;
    const tagsUrl = useApi ? '/api/tags' : `${base}data/tags.json`;
    const navUrl = useApi ? '/api/nav' : `${base}data/nav.json`;
    const settingsUrl = useApi ? '/api/settings' : `${base}data/settings.json`;

    const [postsRes, categoriesRes, tagsRes, settingsRes, navRes] = await Promise.all([
      fetch(postsUrl),
      fetch(categoriesUrl),
      fetch(tagsUrl),
      fetch(settingsUrl),
      fetch(navUrl).catch(() => null),
    ]);

    if (!postsRes.ok || !categoriesRes.ok || !tagsRes.ok) {
      throw new Error('Failed to load data JSON files.');
    }

    const postsData = await postsRes.json();
    const categoriesData = await categoriesRes.json();
    const tagsData = await tagsRes.json();
    const settingsData = settingsRes.ok ? await settingsRes.json() : {};
    const navData = navRes && navRes.ok ? await navRes.json() : null;

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
    navItems.value = useApi
      ? (Array.isArray(navData) ? navData : [])
      : (Array.isArray(navData?.nav) ? navData.nav : []);
    categoryMap.value = Object.fromEntries(categories.value.map((c) => [c.id, c.name]));
    categoryColorMap.value = Object.fromEntries(categories.value.map((c) => [c.id, c.color || '#6366f1']));
    tagMap.value = Object.fromEntries(tags.value.map((t) => [t.id, t.name]));
    markdownTheme.value = settingsData.markdownTheme || 'default';
    const profileData = settingsData.profile || {};
    profile.name = profileData.name || profile.name;
    profile.subtitle = profileData.subtitle || profile.subtitle;
    profile.motto = profileData.motto || profile.motto;
    profile.avatar = profileData.avatar || profile.avatar;
    profile.github = profileData.github || profile.github;
    profile.planet = profileData.planet || profile.planet;
    profile.email = profileData.email || profile.email;
    const aboutData = settingsData.about || {};
    about.title = aboutData.title || about.title;
    about.content = aboutData.content || about.content;
    about.skillsTitle = aboutData.skillsTitle || about.skillsTitle;
    if (Array.isArray(aboutData.skills) && aboutData.skills.length) {
      about.skills = aboutData.skills;
    }

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
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  if (tocScrollRaf) {
    cancelAnimationFrame(tocScrollRaf);
    tocScrollRaf = null;
  }
  if (emailCopyTimer) {
    clearTimeout(emailCopyTimer);
    emailCopyTimer = null;
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

watch(heroSlides, () => {
  if (heroIndex.value >= heroSlides.value.length) {
    heroIndex.value = 0;
  }
  startHeroTimer();
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

.card-title {
  line-height: 1.4;
  height: calc(1.4em * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-summary {
  line-height: 1.5;
  height: calc(1.5em * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-card {
  border-radius: 24px;
  border: 1px solid rgba(31, 41, 55, 0.7);
  overflow: hidden;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.85));
  min-height: 320px;
  position: relative;
}

.hero-carousel {
  position: relative;
  height: 320px;
}

.hero-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.6s ease;
  cursor: pointer;
  pointer-events: none;
}

.hero-slide.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.85);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 28px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.85));
}

.hero-content {
  max-width: 70%;
}

.hero-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.65rem;
  color: #93c5fd;
  margin-bottom: 8px;
}

.hero-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 8px;
  line-height: 1.3;
}

.hero-desc {
  font-size: 0.85rem;
  color: #d1d5db;
  max-width: 26rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-cta {
  margin-top: 16px;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(147, 197, 253, 0.5);
  color: #e0f2fe;
  font-size: 0.75rem;
  background: rgba(59, 130, 246, 0.18);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.hero-cta:hover {
  transform: translateY(-1px);
  border-color: rgba(147, 197, 253, 0.9);
}

.hero-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.6);
  color: #e5e7eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hero-card:hover .hero-nav {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) scale(1.02);
}

.hero-prev {
  left: 16px;
}

.hero-next {
  right: 16px;
}

.hero-dots {
  position: absolute;
  bottom: 14px;
  right: 18px;
  z-index: 2;
  display: inline-flex;
  gap: 6px;
}

.hero-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.6);
  border: none;
}

.hero-dot.active {
  background: #60a5fa;
}

.profile-card {
  background: rgba(22, 27, 34, 0.9);
  border: 1px solid rgba(31, 41, 55, 0.7);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 320px;
}

.profile-avatar {
  width: 84px;
  height: 84px;
  margin: 0 auto 12px;
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-ring {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: conic-gradient(from 90deg, #38bdf8, #6366f1, #22c55e, #38bdf8);
}

.profile-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 20px;
}

.profile-actions button {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.18);
  color: #e0e7ff;
}

.profile-actions .ghost {
  background: transparent;
  border-color: rgba(148, 163, 184, 0.4);
  color: #cbd5f5;
}

.profile-social {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.profile-social-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: transparent;
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.profile-social-btn:hover {
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(99, 102, 241, 0.12);
}

.profile-social-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.profile-social-icon {
  width: 20px;
  height: 20px;
}

.toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.45);
  background: rgba(5, 150, 105, 0.2);
  color: #d1fae5;
  font-size: 0.75rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
  animation: toastIn 0.2s ease-out;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translate(-50%, -6px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.category-card {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 14px;
  border: 1px solid rgba(31, 41, 55, 0.8);
  background: rgba(15, 23, 42, 0.35);
  color: #cbd5f5;
  font-size: 0.75rem;
  white-space: nowrap;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.category-card:hover {
  border-color: rgba(99, 102, 241, 0.6);
  transform: translateX(2px);
}

.category-card.active {
  border-color: rgba(99, 102, 241, 0.9);
  background: rgba(99, 102, 241, 0.15);
  color: #e0e7ff;
}

.category-name {
  font-weight: 600;
}

.category-count {
  font-size: 0.7rem;
  color: #9ca3af;
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
