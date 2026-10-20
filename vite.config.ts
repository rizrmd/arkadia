import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{arena:'index.html',stronghold:'stronghold.html',expedition:'expedition.html',snow:'snow-expedition.html'}}}});
