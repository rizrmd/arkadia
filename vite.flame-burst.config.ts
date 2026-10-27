import {defineConfig} from 'vite';
export default defineConfig({base:'/ember-warden-review/flame-burst/',publicDir:false,build:{outDir:'dist-flame-burst',rollupOptions:{input:'flame-burst.html'}}});
