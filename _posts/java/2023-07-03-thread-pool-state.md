---
layout: post
title: java线程池状态
date: 2023-07-03 08:36:27 +0800
tags: [java]
published: true
location: 义乌 西何三区
feature: 
---

> 线程池的5种状态。RUNNING、SHUTDOWN、STOP、TIDYING、TERMINATED。

## RUNNING

线程池处于运行状态，既能接受新的任务，也能处理队列中的任务。

## SHUTDOWN

线程池调用shutdown()方法后，线程池进入SHUTDOWN状态，表示线程池处理关闭状态，不再继续接收任务，队列中的任务仍然处理完成。

## STOP

线程池调用shutdownnow()方法时，线程池会进入STOP状态，线程池不接受新任务，也不会处理队列中的任务，正在运行的线程也会中断。

## TIDYING

线程池中没有线程在运行后，线程池的状态会自动进入TIDYING状态，并且调用terminated()方法

## TERMINATED

terminated()方法执行后，线程池进入TERMINATED状态，线程池关闭
