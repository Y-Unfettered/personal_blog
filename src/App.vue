﻿﻿﻿﻿﻿<template>
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
                :posts="homePosts"
                :category-name="categoryName"
                :category-badge-style="categoryBadgeStyle"
                :tag-summary="tagSummary"
                @open="openPost"
              />
              <div v-if="homeHasMore" class="home-more-card mt-8">
                <div class="home-more-glow"></div>
                <div class="home-more-content">
                  <div class="home-more-kicker">更多精彩</div>
                  <h3 class="home-more-title">想了解更多？</h3>
                  <p class="home-more-text">首页仅展示最近 10 篇文章，更多内容请浏览我的其他栏目。</p>
                </div>
                <button class="home-more-action" type="button" @click="setView('categories')">
                  查看栏目 <span class="iconify ml-1" data-icon="lucide:arrow-right"></span>
                </button>
              </div>
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
          <div class="columns-hero">
            <div class="columns-hero-bg"></div>
            <div class="columns-hero-content">
              <div class="columns-hero-kicker">栏目导航</div>
              <h1 class="columns-hero-title">精选五大专栏</h1>
              <p class="columns-hero-text">用更少的栏目承载更多内容，让浏览更清晰。</p>
            </div>
          </div>
          <div class="columns-grid">
            <button
              v-for="(item, index) in columnNavItems.slice(0, 5)"
              :key="item.id || item.label || index"
              class="columns-card"
              type="button"
              @click="handleNavClick(item)"
            >
              <div class="columns-card-media" :style="{ backgroundImage: `url(${columnImage(item, index)})` }"></div>
              <div class="columns-card-overlay"></div>
              <div class="columns-card-content">
                <div class="columns-card-kicker">专栏</div>
                <div class="columns-card-title">{{ item.label }}</div>
                <div class="columns-card-cta">
                  进入栏目 <span class="iconify ml-1" data-icon="lucide:arrow-right"></span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section v-else-if="view === 'column'" class="animate-slide-up">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- 左侧内容区：文章列表 -->
            <div class="col-span-1 lg:col-span-2 space-y-10">
              <div class="flex items-center justify-between border-b border-gray-800 pb-4">
                <h2 class="text-2xl font-bold text-white flex items-center">
                  <span class="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span>
                  {{ activeColumnLabel }}
                  <span class="ml-3 text-sm font-normal text-gray-500">共 {{ columnPosts.length }} 篇文章</span>
                </h2>
                <div class="flex space-x-2">
                  <button class="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-full">最新</button>
                  <button class="px-4 py-1.5 bg-gray-900 text-gray-400 text-xs rounded-full hover:bg-gray-800">热门</button>
                </div>
              </div>
              
              <!-- 文章卡片列表 -->
              <div class="space-y-6">
                <div
                  v-for="(post, index) in columnPosts"
                  :key="post.id"
                  class="bg-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all group"
                >
                  <div class="flex flex-col md:flex-row">
                    <div v-if="post.cover" class="md:w-72 h-48 md:h-auto relative overflow-hidden">
                      <img
                        :src="post.cover"
                        :alt="post.title"
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <span class="absolute top-4 left-4 bg-indigo-600 text-[10px] font-bold px-2 py-1 rounded">{{ activeColumnLabel }}</span>
                    </div>
                    <div v-else class="md:w-72 h-48 md:h-auto relative overflow-hidden bg-gray-800 flex items-center justify-center">
                      <span class="iconify text-4xl text-gray-700" data-icon="lucide:file-text"></span>
                      <span class="absolute top-4 left-4 bg-indigo-600 text-[10px] font-bold px-2 py-1 rounded">{{ activeColumnLabel }}</span>
                    </div>
                    <div class="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div class="flex items-center space-x-3 text-xs text-gray-500 mb-3">
                          <span class="flex items-center"><span class="iconify mr-1" data-icon="lucide:calendar"></span>{{ post.created_at }}</span>
                          <span class="flex items-center"><span class="iconify mr-1" data-icon="lucide:clock"></span>{{ post.readingTime || 5 }} min read</span>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                          <span v-if="post.pinned" class="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded mr-2 align-middle">置顶</span>
                          {{ post.title }}
                        </h3>
                        <p class="text-gray-400 text-sm leading-relaxed line-clamp-2">{{ post.summary }}</p>
                      </div>
                      <div class="mt-6 flex items-center justify-between">
                        <div class="flex space-x-2">
                          <span
                            v-for="(tag, idx) in post.tags"
                            :key="idx"
                            class="text-[10px] text-gray-500 border border-gray-800 px-2 py-0.5 rounded-full"
                          ># {{ tag }}</span>
                        </div>
                        <button class="text-indigo-400 text-xs font-bold flex items-center group/btn" @click="openPost(post)">
                          立即阅读 <span class="iconify ml-1 group-hover/btn:translate-x-1 transition-transform" data-icon="lucide:arrow-right"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 分页 -->
              <div class="flex justify-center space-x-2 pt-8">
                <button class="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <span class="iconify" data-icon="lucide:chevron-left"></span>
                </button>
                <button class="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold text-sm">1</button>
                <button class="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 font-bold text-sm hover:border-indigo-500 hover:text-white transition-all">2</button>
                <button class="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <span class="iconify" data-icon="lucide:chevron-right"></span>
                </button>
              </div>
            </div>
            
            <!-- 右侧边栏 -->
            <div class="col-span-1 space-y-8">
              <!-- 个人资料 -->
              <div class="bg-gray-900/20 border border-gray-800 rounded-3xl p-8 text-center relative overflow-hidden group">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                <img
                  v-if="profile.avatar"
                  :src="profile.avatar"
                  :alt="profile.name"
                  class="w-24 h-24 rounded-full mx-auto mb-4 p-1 ring-2 ring-indigo-500/30 group-hover:rotate-12 transition-transform duration-500"
                />
                <div v-else class="w-24 h-24 rounded-full mx-auto mb-4 p-1 ring-2 ring-indigo-500/30 group-hover:rotate-12 transition-transform duration-500 bg-gray-800 flex items-center justify-center">
                  <span class="iconify text-4xl text-gray-600" data-icon="lucide:user"></span>
                </div>
                <h3 class="text-xl font-bold text-white">{{ profile.name }}</h3>
                <p class="text-xs text-gray-500 mt-2">{{ profile.subtitle }}</p>
                <p class="text-sm text-gray-400 mt-4 leading-relaxed">{{ profile.motto }}</p>
                <div class="flex justify-center space-x-4 mt-6">
                  <a v-if="profile.github" class="text-gray-500 hover:text-indigo-400 transition-colors" :href="profile.github" target="_blank"><span class="iconify text-xl" data-icon="lucide:github"></span></a>
                  <a v-if="profile.planet" class="text-gray-500 hover:text-indigo-400 transition-colors" :href="profile.planet" target="_blank"><span class="iconify text-xl" data-icon="lucide:globe"></span></a>
                  <a v-if="profile.email" class="text-gray-500 hover:text-indigo-400 transition-colors" @click="copyProfileEmail"><span class="iconify text-xl" data-icon="lucide:mail"></span></a>
                </div>
                <button class="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-1" @click="setView('about')">了解我</button>
              </div>
              
              <!-- 分类统计 -->
              <div class="bg-gray-900/20 border border-gray-800 rounded-3xl p-6">
                <h4 class="text-sm font-bold text-white mb-6 flex items-center">
                  <span class="iconify mr-2 text-indigo-400" data-icon="lucide:folder-open"></span>
                  全部分类
                </h4>
                <div class="space-y-3">
                  <a
                    v-for="cat in categoriesWithCounts"
                    :key="cat.id"
                    class="flex justify-between items-center p-3 rounded-xl hover:bg-gray-800 transition-colors group"
                    :class="{ 'bg-indigo-500/5 text-indigo-400 border border-indigo-500/20': cat.name === activeColumnLabel }"
                    @click="setCategoryFilter(cat.id)"
                  >
                    <span class="text-xs font-medium">{{ cat.name }}</span>
                    <span class="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full group-hover:bg-gray-700">{{ cat.count }}</span>
                  </a>
                </div>
              </div>
              
              <!-- 热门标签 -->
              <div class="bg-gray-900/20 border border-gray-800 rounded-3xl p-6">
                <h4 class="text-sm font-bold text-white mb-6 flex items-center">
                  <span class="iconify mr-2 text-indigo-400" data-icon="lucide:tag"></span>
                  全部标签
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in tagsWithCounts"
                    :key="tag.id"
                    class="px-3 py-1.5 bg-gray-800 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg text-xs text-gray-400 cursor-pointer transition-all"
                  >{{ tag.name }} ({{ tag.count }})</span>
                </div>
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

        <section v-else-if="view === 'design'" class="animate-slide-up">
          <header class="mb-12">
            <h1 class="text-3xl font-bold text-white mb-4">????</h1>
            <p class="text-gray-400 mb-8 max-w-2xl">?? AI ???UI ???????????????????????????</p>
            <div class="flex flex-wrap gap-3">
              <button class="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all">????</button>
              <button class="px-5 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm hover:border-gray-600 transition-all">AI ????</button>
              <button class="px-5 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm hover:border-gray-600 transition-all">Prompt ??</button>
              <button class="px-5 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm hover:border-gray-600 transition-all">UI/UX ??</button>
              <button class="px-5 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm hover:border-gray-600 transition-all">????</button>
            </div>
          </header>
          <div v-if="designPosts.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <button
              v-for="(post, index) in designPosts"
              :key="post.id"
              class="group relative bg-[#111] rounded-2xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-all duration-300 animate-fade-in text-left"
              :style="{ animationDelay: (0.1 + index * 0.1) + 's' }"
              type="button"
              @click="openPost(post)"
            >
              <div class="aspect-[4/5] overflow-hidden">
                <img v-if="post.cover" :alt="post.title" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" :src="post.cover" />
                <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded uppercase tracking-widest font-bold">
                    {{ categoryName((post.categories || [])[0]) || 'Design' }}
                  </span>
                  <span class="text-gray-400 text-xs">{{ post.created_at }}</span>
                </div>
                <h3 class="text-white text-lg font-bold mb-2">{{ post.title }}</h3>
                <p class="text-gray-300 text-sm line-clamp-2">{{ post.summary }}</p>
              </div>
            </button>
          </div>
          <div v-else class="text-gray-500 text-sm">?????????</div>
        </section>

        <section v-else-if="view === 'tools'" class="animate-slide-up">
          <!-- 头部介绍 -->
          <header class="mb-12">
            <h1 class="text-3xl font-bold text-white mb-4">工具分享</h1>
            <p class="text-gray-400 text-sm max-w-xl">这里汇集了我开发的在线工具，以及在漫长 Coding 生涯中发现的高效利器。赋能创意，简化流程。</p>
          </header>
          <div class="flex flex-col lg:flex-row gap-8">
            <!-- 左侧分类 -->
            <aside class="w-full lg:w-48 space-y-6">
              <div>
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">全部分类</h3>
                <div class="space-y-1">
                  <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium">
                    <span>全部</span>
                    <span class="text-[10px] bg-indigo-500/20 px-1.5 rounded-full">12</span>
                  </button>
                  <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 text-sm transition-all">
                    <span>在线工具</span>
                    <span class="text-[10px] bg-gray-800 px-1.5 rounded-full">4</span>
                  </button>
                  <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 text-sm transition-all">
                    <span>提效插件</span>
                    <span class="text-[10px] bg-gray-800 px-1.5 rounded-full">5</span>
                  </button>
                  <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 text-sm transition-all">
                    <span>收藏网站</span>
                    <span class="text-[10px] bg-gray-800 px-1.5 rounded-full">3</span>
                  </button>
                </div>
              </div>
            </aside>
            <!-- 右侧工具网格 -->
            <div class="flex-1">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- 工具卡片 1 -->
                <div class="bg-[#111] border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group animate-slide-up">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <span class="iconify text-2xl" data-icon="lucide:code-2"></span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">自主开发</span>
                  </div>
                  <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">JSON 极致美化器</h3>
                  <p class="text-xs text-gray-500 leading-relaxed mb-6">针对超大 JSON 文件的秒级解析与层级可视化，支持一键类型生成与格式化。</p>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-gray-600">更新于 2026-02-01</span>
                    <button class="p-2 rounded-lg bg-gray-800 hover:bg-indigo-600 text-white transition-all">
                      <span class="iconify" data-icon="lucide:external-link"></span>
                    </button>
                  </div>
                </div>
                <!-- 工具卡片 2 -->
                <div class="bg-[#111] border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group animate-slide-up" style="animation-delay: 0.1s;">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <span class="iconify text-2xl" data-icon="lucide:palette"></span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">优质推荐</span>
                  </div>
                  <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Radix Colors</h3>
                  <p class="text-xs text-gray-500 leading-relaxed mb-6">一套面向设计系统的调色板工具，完美适配无障碍对比度与深色模式切换。</p>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-gray-600">更新于 2026-01-28</span>
                    <button class="p-2 rounded-lg bg-gray-800 hover:bg-indigo-600 text-white transition-all">
                      <span class="iconify" data-icon="lucide:external-link"></span>
                    </button>
                  </div>
                </div>
                <!-- 工具卡片 3 -->
                <div class="bg-[#111] border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group animate-slide-up" style="animation-delay: 0.2s;">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <span class="iconify text-2xl" data-icon="lucide:wrench"></span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">自主开发</span>
                  </div>
                  <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Word VBA 文档引擎</h3>
                  <p class="text-xs text-gray-500 leading-relaxed mb-6">批量化处理公文格式、自动生成页码与目录的高级宏脚本工具集成。</p>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-gray-600">更新于 2026-01-20</span>
                    <button class="p-2 rounded-lg bg-gray-800 hover:bg-indigo-600 text-white transition-all">
                      <span class="iconify" data-icon="lucide:external-link"></span>
                    </button>
                  </div>
                </div>
                <!-- 工具卡片 4 -->
                <div class="bg-[#111] border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group animate-slide-up" style="animation-delay: 0.3s;">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400">
                      <span class="iconify text-2xl" data-icon="lucide:layers"></span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">资源网站</span>
                  </div>
                  <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">UI Faces AI</h3>
                  <p class="text-xs text-gray-500 leading-relaxed mb-6">利用 AI 技术生成的免费版权个人头像资产，为原型设计提供真实感载体。</p>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-gray-600">更新于 2026-01-10</span>
                    <button class="p-2 rounded-lg bg-gray-800 hover:bg-indigo-600 text-white transition-all">
                      <span class="iconify" data-icon="lucide:external-link"></span>
                    </button>
                  </div>
                </div>
              </div>
              <!-- 空白占位或推荐区域 -->
              <div class="mt-12 bg-indigo-600/5 border border-dashed border-indigo-500/30 rounded-2xl p-10 text-center">
                <span class="iconify text-4xl text-indigo-500/40 mx-auto mb-4" data-icon="lucide:plus-circle"></span>
                <h4 class="text-white font-medium mb-2">正在筹备更多工具...</h4>
                <p class="text-gray-500 text-xs">如果你有好用的工具推荐，欢迎留言告知。</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="view === 'issues'" class="animate-slide-up">
          <!-- 头部统计 -->
          <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">问题记录</h1>
              <p class="text-gray-400 text-sm">记录每一次 Bug 的产生与消亡，把“踩坑”转化为成长的阶梯。</p>
            </div>
            <div class="flex gap-4">
              <div class="bg-[#111] border border-gray-800 px-4 py-2 rounded-xl text-center">
                <div class="text-xs text-gray-500">已解决</div>
                <div class="text-lg font-bold text-indigo-400">128</div>
              </div>
              <div class="bg-[#111] border border-gray-800 px-4 py-2 rounded-xl text-center">
                <div class="text-xs text-gray-500">待跟进</div>
                <div class="text-lg font-bold text-orange-400">3</div>
              </div>
            </div>
          </header>
          <!-- 过滤器 -->
          <div class="flex items-center space-x-3 mb-8 overflow-x-auto pb-2 hide-scrollbar">
            <button class="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-medium shrink-0">全部记录</button>
            <button class="px-4 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs hover:border-gray-600 shrink-0">环境配置</button>
            <button class="px-4 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs hover:border-gray-600 shrink-0">性能调优</button>
            <button class="px-4 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs hover:border-gray-600 shrink-0">逻辑 Bug</button>
            <button class="px-4 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs hover:border-gray-600 shrink-0">生活杂项</button>
          </div>
          <!-- 问题列表 -->
          <div class="space-y-8">
            <!-- 记录条目 1 -->
            <section class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
              <div class="p-6 border-b border-gray-800 flex justify-between items-start">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded">紧急</span>
                    <span class="text-xs text-gray-500">2026-02-01</span>
                  </div>
                  <h3 class="text-xl font-bold text-white">Word VBA 宏：运行后会生成 1000 页空白页的异常分析</h3>
                </div>
                <span class="iconify text-2xl text-emerald-500" data-icon="lucide:check-circle"></span>
              </div>
              <div class="p-6 space-y-6">
                <!-- 问题描述 -->
                <div>
                  <h4 class="text-sm font-bold text-gray-300 mb-2 flex items-center">
                    <span class="iconify mr-2" data-icon="lucide:info"></span> 问题描述
                  </h4>
                  <p class="text-sm text-gray-400 leading-relaxed bg-black/30 p-4 rounded-lg italic">
                    在调用文档自动化脚本时，由于循环终止条件失效，导致进程通过 Selection.InsertNewPage 无限触发分页，最终导致 Word 内存溢出。
                  </p>
                </div>
                <!-- 解决步骤 -->
                <div>
                  <h4 class="text-sm font-bold text-gray-300 mb-4 flex items-center">
                    <span class="iconify mr-2" data-icon="lucide:list-ordered"></span> 解决步骤
                  </h4>
                  <div class="space-y-6 relative ml-2">
                    <div class="flex items-start gap-4 relative z-10">
                      <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">1</div>
                      <div class="text-sm text-gray-400 pt-0.5">中断当前所有 Winword.exe 进程，清理临时缓存。</div>
                    </div>
                    <div class="flex items-start gap-4 relative z-10">
                      <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">2</div>
                      <div class="text-sm text-gray-400 pt-0.5">定位代码第 142 行，将 <code class="bg-gray-800 px-1 rounded text-red-400">Do Until EOF</code> 修改为基于 Range 对象长度的控制。</div>
                    </div>
                    <div class="flex items-start gap-4 relative z-10">
                      <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">3</div>
                      <div class="text-sm text-gray-400 pt-0.5">增加安全熔断机制：当页面数超过预设阈值（例如 200）时自动弹出警告并停止递归。</div>
                    </div>
                    <div class="absolute left-3 top-3 bottom-3 w-[1px] bg-gray-800"></div>
                  </div>
                </div>
                <!-- 经验总结 -->
                <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <h4 class="text-xs font-bold text-emerald-500 uppercase tracking-tighter mb-2 italic">Result & Summary</h4>
                  <p class="text-sm text-gray-300">永远不要信任动态改变长度的集合遍历。使用对象快照而非视图直接操作，能有效避免无限递归。</p>
                </div>
              </div>
            </section>
            <!-- 记录条目 2 -->
            <section class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden opacity-80">
              <div class="p-6 border-b border-gray-800 flex justify-between items-start">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-gray-800 text-gray-500 text-[10px] font-bold rounded">普通</span>
                    <span class="text-xs text-gray-500">2026-01-28</span>
                  </div>
                  <h3 class="text-lg font-bold text-white/80 group-hover:text-white transition-colors">Tailwind CSS 生产环境下动态类名失效的问题</h3>
                </div>
                <span class="iconify text-xl text-emerald-500" data-icon="lucide:check-circle"></span>
              </div>
            </section>
          </div>
          <!-- 底部翻页 -->
          <div class="mt-12 flex justify-center">
            <div class="flex items-center space-x-2">
              <button class="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-all">
                <span class="iconify" data-icon="lucide:chevron-left"></span>
              </button>
              <span class="text-xs text-gray-500">1 / 12</span>
              <button class="w-10 h-10 rounded-lg bg-[#111] border border-indigo-500/30 flex items-center justify-center text-white">
                <span class="iconify" data-icon="lucide:chevron-right"></span>
              </button>
            </div>
          </div>
        </section>

        <section v-else-if="view === 'life'" class="animate-slide-up">
          <!-- 头部引导 -->
          <header class="text-center mb-20 fade-in">
            <h1 class="text-4xl font-bold text-white mb-6 tracking-tight">文字里的呼吸</h1>
            <p class="text-gray-500 italic text-sm">“代码之外，生活依然有迹可循。”</p>
            <div class="w-12 h-[1px] bg-indigo-500 mx-auto mt-8"></div>
          </header>
          <!-- 随笔列表 -->
          <div class="space-y-24">
            <!-- 列表项 1 -->
            <article class="fade-in group" style="animation-delay: 0.2s;">
              <div class="flex flex-col md:flex-row gap-10 items-center">
                <div class="w-full md:w-1/2 overflow-hidden rounded-sm">
                  <img alt="Moody evening sky with street lamps reflecting on wet pavement" class="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" src="https://modao.cc/agent-py/media/generated_images/2026-02-01/ba9509e28b3b441bb73f07b7e2397b8d.jpg"/>
                </div>
                <div class="w-full md:w-1/2 space-y-4">
                  <div class="flex items-center space-x-3 text-[10px] tracking-[0.2em] text-indigo-400 uppercase font-bold">
                    <span>观影心得</span>
                    <span class="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span class="text-gray-500">2026-01-25</span>
                  </div>
                  <h2 class="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug">
                    重看《银翼杀手2049》：关于灵魂的电子注脚
                  </h2>
                  <p class="text-gray-400 text-sm leading-relaxed line-clamp-3 italic">
                    当雨水冲刷过那些冰冷的合金架构，我突然意识到，我们追求的真实，或许仅仅是一段被精心编织的记忆碎片。代码能够模拟情感，但无法模拟那种在废墟中等待雪花落下的寂寥……
                  </p>
                  <a class="inline-flex items-center text-xs text-white border-b border-indigo-500/50 pb-1 hover:border-indigo-500 transition-all" href="#">
                    继续阅读
                    <span class="iconify ml-1" data-icon="lucide:arrow-right"></span>
                  </a>
                </div>
              </div>
            </article>
            <!-- 列表项 2 -->
            <article class="fade-in group" style="animation-delay: 0.4s;">
              <div class="flex flex-col md:flex-row-reverse gap-10 items-center">
                <div class="w-full md:w-1/2 overflow-hidden rounded-sm">
                  <img alt="A quiet bookstore corner with old wooden shelves and a warm table lamp" class="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" src="https://modao.cc/agent-py/media/generated_images/2026-02-01/bdeb449febeb4ce286355a40214bd12f.jpg"/>
                </div>
                <div class="w-full md:w-1/2 space-y-4 text-right md:text-right">
                  <div class="flex items-center justify-end space-x-3 text-[10px] tracking-[0.2em] text-indigo-400 uppercase font-bold">
                    <span class="text-gray-500">2026-01-12</span>
                    <span class="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span>读书笔记</span>
                  </div>
                  <h2 class="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug">
                    《存在与时间》：在忙碌的代码世界寻回本真
                  </h2>
                  <p class="text-gray-400 text-sm leading-relaxed line-clamp-3 italic">
                    如果我们把生活看作是一次漫长的 Debug，那么每一个存在的瞬间都是一个断点。海德格尔告诉我们，向死而生并不是终点，而是一种对生命完整性的深刻觉知……
                  </p>
                  <a class="inline-flex items-center text-xs text-white border-b border-indigo-500/50 pb-1 hover:border-indigo-500 transition-all" href="#">
                    继续阅读
                    <span class="iconify ml-1" data-icon="lucide:arrow-right"></span>
                  </a>
                </div>
              </div>
            </article>
            <!-- 列表项 3 -->
            <article class="fade-in group" style="animation-delay: 0.6s;">
              <div class="flex flex-col md:flex-row gap-10 items-center">
                <div class="w-full md:w-1/2 overflow-hidden rounded-sm text-center py-12 bg-white/5 border border-white/5">
                  <span class="iconify text-6xl text-gray-800" data-icon="lucide:feather"></span>
                </div>
                <div class="w-full md:w-1/2 space-y-4">
                  <div class="flex items-center space-x-3 text-[10px] tracking-[0.2em] text-indigo-400 uppercase font-bold">
                    <span>短篇小说</span>
                    <span class="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span class="text-gray-500">2026-01-02</span>
                  </div>
                  <h2 class="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug">
                    最后一个未被优化的开发者
                  </h2>
                  <p class="text-gray-400 text-sm leading-relaxed line-clamp-3 italic">
                    在那个被 AGI 统治的纪元里，他坚持用指尖敲击机械键盘。咔哒声在这座静默的数据中心里显得格格不入。他在写诗，用那种已经被淘汰的、带有冗余和错误的语言……
                  </p>
                  <a class="inline-flex items-center text-xs text-white border-b border-indigo-500/50 pb-1 hover:border-indigo-500 transition-all" href="#">
                    继续阅读
                    <span class="iconify ml-1" data-icon="lucide:arrow-right"></span>
                  </a>
                </div>
              </div>
            </article>
          </div>
          <!-- 底部页码 -->
          <div class="mt-32 flex justify-center space-x-8 text-[10px] tracking-widest uppercase font-bold text-gray-600">
            <button class="hover:text-white transition-colors">Previous</button>
            <div class="flex space-x-4">
              <span class="text-white">01</span>
              <button class="hover:text-white">02</button>
              <button class="hover:text-white">03</button>
            </div>
            <button class="hover:text-white transition-colors">Next</button>
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

