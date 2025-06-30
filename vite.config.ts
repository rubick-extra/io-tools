import { defineConfig } from 'vite';
import { exec } from "node:child_process";
import path from 'path';

function getRootPath() {
  return path.resolve(process.cwd());
}

function getSrcPath(srcName = 'src') {
  const rootPath = getRootPath();

  return `${rootPath}/${srcName}`;
}

const runYalc = () => {
  return {
    name: "run-yalc",
    async buildEnd() {
      await new Promise((resolve) => setTimeout(resolve, 300));
      exec("npx yalc push --scripts", (response, error) => {
        if (error) console.error(error);
        if (response) console.log(response);
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  base: '',
  resolve: {
    alias: {
      '@': getSrcPath()
    }
  },
  plugins: [
    runYalc()
  ],
  build: {
    outDir: '.',
    lib: {
      entry: [path.resolve(__dirname, 'src/index.ts'), path.resolve(__dirname, 'src/use-io-events.ts')],
      name: 'iotools',
      formats: ['cjs'],
      fileName: () => `[name].js`
    },
    sourcemap: true,
    rollupOptions: {
      external: ['uiohook-napi', '@electron/remote', 'execa', 'child_process', 'os', 'electron']
    }
  }
});
