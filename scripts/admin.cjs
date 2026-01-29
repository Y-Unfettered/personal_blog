#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DATA_DIR = path.resolve(process.cwd(), 'data/seed');

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function normalizeList(input, keyName) {
  if (Array.isArray(input)) return input;
  if (input && Array.isArray(input[keyName])) return input[keyName];
  return [];
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      opts[key] = true;
    } else {
      opts[key] = next;
      i += 1;
    }
  }
  return opts;
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCsv(input) {
  if (!input) return [];
  return String(input)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function ensureStatus(status) {
  if (!status) return 'draft';
  if (status !== 'draft' && status !== 'published') {
    throw new Error('status must be draft or published');
  }
  return status;
}

function loadList(fileName, keyName) {
  const filePath = path.join(DATA_DIR, fileName);
  const input = readJson(filePath);
  const list = normalizeList(input, keyName);
  return { filePath, list };
}

function saveList(filePath, keyName, list) {
  writeJson(filePath, list);
}

function requireField(value, name) {
  if (!value) throw new Error(`missing required field: ${name}`);
}

function findByIdOrSlug(list, id, slug) {
  if (id) return list.find((item) => item.id === id) || null;
  if (slug) return list.find((item) => item.slug === slug) || null;
  return null;
}

function runGenerate(gitTitle) {
  const args = ['scripts/generate-data.cjs'];
  if (gitTitle) {
    args.push('--git-title', gitTitle);
  }
  const result = spawnSync('node', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('generate-data failed');
  }
}

function cmdPostAdd(opts) {
  const { filePath, list } = loadList('posts.json', 'posts');
  requireField(opts.title, 'title');
  requireField(opts.summary, 'summary');
  const content = opts.file ? fs.readFileSync(opts.file, 'utf8') : opts.content;
  requireField(content, 'content or --file');

  const id = opts.id || `post-${Date.now()}`;
  const slug = opts.slug || slugify(opts.title);
  const post = {
    id,
    title: opts.title,
    slug,
    summary: opts.summary,
    content,
    ...(opts.cover ? { cover: opts.cover } : {}),
    categories: parseCsv(opts.categories),
    tags: parseCsv(opts.tags),
    created_at: opts.created_at || todayISO(),
    updated_at: opts.updated_at || todayISO(),
    status: ensureStatus(opts.status),
  };

  list.push(post);
  saveList(filePath, 'posts', list);
  console.log(`post added: ${id}`);
}

function cmdPostUpdate(opts) {
  const { filePath, list } = loadList('posts.json', 'posts');
  const target = findByIdOrSlug(list, opts.id, opts.slug);
  if (!target) throw new Error('post not found');

  if (opts.title) target.title = opts.title;
  if (opts.slug) target.slug = opts.slug;
  if (opts.summary) target.summary = opts.summary;
  if (opts.cover !== undefined) target.cover = opts.cover;
  if (opts.categories) target.categories = parseCsv(opts.categories);
  if (opts.tags) target.tags = parseCsv(opts.tags);
  if (opts.status) target.status = ensureStatus(opts.status);
  if (opts.file) target.content = fs.readFileSync(opts.file, 'utf8');
  if (opts.content) target.content = opts.content;
  target.updated_at = todayISO();

  saveList(filePath, 'posts', list);
  console.log(`post updated: ${target.id}`);
}

function cmdPostDelete(opts) {
  const { filePath, list } = loadList('posts.json', 'posts');
  const target = findByIdOrSlug(list, opts.id, opts.slug);
  if (!target) throw new Error('post not found');
  const next = list.filter((p) => p !== target);
  saveList(filePath, 'posts', next);
  console.log(`post deleted: ${target.id}`);
}

function cmdCategoryAdd(opts) {
  const { filePath, list } = loadList('categories.json', 'categories');
  requireField(opts.name, 'name');
  const id = opts.id || `cat-${Date.now()}`;
  const slug = opts.slug || slugify(opts.name);
  list.push({
    id,
    name: opts.name,
    slug,
    ...(opts.description ? { description: opts.description } : {}),
  });
  saveList(filePath, 'categories', list);
  console.log(`category added: ${id}`);
}

function cmdCategoryUpdate(opts) {
  const { filePath, list } = loadList('categories.json', 'categories');
  const target = findByIdOrSlug(list, opts.id, opts.slug);
  if (!target) throw new Error('category not found');
  if (opts.name) target.name = opts.name;
  if (opts.slug) target.slug = opts.slug;
  if (opts.description !== undefined) target.description = opts.description;
  saveList(filePath, 'categories', list);
  console.log(`category updated: ${target.id}`);
}

function cmdCategoryDelete(opts) {
  const { filePath, list } = loadList('categories.json', 'categories');
  const target = findByIdOrSlug(list, opts.id, opts.slug);
  if (!target) throw new Error('category not found');
  const next = list.filter((c) => c !== target);
  saveList(filePath, 'categories', next);
  console.log(`category deleted: ${target.id}`);
}

function cmdTagAdd(opts) {
  const { filePath, list } = loadList('tags.json', 'tags');
  requireField(opts.name, 'name');
  const id = opts.id || `tag-${Date.now()}`;
  const slug = opts.slug || slugify(opts.name);
  list.push({ id, name: opts.name, slug });
  saveList(filePath, 'tags', list);
  console.log(`tag added: ${id}`);
}

function cmdTagUpdate(opts) {
  const { filePath, list } = loadList('tags.json', 'tags');
  const target = findByIdOrSlug(list, opts.id, opts.slug);
  if (!target) throw new Error('tag not found');
  if (opts.name) target.name = opts.name;
  if (opts.slug) target.slug = opts.slug;
  saveList(filePath, 'tags', list);
  console.log(`tag updated: ${target.id}`);
}

function cmdTagDelete(opts) {
  const { filePath, list } = loadList('tags.json', 'tags');
  const target = findByIdOrSlug(list, opts.id, opts.slug);
  if (!target) throw new Error('tag not found');
  const next = list.filter((t) => t !== target);
  saveList(filePath, 'tags', next);
  console.log(`tag deleted: ${target.id}`);
}

function cmdNavAdd(opts) {
  const { filePath, list } = loadList('nav.json', 'nav');
  requireField(opts.label, 'label');
  requireField(opts.href, 'href');
  const id = opts.id || `nav-${Date.now()}`;
  list.push({
    id,
    label: opts.label,
    href: opts.href,
    order: opts.order ? Number(opts.order) : list.length + 1,
    visible: opts.visible === undefined ? true : opts.visible !== 'false',
  });
  saveList(filePath, 'nav', list);
  console.log(`nav item added: ${id}`);
}

function cmdNavUpdate(opts) {
  const { filePath, list } = loadList('nav.json', 'nav');
  const target = findByIdOrSlug(list, opts.id, null);
  if (!target) throw new Error('nav item not found');
  if (opts.label) target.label = opts.label;
  if (opts.href) target.href = opts.href;
  if (opts.order !== undefined) target.order = Number(opts.order);
  if (opts.visible !== undefined) target.visible = opts.visible !== 'false';
  saveList(filePath, 'nav', list);
  console.log(`nav item updated: ${target.id}`);
}

function cmdNavDelete(opts) {
  const { filePath, list } = loadList('nav.json', 'nav');
  const target = findByIdOrSlug(list, opts.id, null);
  if (!target) throw new Error('nav item not found');
  const next = list.filter((n) => n !== target);
  saveList(filePath, 'nav', next);
  console.log(`nav item deleted: ${target.id}`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/admin.cjs post:add --title "Title" --summary "..." --file path.md --categories cat-tech --tags tag-vue --status draft
  node scripts/admin.cjs post:update --id post-xxx --title "New Title" --status published
  node scripts/admin.cjs post:delete --id post-xxx

  node scripts/admin.cjs category:add --name "Tech" --slug tech
  node scripts/admin.cjs category:update --id cat-xxx --name "New Name"
  node scripts/admin.cjs category:delete --id cat-xxx

  node scripts/admin.cjs tag:add --name "Vue" --slug vue
  node scripts/admin.cjs tag:update --id tag-xxx --name "Vue3"
  node scripts/admin.cjs tag:delete --id tag-xxx

  node scripts/admin.cjs nav:add --label "文章" --href "#/" --order 1 --visible true
  node scripts/admin.cjs nav:update --id nav-xxx --label "首页"
  node scripts/admin.cjs nav:delete --id nav-xxx

  node scripts/admin.cjs generate
  node scripts/admin.cjs publish --title "Hello Blog"
`);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const opts = parseArgs(argv.slice(1));

  try {
    if (!cmd) return printHelp();

    if (cmd === 'post:add') return cmdPostAdd(opts);
    if (cmd === 'post:update') return cmdPostUpdate(opts);
    if (cmd === 'post:delete') return cmdPostDelete(opts);

    if (cmd === 'category:add') return cmdCategoryAdd(opts);
    if (cmd === 'category:update') return cmdCategoryUpdate(opts);
    if (cmd === 'category:delete') return cmdCategoryDelete(opts);

    if (cmd === 'tag:add') return cmdTagAdd(opts);
    if (cmd === 'tag:update') return cmdTagUpdate(opts);
    if (cmd === 'tag:delete') return cmdTagDelete(opts);

    if (cmd === 'nav:add') return cmdNavAdd(opts);
    if (cmd === 'nav:update') return cmdNavUpdate(opts);
    if (cmd === 'nav:delete') return cmdNavDelete(opts);

    if (cmd === 'generate') return runGenerate('');
    if (cmd === 'publish') {
      requireField(opts.title, 'title');
      return runGenerate(opts.title);
    }

    printHelp();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
