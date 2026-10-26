import {defineConfig} from 'vite';
export default defineConfig({base:'/flame-burst/',publicDir:false,build:{outDir:'dist-flame-burst',rollupOptions:{input:'flame-burst.html'}}});
