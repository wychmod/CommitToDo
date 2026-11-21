import Dexie from 'dexie';

/**
 * 事务守卫（docs/CODE-STRUCTURE.md §1）。
 *
 * 仓储写方法只允许在用例的 `db.transaction` 内被调用；在事务外调用属于
 * 编程错误，直接抛 `Error`，不转成领域 `Result`。
 */
export function assertInTransaction(): void {
  if (!Dexie.currentTransaction) {
    throw new Error('写操作必须在用例的 db.transaction 内调用（CODE-STRUCTURE §1）。');
  }
}
