---
layout: post
title: 从query ajax发送get请求来解读jquery源码
date: 2020-7-16 10:10:12 +0800
tags: [解读源码,javascript,jquery]
published: true
location: 杭州
feature: 
---

> 本文从get请求的4种写法来解读jquery源码。
>
> 源码：https://github.com/jquery/jquery/blob/master/src/ajax.js



从大家常用的写法说起

#### 1. $.ajax([options]) 

```javascript
$.ajax({
  'method': 'get',
  'url': 'http://xxx?a=A', // 两种传参方式都一样
  'data': object, // 这里可以传参
  'success': function(res){
    // res 是请求响应的结果
  },
  'error': function(e){
    
  }
});
```



以上这种写法，相信很多人都会写，甚至有人唯一会的一种写法就是这样。



#### 2. $.ajax(url,[options])

```javascript
$.ajax('http://xxx?a=A',{
  'method': 'get',
  'data': object,
  'success': function(res){
    // res 是请求响应的结果
  },
  'error': function(e){
    
  }
});
```



1.2 两种方式，jquery源码如下：

```javascript
ajax: function( url, options ) {

    // [笔者注]: 如果url是object类型，也就是第一种写法
		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};
 
    // ....以下内容略去
}
```



#### 3.  $.get(url, data, callback, type)

```javascript
$.get('http://xxx?a=A',object,function(res){
  // res 是请求响应的结果
},'json');
```

如果没有参数，也可以做以下写法：

```javascript
$.get('http://xxx?a=A',function(res){
  // res 是请求响应的结果
},'json');
```

jquery源码如下：

```javascript
jQuery.each( [ "get", "post" ], function( _i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

    // [笔者注] 如果data参数为空就将所有的参数向前移动
		// Shift arguments if data argument was omitted
		if ( typeof data === "function" ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );
```



#### 4. $.getJSON(url, data, callback)

```javascript
// [笔者注] 此处object不可省略
$.getJSON('http://xxx?a=A',object,function(res){
  // res为响应的结果
});
```

jquery源码如下：

```javascript
getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},
```

那么，如果确实没有参数，也可以换一种写法

```javascript
$.getJSON('http://xxx?a=A').done(function(res){
    // res为响应的结果
});
```



> **尾记：** 由于JavaScript是弱类型语言，在多态的支持上比较弱。
>
> 但是jquery还是坚持实现。不得不说，还是给我们开拓了一些思维的。