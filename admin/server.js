/**
 * Game List Admin Panel - 本地管理服务器
 * 启动: npm run admin
 * 访问: http://localhost:4000
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execSync, exec } = require('child_process');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 4000;
const ROOT = path.join(__dirname, '..');
const GAMES_JSON = path.join(ROOT, 'data', 'games.json');
const COVERS_DIR = path.join(ROOT, 'public', 'covers');
const BACKUP_DIR = path.join(ROOT, 'data', 'backup');

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// 让封面图片可以预览
app.use('/covers', express.static(COVERS_DIR));

// 封面上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: COVERS_DIR,
    filename: (req, file, cb) => {
      const gameId = req.params.id.replace(/[<>:"/\\|?*]/g, '_');
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${gameId}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只允许上传图片'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ==========================================
// API: 游戏管理
// ==========================================

// 获取所有游戏
app.get('/api/games', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
    res.json(games.filter(g => g !== null));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取单个游戏
app.get('/api/games/:id', (req, res) => {
  const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
  const game = games.find(g => g && g.id === req.params.id);
  if (!game) return res.status(404).json({ error: '游戏不存在' });
  res.json(game);
});

// 更新游戏
app.put('/api/games/:id', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
    const idx = games.findIndex(g => g && g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '游戏不存在' });
    
    const updatedGame = { ...games[idx], ...req.body };
    games[idx] = updatedGame;
    fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');
    res.json({ success: true, game: updatedGame });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 添加游戏
app.post('/api/games', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
    const newGame = {
      id: req.body.id || req.body.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, ''),
      title: req.body.title || '',
      appId: req.body.appId || '',
      cover: req.body.cover || '',
      playtime: req.body.playtime || '',
      showPlaytime: req.body.showPlaytime || false,
      playStatus: req.body.playStatus || 'playing',
      tags: req.body.tags || [],
      isAnchor: req.body.isAnchor || false,
      orderWeight: req.body.orderWeight || 0,
      reviewFile: req.body.reviewFile || null,
      pros: req.body.pros || null,
      cons: req.body.cons || null,
      remark: req.body.remark || null,
    };
    
    // 检查是否重复
    if (games.find(g => g && g.id === newGame.id)) {
      return res.status(400).json({ error: '游戏ID已存在' });
    }
    
    games.push(newGame);
    fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');
    res.json({ success: true, game: newGame });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 删除游戏
app.delete('/api/games/:id', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
    const idx = games.findIndex(g => g && g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '游戏不存在' });
    
    const removed = games.splice(idx, 1)[0];
    fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');
    res.json({ success: true, removed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// API: 封面管理
// ==========================================

// 上传封面
app.post('/api/covers/:id', upload.single('cover'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '没有文件' });
    
    const coverPath = `/covers/${req.file.filename}`;
    // 更新 games.json
    const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
    const game = games.find(g => g && g.id === req.params.id);
    if (game) {
      game.cover = coverPath;
      fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');
    }
    res.json({ success: true, cover: coverPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 从 Steam 下载封面
app.post('/api/covers/:id/steam', async (req, res) => {
  try {
    const { appId } = req.body;
    if (!appId) return res.status(400).json({ error: '缺少 appId' });
    
    const gameId = req.params.id.replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${gameId}.jpg`;
    const filePath = path.join(COVERS_DIR, fileName);
    
    const urls = [
      `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
    ];
    
    for (const url of urls) {
      try {
        const r = await axios({ url, responseType: 'stream', timeout: 15000 });
        if (!(r.headers['content-type'] || '').includes('image')) continue;
        await new Promise((resolve, reject) => {
          const w = fs.createWriteStream(filePath);
          r.data.pipe(w);
          w.on('finish', resolve);
          w.on('error', reject);
        });
        
        const coverPath = `/covers/${fileName}`;
        const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
        const game = games.find(g => g && g.id === req.params.id);
        if (game) {
          game.cover = coverPath;
          game.appId = appId;
          fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');
        }
        return res.json({ success: true, cover: coverPath });
      } catch (e) { continue; }
    }
    res.status(500).json({ error: '所有Steam CDN都下载失败' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 从 Steam 抓取标签
app.post('/api/tags/steam/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const url = `https://store.steampowered.com/app/${appId}?l=schinese`;
    const r = await axios.get(url, {
      headers: {
        'Cookie': 'birthtime=288057601; mature_content=1; wants_mature_content=1;',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    const $ = cheerio.load(r.data);
    const tags = [];
    $('a.app_tag').each(function () {
      const t = $(this).text().trim();
      if (t && t !== '+') tags.push(t);
    });
    const name = $('div.apphub_AppName').text().trim();
    res.json({ tags: tags.slice(0, 10), name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// API: 统计信息
// ==========================================
app.get('/api/stats', (req, res) => {
  const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8')).filter(g => g);
  const statusCount = {};
  const tagCount = {};
  let missingCovers = 0;
  
  games.forEach(g => {
    statusCount[g.playStatus || 'unknown'] = (statusCount[g.playStatus || 'unknown'] || 0) + 1;
    (g.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
    if (g.cover && !fs.existsSync(path.join(ROOT, 'public', g.cover))) missingCovers++;
  });
  
  res.json({
    total: games.length,
    statusCount,
    tagCount: Object.entries(tagCount).sort((a, b) => b[1] - a[1]),
    missingCovers,
    anchors: games.filter(g => g.isAnchor).length,
    reviews: games.filter(g => g.reviewFile).length,
  });
});

// ==========================================
// API: 备份 & 部署
// ==========================================

// 备份
app.post('/api/backup', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, `games_${timestamp}.json`);
    fs.copyFileSync(GAMES_JSON, backupPath);
    res.json({ success: true, path: backupPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取备份列表
app.get('/api/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 恢复备份
app.post('/api/restore/:file', (req, res) => {
  try {
    const backupPath = path.join(BACKUP_DIR, req.params.file);
    if (!fs.existsSync(backupPath)) return res.status(404).json({ error: '备份不存在' });
    fs.copyFileSync(backupPath, GAMES_JSON);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 构建 & 部署
app.post('/api/deploy', (req, res) => {
  try {
    res.json({ success: true, message: '部署已启动，请查看终端输出' });
    
    // 异步执行部署
    exec('npm run build && git add -A && git commit -m "update via admin panel" && git push origin main', 
      { cwd: ROOT, timeout: 120000 },
      (err, stdout, stderr) => {
        if (err) console.error('Deploy error:', err.message);
        else console.log('✅ 部署完成!');
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// 启动
// ==========================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🎮 Game List Admin Panel               ║');
  console.log(`║   http://localhost:${PORT}                  ║`);
  console.log('║                                          ║');
  console.log('║   Ctrl+C 退出                             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  
  // 自动打开浏览器
  const { platform } = process;
  const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${cmd} http://localhost:${PORT}`);
});
