import { defineConfig } from 'tsup'
import { submoduleAliasesPlugin } from './plugins/submodule-aliases-plugin'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	tsconfig: './tsconfig.json',
	clean: true,
	treeshake: false,
	minify: false,
	esbuildPlugins: [
		submoduleAliasesPlugin({ dir: 'packages', submodules: ['lib'] })
	],
})
