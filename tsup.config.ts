import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	tsconfig: './tsconfig.json',
	clean: true,
	treeshake: false,
	minify: false,
})
