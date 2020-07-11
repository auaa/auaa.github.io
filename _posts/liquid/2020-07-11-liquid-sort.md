---
layout: post
title: Liquid sort用法
date: 2020-07-11 15:04:25 +0800
tags: [liquid]
published: true
location: 杭州 祥符教堂
feature: 
---

> **注意：** 本文主要讲述Liquid 过滤器： sort & sort_natural 用法。基于Liquid 4.0.3。

顾名思义，此过滤器允许您按特定属性对内容进行升序排序。

> sort 排序时对大小写敏感
>
> sort_natural 排序时忽略大小写敏感

#### 1. sort
{% raw %}
```
// input

{% assign my_array = "zebra, octopus, giraffe, Sally Snake" | split: ", " %}

{{ my_array | sort | join: ", " }}


// output

Sally Snake, giraffe, octopus, zebra
```
{% endraw %}

#### 2. sort_natural
{% raw %}
```
// input

{% assign my_array = "zebra, octopus, giraffe, Sally Snake" | split: ", " %}

{{ my_array | sort | join: ", " }}


// output

Sally Snake, giraffe, octopus, zebra
```
{% endraw %}

#### 3. 用法

例如：我们根据发帖的日期对帖子进行排序。

{% raw %}
```
{% assign posts_by_sort = site.posts | sort:"date" %}
```
{% endraw %}

你同样可以根据帖子的多个属性进行排序。如：

{% raw %}
```
{% assign posts_by_color = site.pages | sort %}
```
{% endraw %}

{% raw %}
```
{% assign posts_by_sort = site.posts | sort:"author","title" %}
```
{% endraw %}


我们可以通过``reverse``来进行降序排序。

{% raw %}
```
{% assign sorted = pages | sort:"date" | reverse %}
```
{% endraw %}


> 尾记：
>
> group_by & group_by_exp 都可与sort结合使用
> 