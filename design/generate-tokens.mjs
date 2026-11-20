// 从 design-tokens.json 生成 tokens.css。输出物不手改，改令牌请回到 JSON 后重跑本脚本。
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const { makeTokensCss } = await import(pathToFileURL(path.join(here, 'source', 'shared.mjs')).href);

const css = makeTokensCss();
await writeFile(path.join(here, 'tokens.css'), css, 'utf8');
console.log(`tokens.css 已生成：${css.split('\n').length} 行，${css.length} 字符`);
