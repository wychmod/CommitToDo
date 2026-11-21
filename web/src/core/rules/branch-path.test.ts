import { describe, expect, it } from 'vitest';
import { childPath, collectSubtree, depthFromPath, movedPath, ROOT_PATH } from './branch-path';

describe('childPath 与 depthFromPath', () => {
  it('根下的分支路径为 /id/', () => {
    expect(ROOT_PATH).toBe('/');
    expect(childPath('/', 'a')).toBe('/a/');
    expect(childPath('/a/', 'b')).toBe('/a/b/');
  });

  it('缺尾斜杠的父路径会被补齐', () => {
    expect(childPath('/a', 'b')).toBe('/a/b/');
  });

  it('深度等于路径段数减一', () => {
    expect(depthFromPath('/')).toBe(0);
    expect(depthFromPath('/a/')).toBe(1);
    expect(depthFromPath('/a/b/')).toBe(2);
    expect(depthFromPath('/a/b/c/')).toBe(3);
  });
});

describe('collectSubtree（前缀不串支）', () => {
  const nodes = [
    { id: 'a', path: '/a/' },
    { id: 'b', path: '/a/b/' },
    { id: 'bc', path: '/a/bc/' },
    { id: 'c', path: '/a/b/c/' },
    { id: 'x', path: '/x/' },
  ];

  it('/a/b/ 的子树不包含 /a/bc/', () => {
    expect(collectSubtree(nodes, '/a/b/').map((node) => node.id)).toEqual(['b', 'c']);
  });

  it('一级分支的子树包含它下面所有层级，但不含兄弟', () => {
    expect(collectSubtree(nodes, '/a/').map((node) => node.id)).toEqual(['a', 'b', 'bc', 'c']);
  });

  it('叶子只取自身', () => {
    expect(collectSubtree(nodes, '/a/bc/').map((node) => node.id)).toEqual(['bc']);
  });
});

describe('movedPath（子树路径改写）', () => {
  it('移动到新父分支后保留相对后缀', () => {
    expect(movedPath('/a/', '/a/', '/x/')).toBe('/x/');
    expect(movedPath('/a/b/', '/a/', '/x/')).toBe('/x/b/');
    expect(movedPath('/a/b/c/', '/a/', '/x/y/')).toBe('/x/y/b/c/');
  });

  it('新父路径缺尾斜杠也能拼对', () => {
    expect(movedPath('/a/b/', '/a/', '/x')).toBe('/x/b/');
  });

  it('改写后的深度等于路径段数减一', () => {
    expect(depthFromPath(movedPath('/a/b/', '/a/', '/x/y/'))).toBe(3);
  });
});
