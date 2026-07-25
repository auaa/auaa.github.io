# auaa.github.io — Daily Todo

个人每日任务（GitHub Pages + Markdown）。

- 站点：https://auaa.github.io/
- 源码：`app/`
- 数据：`data/<分类>/YYYY-MM-DD.md`
- 构建产物：`docs/`（Pages 指向 `main` / `docs`）

## 使用

1. 在仓库创建分类目录，例如 `data/日常/`
2. 打开站点：每天首次进入甘特，同日再开默认今天
3. 今天可增删改、状态下拉、拖拽排序；约 800ms 自动保存
4. 历史 / 甘特只读

## 开发

```bash
cd app
npm install
npm run dev
npm run build   # 输出到 ../docs
```

## Token

Fine-grained PAT（本仓 Contents R/W）写在 `app/public/config.json`（构建进 `docs/config.json`）。公开仓明文存放，风险自担。

## 任务格式

```markdown
- [ ] 标题 <!-- id:xxx status:planned planned:2026-07-25T10:00:00+08:00 -->
```
