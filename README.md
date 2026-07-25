# auaa.github.io — Daily Todo

个人每日任务（GitHub Pages + Markdown）。当前为 **Phase 0：API / CORS 最小验证页**。

## 本地路径

`/Users/qiuyungang/Data/Codes/github/auaa.github.io`

## Pages

- 源：`main` 分支 `/docs`
- 验证页：https://auaa.github.io/

## Token（应用读写用）

1. GitHub → Settings → Developer settings → Fine-grained tokens  
2. 仅授权本仓，`Contents: Read and write`  
3. 写入 [`docs/config.json`](docs/config.json) 的 `github.token`（勿把无用的高权限 Token 放进来）  
4. 参考模板：[`docs/config.example.json`](docs/config.example.json)

公私钥加密 Token 为后续可选，当前明文。

## 数据

分类目录手建于 `data/<分类名>/`，例如已有 `data/日常/`。每日文件：`YYYY-MM-DD.md`。

## 验证

打开站点后应能看到公开目录读取结果；填入 Token 后再测鉴权读取。
