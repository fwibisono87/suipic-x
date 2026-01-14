import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess({
        scss: {
            prependData: `@use 'src/lib/styles/variables' as *;`
        }
    }),
    kit: {
        adapter: adapter(),
        alias: {
            $components: './src/lib/components',
            $services: './src/lib/services',
            $composables: './src/lib/composables',
            $types: './src/lib/types'
        }
    }
};

export default config;
