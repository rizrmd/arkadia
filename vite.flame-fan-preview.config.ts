import {defineConfig} from 'vite';
export default defineConfig({base:'/ember-warden-review/flame-fan-preview/',publicDir:false,build:{outDir:'dist-flame-fan-preview',rollupOptions:{input:'flame-fan-preview.html'}}});
