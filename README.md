# auaa.github.io — Daily Todo

个人每日任务（GitHub Pages + Markdown）。Token 用口令经 **PBKDF2 + AES-GCM** 加密后放入仓库，打开站点时输入口令解锁。

- 站点：https://auaa.github.io/
- 源码：`app/` · 数据：`data/<分类>/` · 产物：`docs/`


# 域名管理
域名账户: https://my.dnshe.com/index.php?m=domain_hub&view=domains

注册账号: qiuyg_yc@163.com


## 加密 Token

```bash
node scripts/encrypt-token.mjs '<github_pat>' '<解锁口令>'
cd app && npm run build
git add app/public/config.json docs/config.json && git commit -m "chore: 更新 token 密文" && git push
```

仓库中只有 `tokenVault` 密文，没有明文 PAT。口令请自行牢记。

## 使用

1. 打开站点 → 输入解锁口令  
2. 今天可编辑；历史 / 甘特只读  

## 开发

```bash
cd app && npm install && npm run dev
```
