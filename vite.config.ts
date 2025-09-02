import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => {
  if (mode === 'library') {
    // Конфигурация для сборки библиотеки
    return {
      plugins: [
        dts({
          insertTypesEntry: true,
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
        })
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'WhisperWasm',
          fileName: (format) => `index.${format}.js`,
          formats: ['es', 'cjs', 'umd']
        },
        rollupOptions: {
        },
        outDir: 'dist',
        // Копируем WASM файлы в dist
        copyPublicDir: false,
        assetsInclude: ['**/*.wasm', '**/*.js']
      },
      resolve: {
        alias: {
          '@wasm': resolve(__dirname, 'wasm')
        }
      },
      // Настройки для обработки WASM файлов
      optimizeDeps: {
        // exclude: ['@wasm/libmain.js', '@wasm/libstream.js', '@wasm/libcommand.js', '@wasm/libbench.js']
      }
    };
  }

  if (mode === 'demo') {
    // Конфигурация для сборки демо
    return {
      root: 'demo',
      build: {
        outDir: '../demo-dist',
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'demo/index.html')
          },
          // Исключаем WASM файлы из бандлинга в демо
          external: (id) => {
            return id.includes('@wasm/') || id.includes('wasm/');
          }
        },
        // Копируем WASM файлы в демо
        copyPublicDir: false,
        assetsInclude: ['**/*.wasm', '**/*.js']
      },
      resolve: {
        alias: {
          '@wasm': resolve(__dirname, 'wasm')
        }
      },
      server: {
        port: 3000,
        open: true
      },
      // Настройки для обработки WASM файлов
      optimizeDeps: {
        exclude: ['@wasm/libmain.js', '@wasm/libstream.js', '@wasm/libcommand.js', '@wasm/libbench.js']
      }
    };
  }

  // Конфигурация по умолчанию
  return {
    resolve: {
      alias: {
        '@wasm': resolve(__dirname, 'wasm')
      }
    },
    optimizeDeps: {
      exclude: ['@wasm/libmain.js', '@wasm/libstream.js', '@wasm/libcommand.js', '@wasm/libbench.js']
    }
  };
});