import { defineConfig } from 'vite';

// На GitHub Pages сайт живёт в подпапке /<repo>/, локально — в корне.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/kaz-travel/' : '/',
});
