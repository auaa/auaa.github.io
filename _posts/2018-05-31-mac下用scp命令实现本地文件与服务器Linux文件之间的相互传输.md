---
layout: post
title: 'mac下用scp命令实现本地文件与服务器Linux文件之间的相互传输'
date: 2018-05-31 17:32:18 +0800
tags: []
published: true
location: 上海 二联家园
hideInList: false
feature: 
---

### scp的复制

查看scp帮助：sup -h      

输出信息如下：

```
usage: scp [-346BCpqrv] [-c cipher] [-F ssh_config] [-i identity_file]
           [-l limit] [-o ssh_option] [-P port] [-S program]
           [[user@]host1:]file1 ... [[user@]host2:]file2
```





OPTIONS：

-v 和大多数 linux命令中的-v意思一样，用来显示进度。可以用来查看连接、认证、或是配置错误

-C 使能压缩选项

-P 选择端口

-r 复制目录

## 从本地将文件传输到服务器(Linux)

scp【本地文件的路径】【服务器用户名】@【服务器地址】：【服务器上存放文件的路径】

```
scp /Users/mac_pc/Desktop/test.png root@192.168.1.1:/root
```





## 从本地将文件夹传输到服务器(Linux)

scp -r【本地文件的路径】【服务器用户名】@【服务器地址】：【服务器上存放文件的路径】

```
sup -r /Users/mac_pc/Desktop/test root@192.168.1.1:/root
```



## 将服务器上的文件传输到本地(Mac)

scp 【服务器用户名】@【服务器地址】：【服务器上存放文件的路径】【本地文件的路径】

```
scp root@192.168.1.1:/data/wwwroot/default/111.png /Users/mac_pc/Desktop
```



## 将服务器上的文件夹传输到本地(Mac)

scp -r 【服务器用户名】@【服务器地址】：【服务器上存放文件的路径】【本地文件的路径】

```
sup -r root@192.168.1.1:/data/wwwroot/default/test /Users/mac_pc/Desktop
```
