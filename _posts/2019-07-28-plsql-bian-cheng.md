---
layout: post
title: 'PLSQL编程'
date: 2019-07-28 21:31:44 +0800
tags: [oracle]
published: true
location: 上海 二联家园
feature: 
---
## PLSQL编程
1. 什么是PL/SQL？
- 全称：Procedure Language/SQL
- 是Oracle对sql语言过程化的扩展
- SQL命令中增加了过程处理语句

2. 程序结构
PL/SQL可以分为三部分：声明部分、可执行部分、异常处理部分。

通过PL/SQL Developer工具的Test Window创建程序模板，示例如下：

```sql
-- Created on 2019/7/28 by ADMINISTRATOR 
declare 
  -- Local variables here
  i integer;
begin
  -- Test statements here
  
end;
```

其中，declare部分是变量申明部分，如果没有变量，可以省略。

3. Hello World
```sql
begin
  -- 打印Hello World
  dbms_output.put_line('Hello World!');
end;
```

dbms_output是oracle内置的工具包。

![](https://auaa.github.io/assets/img/1564321568457.png)
![](https://auaa.github.io/assets/img/1564321583033.png)

执行结束后，未打印输出结构，是因为默认情况下，输出选项是关闭的。如需开启，
`` set serveroutput on ``

4. 变量
变量类型分为两大类：
- 普通数据类型（char,varchar2,date,number,boolean,long）
- 特殊变量类型（引用型变量）
声明变量方式

```sql
v_name varchar2(20);
```

变量的赋值方式：
- 直接赋值。 `` v_name := '张三'; ``
- 语句赋值。`` select name into v_name from t  ``
示例：

```sql
declare
  v_name varchar2(20) := '张三';
  v_age  number;
  v_addr varchar2(200);
begin
  -- 打印Hello World
  v_age := 18;
  select '上海 二联家园' into v_addr from dual;
  -- 打印（省略）
end;
```

5. 流程控制