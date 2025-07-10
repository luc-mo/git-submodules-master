import { defineConfig } from 'tsup'
import { submoduleAliasesPlugin } from './plugins/submodule-aliases-plugin'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	tsconfig: './tsconfig.json',
	clean: true,
	treeshake: true,
	minify: false,
	esbuildPlugins: [
		submoduleAliasesPlugin()
	],
})
