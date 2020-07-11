---
layout: post
title: Markdown超链接页面内和通过新窗口打开
date: 2020-07-12 10:04:25 +0800
tags: [markdown]
published: true
location: 杭州 祥符教堂
feature: 
---

> **注意：** 本文主要讲述markdown超链接页面内和通过新窗口打开

#### 1. 页面内部打开

用法：
```
[超链接文字](url) 
```
如：
```
// 1

<a href="https://github.com/auaa/auaa.github.io">Github</a>

// 2
[Github](https://github.com/auaa/auaa.github.io)

```


#### 2. 通过新窗口打开

用法：
```
[超链接文字](url){:target="_blank"}
```

{% raw %}
```
// 1

<a href="https://github.com/auaa/auaa.github.io" target="_blank">Github</a>

// 2

[Github](https://github.com/auaa/auaa.github.io){:target="_blank"}
```
{% endraw %}

