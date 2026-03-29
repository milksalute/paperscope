# PaperScope · 学术论文智能检索

实时检索 arXiv 预印本论文库，按领域、日期、作者精准筛选。

**在线演示**：部署成功后访问 `https://你的用户名.github.io/paper-scope/`

## 部署到 GitHub Pages（免费永久）

### 前提条件

- 一个 [GitHub](https://github.com) 账号
- 电脑上安装了 [Git](https://git-scm.com/downloads)

### 部署步骤

#### 1. 创建 GitHub 仓库

1. 登录 GitHub，点击右上角 **+** → **New repository**
2. 仓库名称填写：`paper-scope`（小写）
3. 选择 **Public**（公开仓库，GitHub Pages 免费版需要）
4. 勾选 **Add a README file**
5. 点击 **Create repository**

#### 2. 上传代码

打开终端（PowerShell / CMD / Git Bash），依次执行：

```bash
# 进入你的 paper-scope 文件夹
cd "你的paper-scope文件夹路径"

# 初始化 Git 并关联远程仓库（把 YOUR_USERNAME 替换成你的 GitHub 用户名）
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/paper-scope.git

# 添加所有文件并提交
git add .
git commit -m "Initial commit: PaperScope arXiv paper search"

# 推送到 GitHub
git push -u origin main
```

> **注意**：如果你在克隆时使用了 SSH，`origin` 地址应改为 `git@github.com:YOUR_USERNAME/paper-scope.git`

#### 3. 启用 GitHub Pages

1. 进入你的仓库页面：`https://github.com/YOUR_USERNAME/paper-scope`
2. 点击 **Settings**（设置）
3. 左侧菜单找到 **Pages**
4. **Source**（来源）选择：
   - **Build and deployment** → **Source**: `GitHub Actions`
5. 等待约 1-2 分钟，页面刷新后会显示你的网站地址

#### 4. 访问网站

你的网站地址为：**`https://YOUR_USERNAME.github.io/paper-scope/`**

如果看不到网站，检查仓库 Actions 标签页确认部署流程是否成功运行。

### 自定义域名（可选）

如果你有自己的域名（如 `paperscope.com`），可以：

1. 在仓库根目录创建 `CNAME` 文件，写入你的域名
2. 到你的域名服务商 DNS 设置中，添加 CNAME 记录指向 `YOUR_USERNAME.github.io`
3. 在 GitHub Pages Settings 中填写自定义域名

## 技术说明

- **纯静态网站**：单个 HTML 文件，无需后端服务器
- **数据来源**：[arXiv API](https://info.arxiv.org/help/api/index.html)（公开免费）
- **CORS 兼容**：GitHub Pages 使用 HTTPS 协议，arXiv API 原生支持跨域请求
- **自动部署**：使用 GitHub Actions，每次推送代码自动更新网站

## 文件结构

```
paper-scope/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 自动部署工作流
├── .nojekyll               # 禁用 Jekyll 处理
├── index.html              # 主页面（全部代码）
└── README.md               # 本文件
```

## 本地开发

如果需要本地调试，可以用任意 HTTP 服务器打开：

```bash
# Python
python -m http.server 8765

# Node.js (如果安装了 npx)
npx serve .
```

然后在浏览器访问 `http://localhost:8765`

> ⚠️ **不能** 直接双击 `index.html` 打开（file:// 协议下 arXiv API 会拒绝跨域请求）
