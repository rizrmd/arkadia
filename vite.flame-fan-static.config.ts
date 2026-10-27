import {defineConfig} from 'vite';
export default defineConfig({base:'/ember-warden-review/flame-fan-static/',publicDir:false,build:{outDir:'dist-flame-fan-static',rollupOptions:{input:'flame-fan-static.html'}}});
