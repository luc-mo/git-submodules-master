import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	tsconfig: './tsconfig.json',
	format: ['esm'],
	clean: true,
	treeshake: false,
	minify: false,
})
