import {defineConfig} from 'vite';
export default defineConfig({base:'/rift-runner/rift-bolt-levels/',publicDir:false,build:{outDir:'dist-rift-bolt',rollupOptions:{input:'rift-bolt-player.html'}}});
