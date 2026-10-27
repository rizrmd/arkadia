import {defineConfig} from 'vite';
export default defineConfig({base:'/environment-editor/',publicDir:false,build:{outDir:'dist-environment-editor',emptyOutDir:true,rollupOptions:{input:'public/environment-editor/index.html'}}});
