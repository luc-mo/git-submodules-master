import { defineConfig } from 'tsup'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'esbuild'

const libAliasesPlugin: Plugin = {
  name: 'lib-aliases',
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
			const isLib =
				args.importer.includes('lib/') ||
				args.importer.includes('lib\\')

			if (isLib) {
        const resolvedPath = path.resolve('./lib/src/', args.path.replace('@/', ''))
        const fullPath = resolvedPath.concat('.ts')
				const fileExists = fs.existsSync(fullPath)
				if(fileExists) return { path: fullPath }
        return { path: resolvedPath }
      }
    })
  },
}

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	tsconfig: './tsconfig.json',
	clean: true,
	treeshake: false,
	minify: false,
	esbuildPlugins: [libAliasesPlugin],
})
