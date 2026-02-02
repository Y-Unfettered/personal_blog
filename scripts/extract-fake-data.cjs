#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const SRC_DIR = path.resolve(process.cwd(), 'src');
const DATA_DIR = path.resolve(process.cwd(), 'data/seed');

// 手动创建假数据
function createFakeData() {
  console.log('开始创建假数据...');
  
  // 创建设计创作数据
  const designData = [
    {
      id: 'post-design-1',
      title: '赛博极夜：城市环境概念设计',
      summary: '使用 Midjourney V6 探索高饱和度与暗部细节的极端平衡，模拟电影级光效...',
      content: '# 赛博极夜：城市环境概念设计\n\n使用 Midjourney V6 探索高饱和度与暗部细节的极端平衡，模拟电影级光效...',
      cover: 'https://modao.cc/agent-py/media/generated_images/2026-02-01/18ef710fc4c24179ad177eba86029032.jpg',
      categories: ['cat-design'],
      tags: ['设计', '创作'],
      status: 'published',
      created_at: '2026-02-01',
      updated_at: '2026-02-01',
      pinned: true,
      slug: 'cyberpunk-city-environment-concept-art'
    },
    {
      id: 'post-design-2',
      title: 'DevLog 移动端改版方案报告',
      summary: '针对高信息密度界面的减法实验，优化深色模式下的层级表达与交互反馈...',
      content: '# DevLog 移动端改版方案报告\n\n针对高信息密度界面的减法实验，优化深色模式下的层级表达与交互反馈...',
      cover: 'https://modao.cc/agent-py/media/generated_images/2026-02-01/41f61033662149bcaab0d60b961dff30.jpg',
      categories: ['cat-design'],
      tags: ['设计', 'UI'],
      status: 'published',
      created_at: '2026-01-28',
      updated_at: '2026-01-28',
      pinned: false,
      slug: 'devlog-mobile-redesign-scheme-report'
    },
    {
      id: 'post-design-3',
      title: '冰结灵魂：人像摄影系列 03',
      summary: '后期采用三原色偏移算法，营造超现实的冰晶质感与情绪表达...',
      content: '# 冰结灵魂：人像摄影系列 03\n\n后期采用三原色偏移算法，营造超现实的冰晶质感与情绪表达...',
      cover: 'https://modao.cc/agent-py/media/generated_images/2026-02-01/179ff61175324859bde3a0c0e35938f7.jpg',
      categories: ['cat-design'],
      tags: ['摄影', '创作'],
      status: 'published',
      created_at: '2026-01-20',
      updated_at: '2026-01-20',
      pinned: false,
      slug: 'frozen-soul-portrait-photography-series-03'
    }
  ];
  
  // 创建工具分享数据
  const toolData = [
    {
      id: 'tool-1',
      name: 'JSON 极致美化器',
      description: '针对超大 JSON 文件的秒级解析与层级可视化，支持一键类型生成与格式化。',
      type: '个人工具',
      url: '',
      source: '自主开发',
      update_date: '2026-02-01',
      created_at: '2026-02-01'
    },
    {
      id: 'tool-2',
      name: 'Radix Colors',
      description: '一套面向设计系统的调色板工具，完美适配无障碍对比度与深色模式切换。',
      type: '在线工具',
      url: '',
      source: '优质推荐',
      update_date: '2026-01-28',
      created_at: '2026-01-28'
    },
    {
      id: 'tool-3',
      name: 'Word VBA 文档引擎',
      description: '批量化处理公文格式、自动生成页码与目录的高级宏脚本工具集成。',
      type: '个人工具',
      url: '',
      source: '自主开发',
      update_date: '2026-01-20',
      created_at: '2026-01-20'
    },
    {
      id: 'tool-4',
      name: 'UI Faces AI',
      description: '利用 AI 技术生成的免费版权个人头像资产，为原型设计提供真实感载体。',
      type: '在线工具',
      url: '',
      source: '资源网站',
      update_date: '2026-01-10',
      created_at: '2026-01-10'
    }
  ];
  
  // 创建问题记录数据
  const issueData = [
    {
      id: 'issue-1',
      title: 'Word VBA 宏：运行后会生成 1000 页空白页的异常分析',
      description: '在调用文档自动化脚本时，由于循环终止条件失效，导致进程通过 Selection.InsertNewPage 无限触发分页，最终导致 Word 内存溢出。',
      priority: '紧急',
      status: '已解决',
      solution_steps: '1. 中断当前所有 Winword.exe 进程，清理临时缓存。\n2. 定位代码第 142 行，将 Do Until EOF 修改为基于 Range 对象长度的控制。\n3. 增加安全熔断机制：当页面数超过预设阈值（例如 200）时自动弹出警告并停止递归。',
      result_summary: '永远不要信任动态改变长度的集合遍历。使用对象快照而非视图直接操作，能有效避免无限递归。',
      created_at: '2026-02-01',
      updated_at: '2026-02-01'
    },
    {
      id: 'issue-2',
      title: 'Tailwind CSS 生产环境下动态类名失效的问题',
      description: '在生产构建中，Tailwind 会移除未使用的类名，导致通过字符串拼接生成的动态类名失效。',
      priority: '普通',
      status: '已解决',
      solution_steps: '1. 在 tailwind.config.js 中使用 safelist 配置，明确指定需要保留的类名模式。\n2. 使用 @apply 指令将动态类名转换为静态类。\n3. 考虑使用 CSS 变量实现动态样式。',
      result_summary: '在使用 Tailwind CSS 时，应尽量避免动态生成类名，或通过 safelist 明确告知构建工具需要保留的类名。',
      created_at: '2026-01-28',
      updated_at: '2026-01-28'
    }
  ];
  
  // 创建生活随笔数据
  const lifeData = [
    {
      id: 'post-life-1',
      title: '重看《银翼杀手2049》：关于灵魂的电子注脚',
      summary: '当雨水冲刷过那些冰冷的合金架构，我突然意识到，我们追求的真实，或许仅仅是一段被精心编织的记忆碎片。代码能够模拟情感，但无法模拟那种在废墟中等待雪花落下的寂寥……',
      content: '# 重看《银翼杀手2049》：关于灵魂的电子注脚\n\n当雨水冲刷过那些冰冷的合金架构，我突然意识到，我们追求的真实，或许仅仅是一段被精心编织的记忆碎片。代码能够模拟情感，但无法模拟那种在废墟中等待雪花落下的寂寥……',
      cover: 'https://modao.cc/agent-py/media/generated_images/2026-02-01/ba9509e28b3b441bb73f07b7e2397b8d.jpg',
      categories: ['cat-life'],
      tags: ['生活', '随笔', '电影'],
      status: 'published',
      created_at: '2026-01-25',
      updated_at: '2026-01-25',
      pinned: true,
      slug: 'rewatching-blade-runner-2049-electronic-footnotes-on-soul'
    },
    {
      id: 'post-life-2',
      title: '《存在与时间》：在忙碌的代码世界寻回本真',
      summary: '如果我们把生活看作是一次漫长的 Debug，那么每一个存在的瞬间都是一个断点。海德格尔告诉我们，向死而生并不是终点，而是一种对生命完整性的深刻觉知……',
      content: '# 《存在与时间》：在忙碌的代码世界寻回本真\n\n如果我们把生活看作是一次漫长的 Debug，那么每一个存在的瞬间都是一个断点。海德格尔告诉我们，向死而生并不是终点，而是一种对生命完整性的深刻觉知……',
      cover: 'https://modao.cc/agent-py/media/generated_images/2026-02-01/bdeb449febeb4ce286355a40214bd12f.jpg',
      categories: ['cat-life'],
      tags: ['生活', '随笔', '读书'],
      status: 'published',
      created_at: '2026-01-12',
      updated_at: '2026-01-12',
      pinned: false,
      slug: 'being-and-time-finding-authenticity-in-busy-code-world'
    },
    {
      id: 'post-life-3',
      title: '最后一个未被优化的开发者',
      summary: '在那个被 AGI 统治的纪元里，他坚持用指尖敲击机械键盘。咔哒声在这座静默的数据中心里显得格格不入。他在写诗，用那种已经被淘汰的、带有冗余和错误的语言……',
      content: '# 最后一个未被优化的开发者\n\n在那个被 AGI 统治的纪元里，他坚持用指尖敲击机械键盘。咔哒声在这座静默的数据中心里显得格格不入。他在写诗，用那种已经被淘汰的、带有冗余和错误的语言……',
      cover: '',
      categories: ['cat-life'],
      tags: ['生活', '随笔', '小说'],
      status: 'published',
      created_at: '2026-01-02',
      updated_at: '2026-01-02',
      pinned: false,
      slug: 'last-unoptimized-developer'
    }
  ];
  
  console.log(`创建了 ${designData.length} 条设计创作数据`);
  console.log(`创建了 ${toolData.length} 条工具分享数据`);
  console.log(`创建了 ${issueData.length} 条问题记录数据`);
  console.log(`创建了 ${lifeData.length} 条生活随笔数据`);
  
  return { designData, toolData, issueData, lifeData };
}

