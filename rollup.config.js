import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
// import nodePolyfills from 'rollup-plugin-polyfill-node';

import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import alias from '@rollup/plugin-alias';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import postcssImport from 'postcss-import';


const globals_var = {
  react: 'React',
  'react-dom': 'ReactDOM',
  '@reduxjs/toolkit': 'RTK',
  'redux-thunk': 'ReduxThunk',
};

const createConfig = (input, dir, name, isMainBuild = false) => ({
  input,
  output: [
    {
      dir: `dist/${dir}`,
      format: 'cjs',
      entryFileNames: '[name].cjs.js',
      exports: 'auto',
    },
    {
      dir: `dist/${dir}`,
      format: 'esm',
      entryFileNames: '[name].esm.js',
    }
  ],
  external: (id) => {
    // Never externalize Shoelace - it must be bundled
    if (id.includes('@shoelace-style/shoelace')) {
      return false;
    }
    // Externalize React ecosystem and globals
    if (Object.keys(globals_var).includes(id)) {
      return true;
    }
    if (id === 'window' || id === 'document') {
      return true;
    }
    return false;
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    resolve({
      preferBuiltins: false,
      browser: true,
      extensions: ['.js', '.jsx', '.css']
    }),
    // Combined CSS handling - injects Shoelace CSS, extracts SDK CSS
    postcss({
      extract: 'sdk-styles.css',
      minimize: true,
      // Inject Shoelace CSS directly, extract all other CSS
      inject: (cssVariableName, fileId) => {
        // Shoelace CSS gets injected into <head> at runtime
        if (fileId.includes('@shoelace-style') || fileId.includes('shoelace')) {
          return `(function(css){if(typeof document !== 'undefined'){var style=document.createElement('style');style.textContent=css;document.head.appendChild(style);}})(${cssVariableName});`;
        }
        // Other CSS is extracted to sdk-styles.css (return false = don't inject)
        return false;
      },
      use: [
        ['sass', {
          includePaths: ['./src/styles'],
          api: 'modern-compiler'
        }]
      ],
      plugins: [
        postcssImport()  // This will process @import statements after Sass compilation
      ],
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: ['@babel/preset-react']
    }),
    commonjs(),
    json(),
    builtins(),
    globals({
      // Exclude Shoelace and its dependencies (lit-html, lit, lit-element, etc.) from processing
      // These use modern JS syntax that the plugin's old acorn parser can't handle
      exclude: ['node_modules/@shoelace-style/**', 'node_modules/lit-html/**', 'node_modules/lit/**', 'node_modules/@lit/**', 'node_modules/lit-element/**']
    }),
    alias({
      entries: [
        { find: 'util', replacement: './util-polyfill.js' }
      ]
    }),
    // Only copy static assets for the main build to avoid duplication
    ...(isMainBuild ? [
      copy({
        targets: [
          { src: 'public/*', dest: 'dist' }
        ]
      })
    ] : []),
    terser()
  ]
});

export default [
  createConfig('src/index.jsx', '.', 'EvaUIReact', true), // Main build - copy static assets (includes unified CSS)
  createConfig('src/components/index.js', 'components', 'Components'),
  createConfig('src/composebar/index.js', 'composebar', 'ComposeBar'),
  createConfig('src/history/index.js', 'history', 'History'),
  createConfig('src/widgets/index.js', 'widgets', 'Widgets'),
  createConfig('src/chat/index.js', 'chat', 'Chat'),
  createConfig('src/agents/index.js', 'agents', 'Agents'),
  createConfig('src/files/index.js', 'files', 'Files'),
  createConfig('src/Announcements/index.js', 'Announcements', 'Announcements')
];
