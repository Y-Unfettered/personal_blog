#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawnSync } = require('child_process');

const HOST = process.env.ADMIN_HOST || '127.0.0.1';
const PORT = Number(process.env.ADMIN_PORT || 3030);
const DATA_DIR = path.resolve(process.cwd(), 'data/seed');
const ADMIN_DIR = path.resolve(process.cwd(), 'admin');
const DEFAULT_SETTINGS = { markdownTheme: 'default' };

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': typeof data === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
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

function listFile(name) {
  return path.join(DATA_DIR, name);
}

function readSettings() {
  const filePath = listFile('settings.json');
  if (!fs.existsSync(filePath)) return { ...DEFAULT_SETTINGS };
  try {
    const data = readJson(filePath);
    return { ...DEFAULT_SETTINGS, ...data };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings) {
  const filePath = listFile('settings.json');
  writeJson(filePath, settings);
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function loadList(fileName, keyName) {
  const filePath = listFile(fileName);
  const input = readJson(filePath);
  return { filePath, list: normalizeList(input, keyName) };
}

function saveList(filePath, list) {
  writeJson(filePath, list);
}

function runGenerate(gitTitle) {
  const args = ['scripts/generate-data.cjs'];
  if (gitTitle) args.push('--git-title', gitTitle);
  const result = spawnSync('node', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('generate-data failed');
  }
}

function notFound(res) {
  send(res, 404, { error: 'Not Found' });
}

function methodNotAllowed(res) {
  send(res, 405, { error: 'Method Not Allowed' });
}

function serveAdmin(res) {
  const filePath = path.join(ADMIN_DIR, 'index.html');
  if (!fs.existsSync(filePath)) return send(res, 500, { error: 'admin page missing' });
  const html = fs.readFileSync(filePath, 'utf8');
  send(res, 200, html);
}

function handleList(res, fileName, keyName) {
  const { list } = loadList(fileName, keyName);
  send(res, 200, list);
}

async function handleCreate(req, res, fileName, keyName, mapper) {
  const { filePath, list } = loadList(fileName, keyName);
  const body = await readBody(req);
  const item = mapper(body || {}, list);
  list.push(item);
  saveList(filePath, list);
  send(res, 201, item);
}

async function handleUpdate(req, res, fileName, keyName, id, updater) {
  const { filePath, list } = loadList(fileName, keyName);
  const target = list.find((item) => item.id === id);
  if (!target) return send(res, 404, { error: 'Not Found' });
  const body = await readBody(req);
  updater(target, body || {});
  saveList(filePath, list);
  send(res, 200, target);
}

function handleDelete(res, fileName, keyName, id) {
  const { filePath, list } = loadList(fileName, keyName);
  const next = list.filter((item) => item.id !== id);
  if (next.length === list.length) return send(res, 404, { error: 'Not Found' });
  saveList(filePath, next);
  send(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const { pathname } = parsed;

  try {
    if (pathname === '/' || pathname === '/admin') return serveAdmin(res);
    if (pathname === '/api/health') return send(res, 200, { ok: true });

    if (pathname === '/api/posts') {
      if (req.method === 'GET') return handleList(res, 'posts.json', 'posts');
      if (req.method === 'POST') {
        return handleCreate(req, res, 'posts.json', 'posts', (body, list) => {
          if (!body.title || !body.summary || !body.content) {
            throw new Error('title, summary, content required');
          }
          const pinnedCount = list.filter((p) => p.pinned === true).length;
          if (body.pinned === true && pinnedCount >= 3) {
            // 自动取消最早的置顶帖子
            const pinnedPosts = list
              .filter((p) => p.pinned === true)
              .sort((a, b) => {
                const ad = a.updated_at || a.created_at || '';
                const bd = b.updated_at || b.created_at || '';
                return ad.localeCompare(bd);
              });
            if (pinnedPosts[0]) pinnedPosts[0].pinned = false;
          }
          return {
            id: body.id || `post-${Date.now()}`,
            title: body.title,
            slug: body.slug || slugify(body.title),
            summary: body.summary,
            content: body.content,
            cover: body.cover || undefined,
            categories: Array.isArray(body.categories) ? body.categories : [],
            tags: Array.isArray(body.tags) ? body.tags : [],
            created_at: body.created_at || todayISO(),
            updated_at: body.updated_at || todayISO(),
            status: body.status === 'published' ? 'published' : 'draft',
            pinned: body.pinned === true,
          };
        });
      }
      return methodNotAllowed(res);
    }

    if (pathname.startsWith('/api/posts/')) {
      const id = pathname.split('/').pop();
      if (req.method === 'PUT') {
        return handleUpdate(req, res, 'posts.json', 'posts', id, (target, body) => {
          if (body.title) target.title = body.title;
          if (body.slug) target.slug = body.slug;
          if (body.summary) target.summary = body.summary;
          if (body.content) target.content = body.content;
          if (body.cover !== undefined) target.cover = body.cover;
          if (Array.isArray(body.categories)) target.categories = body.categories;
          if (Array.isArray(body.tags)) target.tags = body.tags;
          if (body.status === 'draft' || body.status === 'published') target.status = body.status;
          if (body.created_at) target.created_at = body.created_at;
          if (body.pinned !== undefined) {
            if (body.pinned === true && target.pinned !== true) {
              const { list } = loadList('posts.json', 'posts');
              const pinnedCount = list.filter((p) => p.pinned === true && p.id !== target.id).length;
              if (pinnedCount >= 3) {
                if (body.auto_unpin === true) {
                  const pinnedPosts = list
                    .filter((p) => p.pinned === true && p.id !== target.id)
                    .sort((a, b) => {
                      const ad = a.updated_at || a.created_at || '';
                      const bd = b.updated_at || b.created_at || '';
                      return ad.localeCompare(bd);
                    });
                  if (pinnedPosts[0]) pinnedPosts[0].pinned = false;
                } else {
                  throw new Error('only 3 pinned posts allowed');
                }
              }
            }
            target.pinned = !!body.pinned;
          }
          target.updated_at = todayISO();
        });
      }
      if (req.method === 'DELETE') return handleDelete(res, 'posts.json', 'posts', id);
      return methodNotAllowed(res);
    }

    if (pathname === '/api/categories') {
      if (req.method === 'GET') return handleList(res, 'categories.json', 'categories');
      if (req.method === 'POST') {
        return handleCreate(req, res, 'categories.json', 'categories', (body) => {
          if (!body.name) throw new Error('name required');
          if (!body.parent) throw new Error('parent required');
          return {
            id: body.id || `cat-${Date.now()}`,
            name: body.name,
            slug: body.slug || slugify(body.name),
            description: body.description || undefined,
            color: body.color || undefined,
            parent: body.parent,
          };
        });
      }
      return methodNotAllowed(res);
    }

    if (pathname.startsWith('/api/categories/')) {
      const id = pathname.split('/').pop();
      if (req.method === 'PUT') {
        return handleUpdate(req, res, 'categories.json', 'categories', id, (target, body) => {
          if (body.name) target.name = body.name;
          if (body.slug) target.slug = body.slug;
          if (body.description !== undefined) target.description = body.description;
          if (body.color !== undefined) target.color = body.color;
          if (body.parent !== undefined) target.parent = body.parent;
        });
      }
      if (req.method === 'DELETE') return handleDelete(res, 'categories.json', 'categories', id);
      return methodNotAllowed(res);
    }

    if (pathname === '/api/tags') {
      if (req.method === 'GET') return handleList(res, 'tags.json', 'tags');
      if (req.method === 'POST') {
        return handleCreate(req, res, 'tags.json', 'tags', (body) => {
          if (!body.name) throw new Error('name required');
          return {
            id: body.id || `tag-${Date.now()}`,
            name: body.name,
            slug: body.slug || slugify(body.name),
          };
        });
      }
      return methodNotAllowed(res);
    }

    if (pathname.startsWith('/api/tags/')) {
      const id = pathname.split('/').pop();
      if (req.method === 'PUT') {
        return handleUpdate(req, res, 'tags.json', 'tags', id, (target, body) => {
          if (body.name) target.name = body.name;
          if (body.slug) target.slug = body.slug;
        });
      }
      if (req.method === 'DELETE') return handleDelete(res, 'tags.json', 'tags', id);
      return methodNotAllowed(res);
    }

    if (pathname === '/api/nav') {
      if (req.method === 'GET') return handleList(res, 'nav.json', 'nav');
      if (req.method === 'POST') {
        return handleCreate(req, res, 'nav.json', 'nav', (body, list) => {
          if (!body.label || !body.href) throw new Error('label, href required');
          return {
            id: body.id || `nav-${Date.now()}`,
            label: body.label,
            href: body.href,
            order: Number.isFinite(body.order) ? body.order : list.length + 1,
            visible: body.visible !== false,
          };
        });
      }
      return methodNotAllowed(res);
    }

    if (pathname.startsWith('/api/nav/')) {
      const id = pathname.split('/').pop();
      if (req.method === 'PUT') {
        return handleUpdate(req, res, 'nav.json', 'nav', id, (target, body) => {
          if (body.label) target.label = body.label;
          if (body.href) target.href = body.href;
          if (body.order !== undefined) target.order = Number(body.order);
          if (body.visible !== undefined) target.visible = !!body.visible;
        });
      }
      if (req.method === 'DELETE') return handleDelete(res, 'nav.json', 'nav', id);
      return methodNotAllowed(res);
    }

    if (pathname === '/api/generate' && req.method === 'POST') {
      runGenerate('');
      return send(res, 200, { ok: true });
    }

    if (pathname === '/api/publish' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body || !body.title) throw new Error('title required');
      runGenerate(body.title);
      return send(res, 200, { ok: true });
    }

    if (pathname === '/api/settings') {
      if (req.method === 'GET') return send(res, 200, readSettings());
      if (req.method === 'PUT') {
        const body = await readBody(req);
        const current = readSettings();
        const theme = body && body.markdownTheme ? String(body.markdownTheme) : current.markdownTheme || DEFAULT_SETTINGS.markdownTheme;
        const allowed = ['default', 'mk-cute', 'smart-blue', 'cyanosis'];
        if (!allowed.includes(theme)) throw new Error('invalid markdownTheme');
        const next = {
          ...current,
          ...body,
          markdownTheme: theme,
        };
        writeSettings(next);
        return send(res, 200, next);
      }
      return methodNotAllowed(res);
    }

    // 问题管理 API
    if (pathname === '/api/issues') {
      if (req.method === 'GET') return handleList(res, 'issues.json', 'issues');
      if (req.method === 'POST') {
        return handleCreate(req, res, 'issues.json', 'issues', (body) => {
          if (!body.title) throw new Error('title required');
          if (!body.description) throw new Error('description required');
          return {
            id: body.id || `issue-${Date.now()}`,
            title: body.title,
            description: body.description,
            priority: body.priority || '普通',
            status: body.status || '待解决',
            solution_steps: body.solution_steps || '',
            result_summary: body.result_summary || '',
            created_at: body.created_at || todayISO(),
            updated_at: todayISO(),
          };
        });
      }
      return methodNotAllowed(res);
    }

    if (pathname.startsWith('/api/issues/')) {
      const id = pathname.split('/').pop();
      if (req.method === 'PUT') {
        return handleUpdate(req, res, 'issues.json', 'issues', id, (target, body) => {
          if (body.title) target.title = body.title;
          if (body.description) target.description = body.description;
          if (body.priority) target.priority = body.priority;
          if (body.status) target.status = body.status;
          if (body.solution_steps !== undefined) target.solution_steps = body.solution_steps;
          if (body.result_summary !== undefined) target.result_summary = body.result_summary;
          if (body.created_at) target.created_at = body.created_at;
          target.updated_at = todayISO();
        });
      }
      if (req.method === 'DELETE') return handleDelete(res, 'issues.json', 'issues', id);
      return methodNotAllowed(res);
    }

    // 工具管理 API
    if (pathname === '/api/tools') {
      if (req.method === 'GET') return handleList(res, 'tools.json', 'tools');
      if (req.method === 'POST') {
        return handleCreate(req, res, 'tools.json', 'tools', (body) => {
          if (!body.name) throw new Error('name required');
          if (!body.description) throw new Error('description required');
          return {
            id: body.id || `tool-${Date.now()}`,
            name: body.name,
            description: body.description,
            type: body.type || '在线工具',
            url: body.url || undefined,
            source: body.source || '网络',
            update_date: body.update_date || todayISO(),
            created_at: body.created_at || todayISO(),
          };
        });
      }
      return methodNotAllowed(res);
    }

    if (pathname.startsWith('/api/tools/')) {
      const id = pathname.split('/').pop();
      if (req.method === 'PUT') {
        return handleUpdate(req, res, 'tools.json', 'tools', id, (target, body) => {
          if (body.name) target.name = body.name;
          if (body.description) target.description = body.description;
          if (body.type) target.type = body.type;
          if (body.url !== undefined) target.url = body.url;
          if (body.source) target.source = body.source;
          if (body.update_date) target.update_date = body.update_date;
          if (body.created_at) target.created_at = body.created_at;
        });
      }
      if (req.method === 'DELETE') return handleDelete(res, 'tools.json', 'tools', id);
      return methodNotAllowed(res);
    }

    return notFound(res);
  } catch (err) {
    send(res, 400, { error: err.message || 'bad request' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Admin server running: http://${HOST}:${PORT}/admin`);
});
