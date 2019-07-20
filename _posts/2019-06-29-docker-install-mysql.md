---
layout: post
title: 'docker安装mysql'
date: 2019-06-29 10:49:27 +0800
tags: []
published: true
location: 上海 二联家园
hideInList: false
feature: 
---

1. 从Docker Hub查找镜像

   ```bash
   $ docker search mysql # 查找mysql相关的镜像
   ```

   查询的结果大致如下：

   | NAME                    | DESCRIPTION                                   | STARS | OFFICIAL | AUTOMATED |
   | ----------------------- | --------------------------------------------- | ----- | -------- | --------- |
   | mysql                   | MySQL is a widely used, open-source relation… | 8328  | [OK]     |           |
   | ...                     |                                               |       |          |           |
   | centos/mysql-57-centos7 | MySQL 5.7 SQL database server                 | 56    |          |           |

   ``我这里选择的是 centos/mysql-57-centos7，如果你也需要安装的是centos/mysql-57-centos7，此步骤可忽略``

   

2. 拉取仓库镜像

   ```bash
   $ docker pull centos/mysql-57-centos7 # 拉取centos/mysql-57-centos7镜像
   ```

   ``如果你也需要安装的是centos/mysql-57-centos7,此步骤可以忽略``

3. 拉取完镜像后，只需要创建容器即可

   ```bash
   $ docker run --name=mysql --restart=always -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_LOWER_CASE_TABLE_NAMES=1 -p 3306:3306 -v ~/docker/mysql:/var/lib/mysql -d centos/mysql-57-centos7
   ```

   ``先运行以上命令可以直接安装成功，后面会针对此命令做详细说明。``

   *以上三步，如果你确认安装的是centos/mysql-57-centos7,可直接执行第三步骤的命令即可。docker在创建容器的时候，会检测是否安装镜像，如果未安装的镜像，会拉取对应的镜像。*

   

   步骤三的命令详解：

   **docker run ：**创建一个新的容器并运行一个命令

   docker命令语法规则：

   ```bash
   $ docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
   ```

   [XXX] 中的参数非必填。

   OPTIONS说明：

   `--name mysql` ： 为容器指定一个名称<u>mysql</u>

   `--restart=always`: 容器跟随docker容器启动而启动

   `-e MYSQL_ROOT_PASSWORD=123456`: 为容器设置环境变量，此行命令，为mysql的root用户设置密码为123456

   `-p 3307:3306`: 指定端口映射，此处是将容器内的3306端口映射到宿主机器的3307端口，因此访问使用localhost:3307即可访问数据库

   `-v ~/docker/mysql:/var/lib/mysql`: 指定磁盘映射，可以不要此参数，此处目的是将mysql的数据文件存放在宿主机器上，不至于删除容器后，数据跟着丢失，即便删除容器后，下次创建时，做好磁盘映射，数据不会丢失。

   `-d`: 后台运行容器，并返回容器的id

   

   再说明一下容器环境变量：(可参考[官网介绍](https://hub.docker.com/r/centos/mysql-57-centos7))

   在初始化容器时，可通过传递`-e VAR=VALUE` 给容器传递以下环境变量。

   | 参数名称                | 描述                      |
   | ----------------------- | ------------------------- |
   | **MYSQL_USER**          | 要创建的MySQL帐户的用户名 |
   | **MYSQL_PASSWORD**      | 用户帐户的密码            |
   | **MYSQL_DATABASE**      | 数据库名称                |
   | **MYSQL_ROOT_PASSWORD** | root用户的密码            |

   以下环境变量会影响mysql配置文件，都是可选的。

   | 参数名称                         | 描述                                                |
   | -------------------------------- | --------------------------------------------------- |
   | **MYSQL_LOWER_CASE_TABLE_NAMES** | 设置表名的存储和比较方式，默认为0                   |
   | **MYSQL_MAX_CONNECTIONS**        | 允许的最大同时客户端连接数，默认为151               |
   | **MYSQL_MAX_ALLOWED_PACKET**     | 一个数据包或任何生成/中间字符串的最大大小，默认200M |
   | **MYSQL_FT_MIN_WORD_LEN**        | 要包含在FULLTEXT索引中的单词的最小长度，默认4       |
   | **MYSQL_FT_MAX_WORD_LEN**        | 要包含在FULLTEXT索引中的单词的最大长度，默认20      |

   … 等等，不一一赘述。

   

4. 通过terminal访问容器中的mysql命令

   ```bash
   $ docker exec -it  mysql /bin/bash
   ```

   ```bash
   runoob@runoob:~$ docker exec -i -t  mysql /bin/bash
   bash-4.2:$ 
   ```

   如果命令提示符中出现上述，在$后面直接输入mysql命令即可。

5. 常用命令

   ```bash
   $ docker start mysql # 启动mysql容器，这里mysql是上面定义的容器名
   ```

   ```bash
   $ docker stop mysql # 停止运行中的mysql容器，这里mysql是上面定义的容器名
   ```

   ```bash
   $ docker restart mysql # 重启mysql容器，这里mysql是上面定义的容器名
   ```

6. 删除容器命令

   ```bash
   $ docker rm mysql #mysql 是上面定义的容器名
   ```

   ```bash
   $ docker rm -f mysql #	强制删除运行中的容器
   ```

   ```bash
   $ docker rm -v mysql # 删除容器的同时，删除容器挂载的数据卷，即对应的磁盘
   ```

7. 删除镜像命令

   ```bash
   $ docker rmi centos/mysql-57-centos7 # centos/mysql-57-centos7镜像名
   ```

   ```bash
   $ docker rmi -f centos/mysql-57-centos7 # 强制删除镜像
   ```