import {defineConfig} from 'vite';
export default defineConfig({base:'/rift-dash/player/',publicDir:false,build:{outDir:'dist-rift-dash',rollupOptions:{input:'rift-dash-player.html'}}});
