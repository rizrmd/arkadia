import {defineConfig} from 'vite';
export default defineConfig({base:'/ember-warden-review/flame-fan-levels/',publicDir:false,build:{outDir:'dist-flame-fan',rollupOptions:{input:'flame-fan-player.html'}}});
