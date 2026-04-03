/**
 * 修正 bing 封面 - 用更精准的搜索策略重新获取
 * 策略：使用英文名 + "game cover" 关键词搜索 bing 图片
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const GAMES_JSON = path.join(__dirname, '../data/games.json');
const COVERS_DIR = path.join(__dirname, '../public/covers');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// 英文名映射（提高搜索准确率）
const ENGLISH_NAMES = {
  '穹顶突击队': 'The Finals',
  '萤火突击(国服)': 'Arena Breakout',
  '绝地求生刺激战场': 'PUBG Mobile',
  '尘白禁区': 'Snowbreak Containment Zone',
  '火力苏达T3': 'T3 Arena',
  '王牌战士': 'Ace Force',
  '穿越火线枪战王者': 'CrossFire Mobile',
  '使命召唤手游': 'Call of Duty Mobile',
  '高能英雄': 'High Energy Heroes',
  '香肠派对': 'Sausage Party game',
  '堡垒之夜': 'Fortnite',
  '无畏契约': 'VALORANT',
  '穿越火线': 'CrossFire',
  '不羁联盟': 'Unbound League',
  'EA SPORTS FC™ 26': 'EA Sports FC 25',
  '马里奥赛车8 豪华版': 'Mario Kart 8 Deluxe',
  'WWE 2K26': 'WWE 2K24',
  'FIFA 23': 'FIFA 23',
  'NBA 2K26': 'NBA 2K25',
  '足球经理26': 'Football Manager 2025',
  '鸣潮': 'Wuthering Waves',
  '地下城与勇士 起源': 'Dungeon Fighter Online',
  '绝区零': 'Zenless Zone Zero',
  '战双帕弥什': 'Punishing Gray Raven',
  '深空之眼': 'Deep Space Eye',
  '龙之谷手游': 'Dragon Nest Mobile',
  '火影忍者': 'Naruto Mobile',
  '战国BASARA4 皇 - The Best': 'Sengoku BASARA 4 Sumeragi',
  '异界锁链': 'ASTRAL CHAIN',
  '罗密欧是个绝命侠': 'Romeo Must Die game',
  '口袋妖怪': 'Pokemon',
  '天天酷跑': 'Tiantian Kupao',
  '疯狂机械师': 'Crazy Mechanic',
  '超级马里奥：奥德赛': 'Super Mario Odyssey',
  'SHADOW OF THE COLOSSUS 汪达与巨像': 'Shadow of the Colossus PS4',
  '我还活着': 'I Am Alive game',
  '银河战士': 'Metroid Dread',
  '星际争霸II': 'StarCraft 2',
  '魔兽争霸3：重制版': 'Warcraft III Reforged',
  'Wires And Whiskers': 'Wires And Whiskers game',
  '皮克敏': 'Pikmin 4',
  '英雄联盟 手游': 'League of Legends Wild Rift',
  '宝可梦大集结': 'Pokemon Unite',
  '王者荣耀': 'Honor of Kings',
  '非人学园': 'Non Human Academy',
  '风暴英雄': 'Heroes of the Storm',
  '少女前线2：追放': 'Girls Frontline 2 Exilium',
  '梦幻模拟战': 'Langrisser Mobile',
  '火焰之纹章 风花雪月': 'Fire Emblem Three Houses',
  '重装机兵 Leynos 2 Saturn 致敬精选辑': 'Assault Suits Leynos 2',
  '万智牌：竞技场': 'MTG Arena',
  '炉石传说': 'Hearthstone',
  '火星求生 重制版': 'Surviving Mars',
  '牧场物语 来吧！风之繁华集市': 'Story of Seasons Wonderful Life',
  'Minecraft': 'Minecraft',
  '奇异人生:重逢': 'Life is Strange Reunion',
  '雷顿教授与不可思议的小镇': 'Professor Layton Curious Village',
};

async function searchBingImage(query) {
  try {
    const searchQuery = `${query} game cover art`;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&qft=+filterui:aspect-tall&first=1`;
    
    const r = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 12000,
    });

    const $ = cheerio.load(r.data);
    const imgUrls = [];

    $('a.iusc').each(function () {
      try {
        const m = $(this).attr('m');
        if (m) {
          const data = JSON.parse(m);
          if (data.murl) imgUrls.push(data.murl);
        }
      } catch (e) {}
    });

    return imgUrls.slice(0, 3); // 返回前3个候选
  } catch (e) {
    return [];
  }
}

async function downloadImage(url, filePath) {
  try {
    const r = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const contentType = r.headers['content-type'] || '';
    if (!contentType.includes('image')) return false;

    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      r.data.pipe(w);
      w.on('finish', resolve);
      w.on('error', reject);
    });

    // 检查文件大小，太小的图片可能是错误的
    const stats = fs.statSync(filePath);
    if (stats.size < 5000) {
      fs.unlinkSync(filePath);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  const games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
  const bingGames = games.filter(g => g && g.cover && g.cover.includes('bing_'));

  console.log(`🔧 需要修正的 bing 封面: ${bingGames.length} 个\n`);

  let fixed = 0, failed = 0;

  for (let i = 0; i < bingGames.length; i++) {
    const game = bingGames[i];
    const englishName = ENGLISH_NAMES[game.title] || game.title;
    
    process.stdout.write(`[${i + 1}/${bingGames.length}] ${game.title} (${englishName})...`);

    const imgUrls = await searchBingImage(englishName);
    
    if (imgUrls.length === 0) {
      console.log(' ❌ 无搜索结果');
      failed++;
      await delay(2000);
      continue;
    }

    const safeId = game.id.replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${safeId}.jpg`;
    const filePath = path.join(COVERS_DIR, fileName);

    let success = false;
    for (const imgUrl of imgUrls) {
      if (await downloadImage(imgUrl, filePath)) {
        success = true;
        break;
      }
    }

    if (success) {
      // 删除旧的 bing 文件
      const oldBingFile = path.join(COVERS_DIR, path.basename(game.cover));
      if (fs.existsSync(oldBingFile) && oldBingFile !== filePath) {
        try { fs.unlinkSync(oldBingFile); } catch (e) {}
      }
      game.cover = `/covers/${fileName}`;
      console.log(` ✅ → ${fileName}`);
      fixed++;
    } else {
      console.log(' ❌ 下载失败');
      failed++;
    }

    await delay(2500); // 限速
  }

  fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), 'utf8');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎉 封面修正完成！`);
  console.log(`  ✅ 成功: ${fixed}`);
  console.log(`  ❌ 失败: ${failed}`);
}

main().catch(console.error);
