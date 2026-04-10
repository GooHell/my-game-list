# 🎮 Shan's Game List

个人游戏库展示网站 + 本地管理工具

**在线地址**: https://goohello.github.io/my-game-list/

---

## 🚀 快速开始（任意新电脑）

### 前置要求（只需装一次）

1. **Node.js** (v18+): https://nodejs.org/
2. **Git**: https://git-scm.com/

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/GooHello/my-game-list.git
cd my-game-list

# 2. 安装依赖
npm install

# 3. 启动管理面板（浏览器自动打开）
npm run admin
```

打开 http://localhost:4000 即可管理所有游戏内容。

### 首次使用需要配置 Git 身份

```bash
git config --global user.name "GooHello"
git config --global user.email "你的邮箱"
```

首次 push 时 Git 会弹窗要求登录 GitHub，按提示操作即可（之后会记住）。

---

## 📱 Admin 管理面板功能

| 功能 | 说明 |
|------|------|
| 📋 游戏列表 | 搜索、排序、按状态筛选所有游戏 |
| ➕ 添加游戏 | 输入名字即可添加，支持 Steam 自动抓取 |
| ✏️ 编辑游戏 | 修改标题、标签、状态、封面、备注 |
| 🖼️ 封面管理 | 上传本地图片 或 输入 Steam AppID 自动下载 |
| 🏷️ 标签抓取 | 从 Steam 商店页面自动获取游戏标签 |
| 💾 备份 | 一键备份 games.json |
| 🚀 构建部署 | 一键 build + push + 自动部署到 GitHub Pages |

---

## 🛠️ 其他命令

```bash
npm run dev      # 启动开发服务器（本地预览网站）
npm run build    # 构建静态页面
npm run admin    # 启动管理面板
```

---

## 📁 项目结构

```
my-game-list/
├── admin/              # 管理面板
│   ├── server.js       # Express 后端
│   └── public/         # 管理面板前端
├── data/
│   ├── games.json      # 🎮 核心数据文件
│   └── backup/         # 备份目录
├── public/covers/      # 游戏封面图片
├── src/                # Next.js 前端源码
│   ├── app/            # 页面
│   └── components/     # 组件
└── package.json
```