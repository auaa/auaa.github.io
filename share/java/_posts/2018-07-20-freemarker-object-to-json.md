---
layout: post
title:  freemarker中Object转换成json
date:   2018-07-20 11:26:27 +0800
location: 武汉 洪山广场
category: java
excerpt: 很多情况下，我们想在freemarker模板中获取对象的所有属性值，却苦于无法找到对应的属性名。这篇博客中的第一个函数可以帮您解决此问题。
---

freemarker模板中，我们想获取一个对象的属性值，但是不知道对象的属性名，下面就是解决方案。

1. 定义函数

```
<#function objectToJsonFunction object>
    <#if object??>
        <#if object?is_enumerable>
            <#local json = '['>
            <#list object as item>
                <#if item?is_hash>
                    <#if item_index &gt; 0 && json != "[" >
                        <#local json = json +',' >
                    </#if>
                    <#local json = json + objectToJsonFunction(item)>
                </#if>
            </#list>
            <#return json + ']'>
        <#elseif object?is_hash>
            <#local json = "{">
            <#assign keys = object?keys>
            <#list keys as key>
                <#if object[key]?? && !(object[key]?is_method) && key != "class">
                    <#if object[key]?is_number>
                        <#if key_index &gt; 0 && json != "{" >
                            <#local json = json +',' >
                        </#if>
                        <#local json = json + '"${key}": ${object[key]}'>
                    <#elseif object[key]?is_string>
                        <#if key_index &gt; 0 && json != "{" >
                            <#local json = json +',' >
                        </#if>
                        <#local json = json + '"${key}": "${object[key]?html!""?js_string}"'>
                    <#elseif object[key]?is_boolean >
                        <#if key_index &gt; 0 && json != "{" >
                            <#local json = json +',' >
                        </#if>
                        <#local json = json + '"${key}": ${object[key]?string("true", "false")}'>


                    <#elseif object[key]?is_enumerable >
                        <#if key_index &gt; 0 && json != "{" >
                            <#local json = json +',' >
                        </#if>
                        <#local json = json + '"${key}":'+ objectToJsonFunction(object[key])>


                    <#elseif object[key]?is_hash>
                        <#if key_index &gt; 0 && json != "{" >
                            <#local json = json +',' >
                        </#if>
                        <#local json = json + '"${key}":'+ objectToJsonFunction(object[key])>
                    </#if>
                </#if>
            </#list>
            <#return json +"}">
        </#if>
    <#else>
        <#return "{}">
    </#if>
</#function>
```

``特别提示：如果项目中使用的[]代替freemarker模板的<>，需要相应的修改成[],否则不会报错，上述代码会显示在页面上。``

2. 调用方法

```
${objectToJsonFunction(x)}
```



以下是图解获取request对象的属性值：直接拷贝上面的代码使用即可。

![使用代码](/assets/img/20180720113459.png)

![使用代码](/assets/img/20180720113548.png)

最终获得request的对应属性值分别如下：

```json
{
  "webApplicationContext": "org.springframework.boot.context.embedded.AnnotationConfigEmbeddedWebApplicationContext@4331d187: startup date [Fri Jul 20 11:11:10 CST 2018]; root of context hierarchy",
  "pathToServlet": "/",
  "urlPathHelper": "org.springframework.web.util.UrlPathHelper@574785b0",
  "locale": "zh_CN",
  "defaultHtmlEscape": false,
  "theme": "org.springframework.ui.context.support.SimpleTheme@30398865",
  "model": {
    "request": "org.springframework.web.servlet.support.RequestContext@2fcefa0",
    "springMacroRequestContext": "org.springframework.web.servlet.support.RequestContext@50dfc659"
  },
  "responseEncodedHtmlEscape": true,
  "contextPath": "/",
  "messageSource": "org.springframework.boot.context.embedded.AnnotationConfigEmbeddedWebApplicationContext@4331d187: startup date [Fri Jul 20 11:11:10 CST 2018]; root of context hierarchy",
  "requestUri": "/login"
}
```



`顺便纠正一个网上大部分都是错误的解答。freemarker中根据request获取当前页面url的方法。`

下面是一个错误的博客，

``http://www.tingzan123.com/article/2016/1214/477.html``



正确获取方式是：

```
${request.requestUri}
```

👆👆👆👆  这是才是正确的姿势。

