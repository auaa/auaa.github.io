---
layout: post
title: nvm 常用命令
date: 2020-7-15 21:02:12 +0800
tags: [nvm,nodejs]
published: true
location: 杭州
feature: 
---

> nvm 常用命令



| 命令                           | 用途                                              |
| ------------------------------ | ------------------------------------------------- |
| nvm --help                     | 帮助                                              |
| nvm --version                  | 打印当前使用的版本号                              |
| nvm install [-s] \<version\>   | 下载安装指定版本                                  |
| nvm uninstall \<version\>      | 卸载特定版本                                      |
| nvm use [--silent] \<version\> | 使用特定版本                                      |
| nvm current                    | 打印当前版本号                                    |
| nvm ls                         | 查看本地所有已安装的版本                          |
| nvm ls \<version\>             | 列出所有符合的本地版本                            |
| nvm ls-remote                  | 查看远程版本                                      |
| nvm version-remote \<version\> | 查看符合条件的远程版本                            |
| nvm deactivate                 | 撤消`nvm`对当前shell的影响                        |
| nvm alias [\<pattern\>]        | 显示所有以\<pattern\>开头的别名                   |
| nvm alias \<name\> \<version\> | 设置一个名为\<name\>的别名，该别名指向\<version\> |
| nvm unalias \<name\>           | 删除别名                                          |
| nvm unload                     | 从shell卸载`nvm`                                  |
| nvm which [\<version\>]        | 显示特定版本的安装路径                            |

<br>

```bash
// 设置默认的版本为v9.11.2  
nvm alias default v9.11.2 
```

