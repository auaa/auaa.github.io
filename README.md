# auaa.github.io — Daily Todo

个人每日任务（GitHub Pages + Markdown）。Token 使用 **RSA-OAEP** 非对称加密后放入仓库，私钥仅本机保存。

- 站点：https://auaa.github.io/
- 源码：`app/` · 数据：`data/<分类>/YYYY-MM-DD.md` · 产物：`docs/`

## Token 加密流程

```bash
# 1. 生成密钥（只需一次）
node scripts/gen-keys.mjs

# 2. 用公钥加密 Fine-grained PAT（写入 app/public/config.json）
node scripts/encrypt-token.mjs 'github_pat_xxx'

# 3. 构建并推送
cd app && npm run build && cd .. && git add -A && git push
```

- `keys/public.pem`：可提交  
- `keys/private.pem`：**勿提交**；浏览器首次打开粘贴解锁（可勾选写入 localStorage）

## 使用

1. 仓库创建 `data/分类名/`
2. 打开站点 → 粘贴私钥解锁  
3. 今天可编辑；历史 / 甘特只读；每天首次进甘特

## 开发

```bash
cd app && npm install && npm run dev
```