// 保存提取的数据到文件
function saveExtractedData(data) {
  console.log('保存提取的数据...');
  
  // 保存设计创作数据
  const designFilePath = path.join(DATA_DIR, 'design-fake-data.json');
  fs.writeFileSync(designFilePath, JSON.stringify(data.designData, null, 2) + '\n', 'utf8');
  console.log(`设计创作数据已保存到 ${designFilePath}`);
  
  // 保存工具分享数据
  const toolFilePath = path.join(DATA_DIR, 'tool-fake-data.json');
  fs.writeFileSync(toolFilePath, JSON.stringify(data.toolData, null, 2) + '\n', 'utf8');
  console.log(`工具分享数据已保存到 ${toolFilePath}`);
  
  // 保存问题记录数据
  const issueFilePath = path.join(DATA_DIR, 'issue-fake-data.json');
  fs.writeFileSync(issueFilePath, JSON.stringify(data.issueData, null, 2) + '\n', 'utf8');
  console.log(`问题记录数据已保存到 ${issueFilePath}`);
  
  // 保存生活随笔数据
  const lifeFilePath = path.join(DATA_DIR, 'life-fake-data.json');
  fs.writeFileSync(lifeFilePath, JSON.stringify(data.lifeData, null, 2) + '\n', 'utf8');
  console.log(`生活随笔数据已保存到 ${lifeFilePath}`);
  
  return data;
}

