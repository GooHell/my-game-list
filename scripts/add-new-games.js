/**
 * 批量添加新游戏 + 自动抓取封面和标签
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const GAMES_JSON = path.join(__dirname, '../data/games.json');
const COVERS_DIR = path.join(__dirname, '../public/covers');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const NEW_GAMES = [
  { title: '浣熊推币机', appId: '3784030' },
  { title: '退潮', appId: '1977170' },
  { title: '蔑视', appId: '698670' },
  { title: '异种航员2', appId: '538030' },
  { title: '漫威蜘蛛侠2', appId: '2651280' },
  { title: '超级机器人大战X', appId: null, tags: ['策略', '回合制', '机甲', '日式RPG', '战棋'] },
  { title: 'PATAPON 1+2 REPLAY', appId: '2383200' },
  { title: '心之眼', appId: '3265250' },
  { title: '圣剑传说 Visions of Mana', appId: '2490990' },
  { title: '无限机兵 AI LIMIT', appId: '2407270' },
  { title: '审判之眼：死神的遗言 Remastered', appId: '2058180' },
  { title: '女神异闻录3 Reload', appId: '2161700' },
  { title: '苍翼：混沌效应', appId: '2273430' },
  { title: 'Muse Dash', appId: '774171' },
  { title: 'DJMAX RESPECT V', appId: '960170' },
  { title: '生化危机4 重制版', appId: '2050650' },
  { title: '刮个爽', appId: '3948120' },
  { title: '圣女战旗', appId: '1139930' },
];

async function getSteamTags(appId) {
  try {
    const r = await axios.get(`https://store.steampowered.com/app/${appId}?l=schinese`, {
      headers: { 'Cookie': 'birthtime=288057601; mature_content=1;', 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    const $ = cheerio.load(r.data);
    const tags = [];
    $('a.app_tag').each(function() { const t = $(this).text().trim(); if (t && t !== '+') tags.push(t); });
    return tags.slice(0, 8);
  } catch (e) { return []; }
}

async function downloadCover(appId, gameId) {
  const safeId = gameId.replace(/[<>:"/\\|?*]/g, '_');
  const fileName = `${safeId}.jpg`;
  const filePath = path.join(COVERS_DIR, fileName);
  const urls = [
    `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
  ];
  for (const url of urls) {
    try {
      const r = await axios({ url, responseType: 'stream', timeout: 10000 });
      if (!(r.headers['content-type'] || '').includes('image')) continue;
      await new Promise((res, rej) => { const w = fs.createWriteStream(filePath); r.data.pipe(w); w.on('finish', res); w.on('error', rej); });
      return `/covers/${fileName}`;
    } catch (e) { continue; }
  }
  return '';
}

async function main() {
  const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
  console.log(`现有游戏: ${games.filter(g=>g).length}`);

  let added = 0;
  for (const ng of NEW_GAMES) {
    // 检查重复
    if (games.find(g => g && g.title === ng.title)) {
      console.log(`⏭️ 已存在: ${ng.title}`);
      continue;
    }

    const id = ng.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
    console.log(`\n➕ 添加: ${ng.title}`);

    let tags = ng.tags || [];
    let cover = '';

    if (ng.appId) {
      // 抓标签
      tags = await getSteamTags(ng.appId);
      console.log(`  🏷️ 标签: ${tags.slice(0,4).join(', ')}...`);
      await delay(1000);

      // 抓封面
      cover = await downloadCover(ng.appId, id);
      console.log(`  🖼️ 封面: ${cover || '失败'}`);
      await delay(1000);
    }

    games.push({
      id, title: ng.title, appId: ng.appId || '',
      cover, playtime: '', showPlaytime: false,
      playStatus: 'cleared', tags,
      isAnchor: false, orderWeight: 0,
      reviewFile: null, pros: null, cons: null, remark: null,
    });
    added++;
  }

  fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');
  console.log(`\n✅ 新增 ${added} 个游戏，总计 ${games.filter(g=>g).length}`);
}

main().catch(console.error);
