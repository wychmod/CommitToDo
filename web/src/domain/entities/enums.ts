/* eslint-disable @typescript-eslint/no-namespace */

export enum TaskStatus {
  todo = 0,
  inProgress = 1,
  done = 2,
  cancelled = 3,
}

export namespace TaskStatus {
  export function fromValue(value: number): TaskStatus {
    switch (value) {
      case TaskStatus.todo:
        return TaskStatus.todo;
      case TaskStatus.inProgress:
        return TaskStatus.inProgress;
      case TaskStatus.done:
        return TaskStatus.done;
      case TaskStatus.cancelled:
        return TaskStatus.cancelled;
      default:
        return TaskStatus.todo;
    }
  }

  export function label(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.todo:
        return '待办';
      case TaskStatus.inProgress:
        return '进行中';
      case TaskStatus.done:
        return '已完成';
      case TaskStatus.cancelled:
        return '已取消';
      default:
        return '待办';
    }
  }
}

export enum Priority {
  low = 0,
  medium = 1,
  high = 2,
}

export namespace Priority {
  export function fromValue(value: number): Priority {
    switch (value) {
      case Priority.low:
        return Priority.low;
      case Priority.medium:
        return Priority.medium;
      case Priority.high:
        return Priority.high;
      default:
        return Priority.medium;
    }
  }

  export function label(priority: Priority): string {
    switch (priority) {
      case Priority.low:
        return '低';
      case Priority.medium:
        return '中';
      case Priority.high:
        return '高';
      default:
        return '中';
    }
  }
}

export enum CommitType {
  create = 0,
  update = 1,
  merge = 2,
  complete = 3,
  delete = 4,
}

export namespace CommitType {
  export function fromValue(value: number): CommitType {
    switch (value) {
      case CommitType.create:
        return CommitType.create;
      case CommitType.update:
        return CommitType.update;
      case CommitType.merge:
        return CommitType.merge;
      case CommitType.complete:
        return CommitType.complete;
      case CommitType.delete:
        return CommitType.delete;
      default:
        return CommitType.create;
    }
  }

  export function label(type: CommitType): string {
    switch (type) {
      case CommitType.create:
        return '创建';
      case CommitType.update:
        return '更新';
      case CommitType.merge:
        return '合并';
      case CommitType.complete:
        return '完成';
      case CommitType.delete:
        return '删除';
      default:
        return '创建';
    }
  }
}