// 发送POST请求
function sendPostRequest(path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3030,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve(responseData);
      });
    });
    
    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      reject(e);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 发送数据到后台API
async function sendDataToApi(data) {
  console.log('开始将数据导入到后台...');
  
  // 发送工具数据
  console.log('导入工具数据...');
  for (const tool of data.toolData) {
    try {
      await sendPostRequest('/api/tools', tool);
      await delay(500); // 增加500ms延迟
    } catch (error) {
      console.error(`导入工具数据失败: ${error.message}`);
    }
  }
  console.log(`工具数据导入完成，共导入 ${data.toolData.length} 条`);
  
  // 发送问题数据
  console.log('导入问题数据...');
  for (const issue of data.issueData) {
    try {
      await sendPostRequest('/api/issues', issue);
      await delay(500); // 增加500ms延迟
    } catch (error) {
      console.error(`导入问题数据失败: ${error.message}`);
    }
  }
  console.log(`问题数据导入完成，共导入 ${data.issueData.length} 条`);
  
  // 发送设计创作数据
  console.log('导入设计创作数据...');
  for (const design of data.designData) {
    try {
      await sendPostRequest('/api/posts', design);
      await delay(500); // 增加500ms延迟
    } catch (error) {
      console.error(`导入设计创作数据失败: ${error.message}`);
    }
  }
  console.log(`设计创作数据导入完成，共导入 ${data.designData.length} 条`);
  
  // 发送生活随笔数据
  console.log('导入生活随笔数据...');
  for (const life of data.lifeData) {
    try {
      await sendPostRequest('/api/posts', life);
      await delay(500); // 增加500ms延迟
    } catch (error) {
      console.error(`导入生活随笔数据失败: ${error.message}`);
    }
  }
  console.log(`生活随笔数据导入完成，共导入 ${data.lifeData.length} 条`);
  
  console.log('所有数据导入完成！');
}

// 主函数
async function main() {
  try {
    // 创建假数据
    const extractedData = createFakeData();
    
    // 保存提取的数据
    const savedData = saveExtractedData(extractedData);
    
    // 发送数据到后台API
    await sendDataToApi(savedData);
    
    console.log('数据提取和导入完成！');
  } catch (error) {
    console.error('数据提取和导入失败:', error);
  }
}

// 运行主函数
main();