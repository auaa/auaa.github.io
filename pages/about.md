---
layout: page
permalink: /about/
---

## 关于本站

> 欢迎光临个人小站

{% assign version_order = site.versions | sort: "date" %}
{%- for v in version_order -%}

{{v.content}}
{%- endfor -%}


1. 不提供评论功能，可提issue
2. 偶尔分享读书、电影心得
3. 偶尔分享代码



## 友情链接

[Github](https://github.com/auaa)





