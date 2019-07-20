---
layout: post
title: '第一篇博客'
date: 2018-04-25 22:10:25 +0800
tags: []
published: true
location: 上海 二联家园
hideInList: false
feature: 
---

### 说说为什么域名是 ``auaa``吧？

  我发现GitHub可以自定义博客是比较晚的（2018年04月24日），原来已经注册了一个域名，发现可以写博客了，就觉得博客还是应该有一个好的域名才行。

  - 就开始修改GitHub的用户名，开始计划修改成各种英文单词，发现都被占用了。
  - Google了一个帖子说，可以先访问 github.com/`` username``，这样如果访问不存在就可以注册，就用英文字母组合来测试网址是否可以正常访问。开始是使用26个英文字母，组成两位的来访问。

  程序大概是这样的：

  ```java
  public static void main(String[] args) {
      String target = "abcdefghijklmnopqrstuvwxyz";
      for (int i = 0; i < target.length(); i++) {
          for (int j = 0; j < target.length(); j++) {
              System.out.print(target.charAt(i));
              url(""+target.charAt(i)+target.charAt(j),i);
          }
      }
  }

  public static void url(String key,int i){
      try {
          URL url = new URL("https://github.com/"+key);
          HttpURLConnection connection = (HttpURLConnection)url.openConnection();
          if(404 == connection.getResponseCode()){
              System.out.println(key);
          }
      } catch (Exception e) {
      }
  }
  ```

  控制台并没有打印什么。尝试三位字母组合的吧。程序大概是这样的：

  ```java
  public static void main(String[] args) {
      String target = "abcdefghijklmnopqrstuvwxyz";
      for (int i = 18; i < target.length(); i++) {
          final int a = i;
          new Thread(()->{
              for (int j = 0; j < target.length(); j++) {
              //
                  for (int k = 0; k < target.length(); k++) {
                          url(""+target.charAt(a) + target.charAt(j) + target.charAt(k));
                  }
              }
          }).start();
      }
  }

  public static void url(String key){
      try {
          URL url = new URL("https://github.com/"+key);
          HttpURLConnection connection = (HttpURLConnection)url.openConnection();
          if(404 == connection.getResponseCode()){
              System.out.println("key = " + key);
          }
      } catch (Exception e) {
      }
  }
  ```

  控制台上打印了几个，包括``see``、``uau``、``vav``等，这期间我的Mac本上的Chrome浏览器崩溃过几次，我访问了一下也确实是404，但是无法修改成这个。

  - 就尝试4位组合，想想26×26×26×26，Mac本会扛不住的，就直接在最前面加了一个a，打印在控制台上的第一个组合就是 ``auaa``。
  - 修改用户名``auaa``成功。



今天先到此为止吧。
