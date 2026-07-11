// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'

export default defineConfig((/* ctx */) => {
  return {
    boot: ['pinia', 'axios'],

    css: ['app.scss'],

    extras: ['roboto-font', 'material-icons'],

    build: {
      target: {
        browser: 'baseline-widely-available',
        node: 'node22',
      },

      vueRouterMode: 'history',
      publicPath: '/admin/',

      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    devServer: {
      open: true,
      proxy: {
        // Mirrors production, where nginx routes /api/* to the same origin.
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },

    framework: {
      config: {},
      plugins: ['Notify', 'Dialog'],
    },

    animations: [],

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'aed-map-admin',
      },
    },

    bex: {
      extraScripts: [],
    },
  }
})
