---
layout: post
title: ORACLE TRUNC()函数
date: 2020-7-10 10:02:12 +0800
tags: [oracle]
published: true
location: 杭州
feature: 
---

#### 1. trunc（date，[ format]）
trunc 以指定的元素截取日期类型的数据

date– 日期格式的值

format–日期格式 如‘mm','yyyy'等 将date从指定日期格式截取,可选项，忽略它则按照最近的日期截取

> select trunc(sysdate) from dual; --2020/7/10
>
> select trunc(sysdate,'yy') from dual;--2020/1/1，返回今年的第一天
>
> select trunc(sysdate,'mm') from dual;--2020/7/1，返回本月的第一天
>
> select trunc(sysdate,'d') from dual;--2020/7/5，返回本周的第一天
>
> select trunc(sysdate,'dd') from dual;--2020/7/10，返回今日日期
>
> select trunc(sysdate ,'HH24') from dual;--2020/7/10 10:00:00，返回当前的小时
>
> select trunc(sysdate ,'MI') from dual;--2020/7/10 10:25:00，返回当前的分

#### 2. trunc（number,[decimals]）
number- 待做截取处理的数值；

decimals- 指明需保留小数点后面的位数，可选项，忽略它则截去所有的小数部分。

注意：截取时并不对数据进行四舍五入。

>select trunc(123.567,2) from dual;--123.56
>
>select trunc(123.567,-2) from dual;--100
>
>select trunc(123.567) from dual;--123