const DEFAULT_COLUMN_IMAGES = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1487014679447-9f8336841d58?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop',
];

const COLUMN_IMAGE_MAP = {
  '设计创作': 'https://images.unsplash.com/photo-1471879832106-c7ab9e0cee23?q=80&w=1600&auto=format&fit=crop',
  '技术笔记': 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
  '工具分享': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop',
  '问题记录': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop',
  '生活随笔': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
};

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
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function goHome() {
  clearFilters();
  setView('home');
}

function normalizeNavHref(item) {
  if (!item || !item.href) return '';
  let href = String(item.href).trim();
  if (!href.startsWith('#')) {
    if (href.startsWith('/')) {
      href = `#${href}`;
    } else {
      href = `#/${href}`;
    }
  }
  return href;
}

function normalizePath(value) {
  if (!value) return '';
  let path = String(value).trim();
  if (path.startsWith('#')) path = path.slice(1);
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

function postPathFromSlug(slug) {
  if (!slug) return '';
  const raw = String(slug).trim();
  const trimmed = raw.split('#')[0].split('?')[0];
  if (!trimmed) return '';
  const clean = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const firstSegment = clean.split('/')[0];
  return firstSegment ? `/${firstSegment}` : '';
}

function isColumnNavItem(item) {
  if (!item) return false;
  const path = normalizePath(item.href).toLowerCase();
  if (!path || path === '/' || path === '#/' || path === '#') return false;
  if (path.includes('/about')) return false;
  return true;
}

function columnImage(item, index) {
  const cover = String(item?.cover || '').trim();
  if (cover) return cover;
  const label = String(item?.label || '').trim();
  if (label && COLUMN_IMAGE_MAP[label]) return COLUMN_IMAGE_MAP[label];
  return DEFAULT_COLUMN_IMAGES[index % DEFAULT_COLUMN_IMAGES.length];
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
  window.scrollTo({ top: 0, behavior: 'auto' });
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
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function setTagFilter(tagId) {
  selectedTagId.value = tagId || '';
  selectedCategoryId.value = '';
  view.value = 'home';
  const slug = tagSlugFromId(tagId);
  window.location.hash = slug ? `#/tag/${encodeURIComponent(slug)}` : '#/';
  window.scrollTo({ top: 0, behavior: 'auto' });
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
  if (href === '#/design') {
    setView('design');
    return;
  }
  if (href === '#/tools') {
    setView('tools');
    return;
  }
  if (href === '#/issues') {
    setView('issues');
    return;
  }
  if (href === '#/life') {
    setView('life');
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
  if (href === '#/design') return view.value === 'design';
  if (href === '#/tools') return view.value === 'tools';
  if (href === '#/issues') return view.value === 'issues';
  if (href === '#/life') return view.value === 'life';
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
  // 处理path-based URL
  const pathname = window.location.pathname;
  if (pathname !== '/' && pathname !== '/index.html') {
    const path = pathname.replace(/^\//, '');
    // 尝试根据路径找到对应的导航项
    const nav = visibleNavItems.value.find(item => {
      const itemPath = normalizePath(item.href).toLowerCase();
      const itemLabel = item.label.toLowerCase();
      return itemPath.includes(path) || itemLabel.includes(path);
    });
    if (nav) {
      setColumnView(nav);
      return;
    }
  }
  
  // 处理hash-based URL
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
  if (hash === '#/design') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'design');
  }
  if (hash === '#/tools') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'tools');
  }
  if (hash === '#/issues') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'issues');
  }
  if (hash === '#/life') {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    return (view.value = 'life');
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

const columnNavItems = computed(() =>
  visibleNavItems.value.filter((item) => isColumnNavItem(item)),
);

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

const HOME_LIMIT = 10;
const homePosts = computed(() => filteredPosts.value.slice(0, HOME_LIMIT));
const homeHasMore = computed(() => filteredPosts.value.length > HOME_LIMIT);

const designPosts = computed(() => {
  const query = String(searchQuery.value || '').trim();
  let list = posts.value.filter((post) => postPathFromSlug(post.slug) === '/design');
  if (query) {
    list = list.filter((post) => matchesSearch(post, query));
  }
  return list;
});

const columnPosts = computed(() => {
  const query = String(searchQuery.value || '').trim();
  let list = posts.value.slice();
  if (activeColumnPath.value) {
    const target = normalizePath(activeColumnPath.value);
    list = list.filter((post) => {
      const postPath = postPathFromSlug(post.slug);
      return postPath && postPath === target;
    });
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
      throw new Error('Failed to load data from server.');
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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.fade-in {
  animation: fadeIn 0.8s ease-out forwards;
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

.home-more-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.18), transparent 55%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.8));
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.home-more-glow {
  position: absolute;
  inset: -40% 40% auto auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35), transparent 65%);
  filter: blur(8px);
  pointer-events: none;
}

