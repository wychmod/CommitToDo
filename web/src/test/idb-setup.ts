/**
 * 只有 `db` 测试项目加载这个文件：给需要 IndexedDB 的用例装内存实现。
 * 纯函数项目（unit）不引入，避免无关开销。
 */
import 'fake-indexeddb/auto';
