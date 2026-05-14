import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace'; 
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import postcssImport from 'postcss-import';

const input = {
  index: 'src/index.jsx',
  components: 'src/components/index.js',
  composebar: 'src/composebar/index.js',
  history: 'src/history/index.js',
  widgets: 'src/widgets/index.js',
  chat: 'src/chat/index.js',
  agents: 'src/agents/index.js',
  files: 'src/files/index.js',
  Announcements: 'src/Announcements/index.js',
  schedulers: 'src/schedulers/index.js',
  Authorization: 'src/Authorization/index.js'
};

const esmEntryFileNames = (chunkInfo) => {
  return chunkInfo.name === 'index' ? 'index.esm.js' : '[name]/index.esm.js';
};

const cjsEntryFileNames = (chunkInfo) => {
  return chunkInfo.name === 'index' ? 'index.cjs.js' : '[name]/index.cjs.js';
};

export default {
  input,

  output: [    
    {
      dir: 'dist',
      format: 'esm',
      entryFileNames: esmEntryFileNames,
      chunkFileNames: 'chunks/[name]-[hash].esm.js'
    },

    {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: cjsEntryFileNames,
      chunkFileNames: 'chunks/[name]-[hash].cjs.js',
      exports: 'auto'
    }
  ],

  external: [
    'react',
    'react-dom',
    '@reduxjs/toolkit',
    'axios',
    'lodash',
    'moment',
    'uuid',
    'echarts',
    'codemirror',
    '@codemirror/lang-javascript',
    '@codemirror/lang-python',
    '@codemirror/lang-json',
    '@codemirror/lang-html',
    '@codemirror/lang-css',
    '@codemirror/lang-sql',
    '@codemirror/lang-xml',
    '@codemirror/lang-java',
    '@codemirror/lang-cpp',
    'quill',
    'json-editor',
    '@json-editor/json-editor',
    'socket.io-client',
    'kore-web-sdk',
    'dompurify',
    'marked',
    'html-dom-parser'
  ],

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),

    resolve({
      preferBuiltins: false,
      browser: true,
      extensions: ['js', 'jsx']
    }),

    postcss({
      extract: 'sdk-styles.css',
      minimize: true,
      use: [
        ['sass', {
          includePaths: ['./src/styles'],
          api: 'modern-compiler'
        }]
      ],
      plugins: [postcssImport()]
    }),

    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: ['@babel/preset-react']
    }),

    commonjs(),
    json(),

    alias({
      entries: [
        { find: 'util', replacement: './util-polyfill.js' }
      ]
    }),

    copy({
      targets: [
        { src: 'public/images/*', dest: 'dist/images' }
      ]
    }),

    terser()
  ]
};