.home-more-content {
  position: relative;
  z-index: 1;
}

.home-more-kicker {
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.75);
  margin-bottom: 6px;
}

.home-more-title {
  color: #e0e7ff;
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.home-more-text {
  color: #9ca3af;
  font-size: 0.85rem;
}

.home-more-action {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.15);
  color: #e0e7ff;
  font-size: 0.8rem;
  font-weight: 600;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.home-more-action:hover {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.8);
  background: rgba(99, 102, 241, 0.28);
}

@media (max-width: 720px) {
  .home-more-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

.columns-hero {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(31, 41, 55, 0.7);
  padding: 28px 28px 24px;
  margin-bottom: 24px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(17, 24, 39, 0.9));
}

.columns-hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.35), transparent 60%),
    radial-gradient(circle at 80% 10%, rgba(56, 189, 248, 0.25), transparent 50%);
  opacity: 0.9;
}

.columns-hero-content {
  position: relative;
  z-index: 1;
}

.columns-hero-kicker {
  font-size: 0.65rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.75);
}

.columns-hero-title {
  margin-top: 8px;
  font-size: 1.6rem;
  font-weight: 800;
  color: #f8fafc;
}

.columns-hero-text {
  margin-top: 6px;
  color: #a1a1aa;
  font-size: 0.9rem;
}

.columns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.columns-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  min-height: 220px;
  text-align: left;
  background: rgba(15, 23, 42, 0.6);
}

.columns-card-media {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: saturate(1.05) brightness(0.75);
  transform: scale(1.03);
}

.columns-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.35));
  border-top: 1px solid rgba(99, 102, 241, 0.35);
}

.columns-card-content {
  position: relative;
  z-index: 1;
  padding: 18px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
}

.columns-card-kicker {
  font-size: 0.65rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.8);
}

.columns-card-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #e2e8f0;
}

.columns-card-cta {
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.9);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.columns-card:hover .columns-card-overlay {
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.25));
}

.columns-card:hover .columns-card-cta {
  color: #e0e7ff;
}

.columns-card:focus-visible {
  outline: 2px solid rgba(99, 102, 241, 0.7);
  outline-offset: 2px;
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
