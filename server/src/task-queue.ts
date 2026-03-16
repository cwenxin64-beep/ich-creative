import { v4 as uuidv4 } from 'uuid';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 任务数据结构
 */
export interface Task {
  id: string;
  status: TaskStatus;
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  result?: any;
  error?: string;
}

/**
 * 简单的内存任务存储
 * 生产环境建议使用 Redis 或数据库
 */
class TaskStore {
  private tasks: Map<string, Task> = new Map();
  
  /**
   * 创建新任务
   */
  create(): Task {
    const id = uuidv4();
    const now = new Date();
    const task: Task = {
      id,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }
  
  /**
   * 获取任务
   */
  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }
  
  /**
   * 更新任务状态
   */
  update(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  /**
   * 删除旧任务（超过 1 小时的已完成/失败任务）
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.updatedAt.getTime() < oneHourAgo
      ) {
        this.tasks.delete(id);
      }
    }
  }
}

// 全局任务存储实例
export const taskStore = new TaskStore();

// 定期清理旧任务
setInterval(() => {
  taskStore.cleanup();
}, 10 * 60 * 1000); // 每 10 分钟清理一次
