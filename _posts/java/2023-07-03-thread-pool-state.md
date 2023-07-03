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

> RUNNING:  Accept new tasks and process queued tasks

线程池处于运行状态，既能接受新的任务，也能处理队列中的任务。

## SHUTDOWN

> SHUTDOWN: Don't accept new tasks, but process queued tasks

线程池调用shutdown()方法后，线程池进入SHUTDOWN状态，表示线程池处理关闭状态，不再继续接收任务，队列中的任务仍然处理完成。

## STOP

> STOP:     Don't accept new tasks, don't process queued tasks,and interrupt in-progress tasks

线程池调用shutdownnow()方法时，线程池会进入STOP状态，线程池不接受新任务，也不会处理队列中的任务，正在运行的线程也会中断。

## TIDYING

> TIDYING:  All tasks have terminated, workerCount is zero, the thread transitioning to state TIDYING will run the terminated() hook method

线程池中没有线程在运行后，线程池的状态会自动进入TIDYING状态，并且调用terminated()方法

## TERMINATED

> TERMINATED: terminated() has completed

terminated()方法执行后，线程池进入TERMINATED状态，线程池关闭

