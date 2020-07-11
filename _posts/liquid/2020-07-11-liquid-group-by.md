---
layout: post
title: Liquid group by用法
date: 2020-07-11 14:10:25 +0800
tags: [liquid]
published: true
location: 杭州 祥符教堂
feature: 
---

> **注意：** 本文主要讲述Liquid 过滤器： group_by & group_by_exp 用法。基于Liquid 4.0.3。

顾名思义，此过滤器允许您按特定属性对内容进行分组。

#### 1. group_by

例如：我们根据发帖的年份对帖子进行分组。

{% raw %}
```
{% assign posts_by_year = site.posts | group_by:"year" %}
```
{% endraw %}

分组后结果如下：
```
[
    {"name": "2019","items": [...]},
    {"name": "2020","items": [...]},
    ...
]
```

你同样可以根据帖子的作者进行分组。如：

{% raw %}
```
{% assign posts_by_author = site.posts | group_by:"author" %}
```
{% endraw %}


{% raw %}
```
{% assign posts_by_color = site.pages | group_by:"meta.color" %}
```
{% endraw %}


#### 2. group_by_exp

使用场景：当group_by 的属性不能直接获取时，需要用到 group_by_exp。

例如：我们无法获取帖子的年份。但是可以根据发帖时间获取发帖年份，用法如下：

{% raw %}
```
{% assign post_by_year = site.posts | group_by_exp: "item","item.date|date: '%Y'" %}
```
{% endraw %}

完整示例：
{% raw %}
```
{% assign post_by_year = site.posts | group_by_exp: "item","item.date|date: '%Y'" %}

{% for year in posts_by_year %}
  <h2>{{year.name}}</h2>
  <ul>
  {% for post in year.items %}
    <li><a href="{{post.url}}">{{post.title}}</a></li>
  {% endfor %}
  </ul>
{% endfor %}
```
{% endraw %}

> 尾记：
>
> group_by & group_by_exp 都可与sort结合使用
> 