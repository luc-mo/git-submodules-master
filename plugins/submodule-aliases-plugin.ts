import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'esbuild'

interface IPluginOptions {
  name?: string
  dir: string
  submodules: string[]
}

export const submoduleAliasesPlugin = ({ name, dir, submodules }: IPluginOptions): Plugin => {
  return {
    name: name ?? 'submodule-aliases',
    setup: (build) => {
      const submodulesDir = path.resolve('./', dir)
      build.onResolve({ filter: /^@[^/]+(?:\/.*)?$/ }, (args) => {
        
        const submodulePath = args.importer.replace(submodulesDir, '')
        const submoduleName = submodules.find(submodule => 
          submodulePath.startsWith(`/${submodule}`) ||
          submodulePath.startsWith(`\\${submodule}`)
        )
        console.log({ submodulePath, submoduleName })
        if(!submoduleName) return
        
        const isNestedSubmodule = submodulePath.includes(dir)
        const isInternal = args.path.startsWith('@/')

        if(!isNestedSubmodule && isInternal) {
          const resolvedPath = path.resolve('./', dir, submoduleName, 'src', args.path.replace('@/', ''))
          const fullPath = resolvedPath.concat('.ts')
          const fileExists = fs.existsSync(fullPath)

          if(fileExists) return { path: fullPath }
          return { path: resolvedPath }
        }

        return args
      })
    }
  }
}
