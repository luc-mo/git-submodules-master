import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'esbuild'

interface IPluginOptions {
  name?: string
  dir?: string
}

export const submoduleAliasesPlugin = ({
  name = 'submodule-aliases',
  dir = 'packages'
}: IPluginOptions = {}): Plugin => {
  return {
    name,
    setup: (build) => {
      const srcDir = path.resolve('./src')
      const discoverAllSubmodules = (): Map<string, string> => {
        const submoduleRegistry = new Map<string, string>()
        
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
                  submoduleRegistry.set(entry.name, submodulePath)
                  exploreDirectory(submodulePath)
                }
              })
          } catch (error) {
            console.warn(`Error reading packages directory: ${packagesPath}`, error)
          }
        }

        exploreDirectory(path.resolve('./'))
        return submoduleRegistry
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

      const getFileContext = (filePath: string, submoduleRegistry: Map<string, string>) => {
        if (filePath.startsWith(srcDir)) {
          return { type: 'master' as const }
        }

        let bestMatch = { length: 0, name: '', path: '' }

        for (const [submoduleName, submodulePath] of submoduleRegistry) {
          const submoduleSrcPath = path.join(submodulePath, 'src')
          
          if (filePath.startsWith(submoduleSrcPath) && submoduleSrcPath.length > bestMatch.length) {
            bestMatch = { length: submoduleSrcPath.length, name: submoduleName, path: submodulePath }
          }
        }

        return bestMatch.name
          ? { type: 'submodule' as const, submodulePath: bestMatch.path, submoduleName: bestMatch.name }
          : { type: 'master' as const }
      }

      const resolveInternalImport = (importPath: string, contextPath: string): string | null => {
        const relativePath = importPath.replace('@/', '')
        const srcPath = path.join(contextPath, 'src')
        const fullPath = path.resolve(srcPath, relativePath)
        
        return resolveFileWithExtensions(fullPath)
      }

      const resolveSubmoduleImport = (submoduleName: string, fromPath: string, submoduleRegistry: Map<string, string>): string | null => {
        // Priority 1: Local packages directory
        const localSubmodulePath = path.join(fromPath, dir, submoduleName)
        if (fs.existsSync(localSubmodulePath)) {
          const indexPath = path.join(localSubmodulePath, 'src', 'index.ts')
          if (fs.existsSync(indexPath)) {
            return indexPath
          }
        }

        // Priority 2: Global submodule registry
        const globalSubmodulePath = submoduleRegistry.get(submoduleName)
        if (globalSubmodulePath) {
          const indexPath = path.join(globalSubmodulePath, 'src', 'index.ts')
          if (fs.existsSync(indexPath)) {
            return indexPath
          }
        }

        return null
      }

      build.onResolve({ filter: /^@/ }, (args) => {
        const submoduleRegistry = discoverAllSubmodules()
        const fileContext = getFileContext(args.importer, submoduleRegistry)

        // Handle internal imports (@/...)
        if (args.path.startsWith('@/')) {
          const contextPath = fileContext.type === 'master' 
            ? path.resolve('./') 
            : fileContext.submodulePath!
          
          const resolvedPath = resolveInternalImport(args.path, contextPath)
          if (resolvedPath) {
            return { path: resolvedPath }
          }
        }

        // Handle submodule imports (@submodule)
        if (args.path.startsWith('@') && !args.path.startsWith('@/')) {
          const submoduleName = args.path.replace('@', '')
          const fromPath = fileContext.type === 'master' 
            ? path.resolve('./') 
            : fileContext.submodulePath!
          
          const resolvedPath = resolveSubmoduleImport(submoduleName, fromPath, submoduleRegistry)
          if (resolvedPath) {
            return { path: resolvedPath }
          }
        }

        return undefined
      })
    }
  }
}