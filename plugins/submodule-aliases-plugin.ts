import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'esbuild'

interface IPluginOptions {
  name?: string
  dir?: string
}

interface SubmoduleInfo {
  name: string
  path: string
  srcPath: string
}

export const submoduleAliasesPlugin = ({
  name = 'submodule-aliases',
  dir = 'packages'
}: IPluginOptions = {}): Plugin => {
  return {
    name,
    setup: (build) => {
      const rootDir = path.resolve('./')
      const rootSrcDir = path.join(rootDir, 'src')
      
      const discoverAllSubmodules = (): SubmoduleInfo[] => {
        const submodules: SubmoduleInfo[] = []
        
        const exploreDirectory = (baseDir: string): void => {
          const packagesPath = path.join(baseDir, dir)
          if (!fs.existsSync(packagesPath)) return
          
          try {
            const entries = fs.readdirSync(packagesPath, { withFileTypes: true })
            
            entries
              .filter(entry => entry.isDirectory())
              .forEach(entry => {
                const submodulePath = path.join(packagesPath, entry.name)
                const srcPath = path.join(submodulePath, 'src')
                
                if (fs.existsSync(srcPath)) {
                  submodules.push({
                    name: entry.name,
                    path: submodulePath,
                    srcPath: srcPath
                  })
                  exploreDirectory(submodulePath)
                }
              })
          } catch (error) {
            console.warn(`Error reading packages directory: ${packagesPath}`, error)
          }
        }

        exploreDirectory(rootDir)
        return submodules
      }

      const resolveFileWithExtensions = (basePath: string): string | null => {
        const attempts = [
          basePath,
          `${basePath}.ts`,
          `${basePath}.js`,
          path.join(basePath, 'index.ts'),
          path.join(basePath, 'index.js')
        ]

        for (const attemptPath of attempts) {
          if (fs.existsSync(attemptPath)) {
            const stat = fs.statSync(attemptPath)
            if (stat.isFile()) {
              return attemptPath
            }
          }
        }

        return null
      }

      const findOwnerContext = (filePath: string, submodules: SubmoduleInfo[]) => {
        const normalizedPath = path.resolve(filePath)
        
        // Check if it's in the master src directory
        if (normalizedPath.startsWith(rootSrcDir)) {
          return { 
            type: 'master' as const, 
            rootPath: rootDir,
            srcPath: rootSrcDir
          }
        }

        // Find the most specific submodule that owns this file
        // Sort by src path length descending to get the most specific match
        const sortedSubmodules = submodules.sort((a, b) => b.srcPath.length - a.srcPath.length)
        
        for (const submodule of sortedSubmodules) {
          
          if (normalizedPath.startsWith(submodule.srcPath)) {
            return { 
              type: 'submodule' as const, 
              name: submodule.name,
              rootPath: submodule.path,
              srcPath: submodule.srcPath
            }
          }
        }

        return null
      }

      const resolveInternalImport = (importPath: string, context: any): string | null => {
        if (!context) return null
        
        const relativePath = importPath.replace('@/', '')
        const fullPath = path.resolve(context.srcPath, relativePath)
        
        const resolved = resolveFileWithExtensions(fullPath)
        return resolved
      }

      const resolveSubmoduleImport = (submoduleName: string, context: any): string | null => {
        if (!context) return null
        
        // Look for the submodule in the packages directory of the current context
        const localSubmodulePath = path.join(context.rootPath, dir, submoduleName)
        
        if (fs.existsSync(localSubmodulePath)) {
          const srcPath = path.join(localSubmodulePath, 'src')
          if (fs.existsSync(srcPath)) {
            const indexPath = path.join(srcPath, 'index.ts')
            if (fs.existsSync(indexPath)) {
              return indexPath
            }
            // Try index.js if index.ts doesn't exist
            const indexJsPath = path.join(srcPath, 'index.js')
            if (fs.existsSync(indexJsPath)) {
              return indexJsPath
            }
          }
        }

        return null
      }

      build.onResolve({ filter: /^@/ }, (args) => {
        const submodules = discoverAllSubmodules()
        const context = findOwnerContext(args.importer, submodules)

        if (!context) {
          return undefined
        }

        // Handle internal imports (@/...)
        if (args.path.startsWith('@/')) {
          const resolvedPath = resolveInternalImport(args.path, context)
          if (resolvedPath) {
            return { path: resolvedPath }
          } else {
          }
        }

        // Handle submodule imports (@submodule)
        if (args.path.startsWith('@') && !args.path.startsWith('@/')) {
          const submoduleName = args.path.replace('@', '')
          const resolvedPath = resolveSubmoduleImport(submoduleName, context)
          if (resolvedPath) {
            return { path: resolvedPath }
          }
        }

        return undefined
      })
    }
  }
}