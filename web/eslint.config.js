import babelParser from '@babel/eslint-parser';
import presetReact from '@babel/preset-react';
import presetTypescript from '@babel/preset-typescript';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * 说明：typescript-eslint 8.x 的 peer 上限是 TypeScript <6.1，本项目用 TS 7.0，
 * 因此这里改用 Babel parser 只做语法解析；类型检查由 `npm run build` 的 `tsc -b` 负责。
 * 规则能力不受影响：依赖方向、硬编码色值、界面中文、Hooks 都能在语法层判定。
 */

const DEP_MESSAGE = '依赖方向违规：只允许从外层引用内层（见 AGENTS.md 的目录职责）。';

/** 生成一条「禁止引用这些模块」的规则。 */
const forbidImports = (patterns) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: patterns.map((group) => ({ group: [group], message: DEP_MESSAGE })),
    },
  ],
});

const HEX_COLOR = {
  selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message: '禁止硬编码色值：使用 design/tokens.css 的变量（TECH §2.5）。',
};

const COLOR_FUNCTION = {
  selector: 'Literal[value=/^(?:rgb|rgba|hsl|hsla)\\(/]',
  message: '禁止硬编码颜色函数：使用 design/tokens.css 的变量。',
};

const CHINESE_JSX = {
  selector: 'JSXText[value=/[\\u4e00-\\u9fa5]/]',
  message: "界面文案必须走 i18n：用 t('域.元素.语义')（TECH §2.8）。",
};

const CHINESE_LITERAL = {
  selector: 'Literal[value=/[\\u4e00-\\u9fa5]/]',
  message: "界面文案必须走 i18n：用 t('域.元素.语义')（TECH §2.8）。",
};

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [
            [presetTypescript, { isTSX: true, allExtensions: true }],
            [presetReact, { runtime: 'automatic' }],
          ],
        },
      },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // 类型层面的未使用与未定义由 tsc 负责；Babel AST 不展开 TS 类型节点，避免误报。
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-syntax': ['error', HEX_COLOR, COLOR_FUNCTION],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: forbidImports([
      '**/data/**',
      '**/pages/**',
      '**/components/**',
      '**/stores/**',
      '**/ui/**',
      'react',
      'react-dom',
      'dexie',
      'dexie-react-hooks',
    ]),
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: forbidImports(['**/pages/**', '**/components/**', '**/stores/**', '**/ui/**']),
  },
  {
    files: ['src/i18n/**/*.{ts,tsx}'],
    rules: forbidImports([
      '**/pages/**',
      '**/components/**',
      '**/data/**',
      '**/stores/**',
      '**/ui/**',
      'react',
    ]),
  },
  {
    files: ['src/stores/**/*.{ts,tsx}'],
    rules: forbidImports(['**/pages/**', '**/components/**', '**/data/**', '**/ui/**']),
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: forbidImports(['**/pages/**', '**/components/**', '**/data/**', '**/stores/**']),
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: forbidImports(['**/pages/**', '**/data/db', '**/data/db.*']),
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: forbidImports(['**/data/db', '**/data/db.*']),
  },
  {
    files: ['src/{pages,components,ui}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', HEX_COLOR, COLOR_FUNCTION, CHINESE_JSX, CHINESE_LITERAL],
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
