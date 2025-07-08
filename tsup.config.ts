import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	tsconfig: './tsconfig.json',
	clean: true,
	treeshake: false,
	minify: false,
})
