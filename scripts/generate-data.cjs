#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERSION = 1;
const WORDS_PER_MINUTE = 200;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
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

function estimateReadingTimeMinutes(wordCount) {
  if (!wordCount || wordCount <= 0) return 0;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

function normalizeList(input, keyName) {
  if (Array.isArray(input)) return input;
  if (input && Array.isArray(input[keyName])) return input[keyName];
  return [];
}

function assertRequired(obj, fields, label) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length > 0) {
    throw new Error(`${label} missing required fields: ${missing.join(', ')}`);
  }
}

function toMap(list) {
  const map = new Map();
  for (const item of list) {
    if (!item || !item.id) continue;
    map.set(item.id, item);
  }
  return map;
}

function countById(ids) {
  const counts = new Map();
  for (const id of ids) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

function buildCounts(posts) {
  const published = posts.filter((p) => p.status === 'published');
  const categoryIds = published.flatMap((p) => Array.isArray(p.categories) ? p.categories : []);
  const tagIds = published.flatMap((p) => Array.isArray(p.tags) ? p.tags : []);
  return {
    categoryCounts: countById(categoryIds),
    tagCounts: countById(tagIds),
  };
}

function normalizePosts(posts) {
  return posts.map((p) => {
    assertRequired(
      p,
      ['id', 'title', 'slug', 'summary', 'content', 'categories', 'tags', 'created_at', 'updated_at', 'status'],
      `post:${p && p.id ? p.id : 'unknown'}`
    );

    const wordCount = countWordsFromMarkdown(p.content);
    const readingTime = estimateReadingTimeMinutes(wordCount);

    return {
      id: String(p.id),
      title: String(p.title),
      slug: String(p.slug),
      summary: String(p.summary),
      content: String(p.content),
      wordCount,
      readingTime,
      ...(p.pinned ? { pinned: true } : {}),
      ...(p.cover ? { cover: String(p.cover) } : {}),
      categories: Array.isArray(p.categories) ? p.categories.map(String) : [],
      tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
      created_at: String(p.created_at),
      updated_at: String(p.updated_at),
      status: String(p.status),
    };
  });
}

function normalizeCategories(categories, counts) {
  return categories.map((c) => {
    assertRequired(c, ['id', 'name', 'slug'], `category:${c && c.id ? c.id : 'unknown'}`);
    const count = counts.get(c.id) || 0;
    return {
      id: String(c.id),
      name: String(c.name),
      slug: String(c.slug),
      ...(c.color ? { color: String(c.color) } : {}),
      ...(c.description ? { description: String(c.description) } : {}),
      ...(c.parent ? { parent: String(c.parent) } : {}),
      count,
    };
  });
}

function normalizeTags(tags, counts) {
  return tags.map((t) => {
    assertRequired(t, ['id', 'name', 'slug'], `tag:${t && t.id ? t.id : 'unknown'}`);
    const count = counts.get(t.id) || 0;
    return {
      id: String(t.id),
      name: String(t.name),
      slug: String(t.slug),
      ...(t.parent ? { parent: String(t.parent) } : {}),
      count,
    };
  });
}

function parseArgs(argv) {
  const args = { src: 'data/seed', out: 'public/data', gitTitle: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--src') args.src = argv[i + 1];
    if (a === '--out') args.out = argv[i + 1];
    if (a === '--git-title') args.gitTitle = argv[i + 1];
  }
  return args;
}

function runGitCommand(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });
  if (result.error) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed: ${stderr || stdout || 'unknown error'}`);
  }
}

function gitPublish(repoDir, title) {
  runGitCommand(['add', '.'], repoDir);
  runGitCommand(['commit', '-m', `publish: ${title}`], repoDir);
  runGitCommand(['push'], repoDir);
}

function main() {
  const { src, out, gitTitle } = parseArgs(process.argv);
  const srcDir = path.resolve(process.cwd(), src);
  const outDir = path.resolve(process.cwd(), out);

  const postsInput = readJson(path.join(srcDir, 'posts.json'));
  const categoriesInput = readJson(path.join(srcDir, 'categories.json'));
  const tagsInput = readJson(path.join(srcDir, 'tags.json'));
  const navPath = path.join(srcDir, 'nav.json');
  const navInput = fs.existsSync(navPath) ? readJson(navPath) : null;
  const settingsPath = path.join(srcDir, 'settings.json');
  const settingsInput = fs.existsSync(settingsPath) ? readJson(settingsPath) : null;

  const posts = normalizePosts(normalizeList(postsInput, 'posts'));
  const categories = normalizeList(categoriesInput, 'categories');
  const tags = normalizeList(tagsInput, 'tags');
  const nav = navInput ? normalizeList(navInput, 'nav') : null;
  const settings = settingsInput ? settingsInput : null;

  const categoryMap = toMap(categories);
  const tagMap = toMap(tags);

  for (const post of posts) {
    for (const cid of post.categories) {
      if (!categoryMap.has(cid)) {
        throw new Error(`post:${post.id} references unknown category: ${cid}`);
      }
    }
    for (const tid of post.tags) {
      if (!tagMap.has(tid)) {
        throw new Error(`post:${post.id} references unknown tag: ${tid}`);
      }
    }
  }

  const publishedPosts = posts.filter((p) => p.status === 'published');
  const { categoryCounts, tagCounts } = buildCounts(posts);

  const outPosts = {
    version: VERSION,
    generated_at: todayISO(),
    posts: publishedPosts,
  };

  const outCategories = {
    version: VERSION,
    generated_at: todayISO(),
    categories: normalizeCategories(categories, categoryCounts),
  };

  const outTags = {
    version: VERSION,
    generated_at: todayISO(),
    tags: normalizeTags(tags, tagCounts),
  };

  writeJson(path.join(outDir, 'posts.json'), outPosts);
  writeJson(path.join(outDir, 'categories.json'), outCategories);
  writeJson(path.join(outDir, 'tags.json'), outTags);
  if (nav) {
    writeJson(path.join(outDir, 'nav.json'), {
      version: VERSION,
      generated_at: todayISO(),
      nav,
    });
  }
  if (settings) {
    writeJson(path.join(outDir, 'settings.json'), {
      version: VERSION,
      generated_at: todayISO(),
      ...settings,
    });
  }

  if (gitTitle) {
    gitPublish(process.cwd(), gitTitle);
  }

  console.log('Generated:', outDir);
}

main();
