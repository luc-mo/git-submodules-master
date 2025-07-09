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
      const srcDir = path.resolve('./src')
      const submodulesDir = path.resolve('./', dir)

      // Función para encontrar todos los submodulos recursivamente
      const findAllSubmodules = (): Map<string, string> => {
        const submoduleMap = new Map<string, string>()
        
        const searchInDirectory = (baseDir: string) => {
          const packagesPath = path.join(baseDir, 'packages')
          
          if (fs.existsSync(packagesPath)) {
            try {
              const entries = fs.readdirSync(packagesPath, { withFileTypes: true })
              
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const submodulePath = path.join(packagesPath, entry.name)
                  const srcPath = path.join(submodulePath, 'src')
                  
                  // Verificar si tiene un src válido
                  if (fs.existsSync(srcPath)) {
                    submoduleMap.set(entry.name, submodulePath)
                    // Buscar recursivamente en este submodulo
                    searchInDirectory(submodulePath)
                  }
                }
              }
            } catch (error) {
              console.warn(`Error reading packages directory: ${packagesPath}`, error)
            }
          }
        }

        // Empezar desde el directorio principal
        searchInDirectory(path.resolve('./'))
        
        return submoduleMap
      }

      // Función para resolver archivos con diferentes extensiones
      const resolveFile = (basePath: string): string | null => {
        // Primero intentar exactamente como está
        if (fs.existsSync(basePath)) {
          const stat = fs.statSync(basePath)
          if (stat.isFile()) {
            return basePath
          }
          // Si es directorio, buscar index.ts
          const indexPath = path.join(basePath, 'index.ts')
          if (fs.existsSync(indexPath)) {
            return indexPath
          }
        }

        // Intentar con extensión .ts
        if (!basePath.endsWith('.ts')) {
          const tsPath = basePath + '.ts'
          if (fs.existsSync(tsPath)) {
            return tsPath
          }
        }

        // Intentar con extensión .js
        if (!basePath.endsWith('.js')) {
          const jsPath = basePath + '.js'
          if (fs.existsSync(jsPath)) {
            return jsPath
          }
        }

        // Intentar como directorio con index.ts
        const indexTsPath = path.join(basePath, 'index.ts')
        if (fs.existsSync(indexTsPath)) {
          return indexTsPath
        }

        // Intentar como directorio con index.js
        const indexJsPath = path.join(basePath, 'index.js')
        if (fs.existsSync(indexJsPath)) {
          return indexJsPath
        }

        return null
      }

      // Función para determinar el contexto del archivo más específico
      const getFileContext = (filePath: string, allSubmodules: Map<string, string>): { type: 'master' | 'submodule', submodulePath?: string, submoduleName?: string } => {
        // Si está en src principal, es master
        if (filePath.startsWith(srcDir)) {
          return { type: 'master' }
        }

        // Buscar el submodulo más específico (más profundo en la jerarquía)
        let longestMatch = ''
        let matchedSubmodule = null
        let matchedPath = null

        for (const [submoduleName, submodulePath] of allSubmodules) {
          const submoduleSrcPath = path.join(submodulePath, 'src')
          if (filePath.startsWith(submoduleSrcPath) && submoduleSrcPath.length > longestMatch.length) {
            longestMatch = submoduleSrcPath
            matchedSubmodule = submoduleName
            matchedPath = submodulePath
          }
        }

        if (matchedSubmodule && matchedPath) {
          return { 
            type: 'submodule', 
            submodulePath: matchedPath, 
            submoduleName: matchedSubmodule 
          }
        }

        return { type: 'master' }
      }

      // Función para buscar un submodulo recursivamente desde un contexto específico
      const findSubmoduleRecursively = (submoduleName: string, fromPath: string, allSubmodules: Map<string, string>): string | null => {
        // Buscar en packages del directorio actual
        const localPackagesPath = path.join(fromPath, 'packages', submoduleName)
        if (fs.existsSync(localPackagesPath)) {
          const indexPath = path.join(localPackagesPath, 'src', 'index.ts')
          if (fs.existsSync(indexPath)) {
            return indexPath
          }
        }

        // Buscar en el mapa global
        const globalSubmodulePath = allSubmodules.get(submoduleName)
        if (globalSubmodulePath) {
          const indexPath = path.join(globalSubmodulePath, 'src', 'index.ts')
          if (fs.existsSync(indexPath)) {
            return indexPath
          }
        }

        return null
      }

      build.onResolve({ filter: /^@/ }, (args) => {
        console.log('\n=== RESOLVING ===')
        console.log('Path:', args.path)
        console.log('From:', args.importer)
        
        const allSubmodules = findAllSubmodules()
        console.log('All submodules found:', Array.from(allSubmodules.keys()))
        
        const context = getFileContext(args.importer, allSubmodules)
        console.log('File context:', context)

        // Caso 1: Importación interna (@/)
        if (args.path.startsWith('@/')) {
          const relativePath = args.path.replace('@/', '')
          console.log('Processing internal import:', relativePath)
          
          let resolvedPath: string | null = null

          if (context.type === 'master') {
            // Buscar en src principal
            const fullPath = path.resolve(srcDir, relativePath)
            console.log('Trying master src path:', fullPath)
            resolvedPath = resolveFile(fullPath)
          } else if (context.type === 'submodule' && context.submodulePath) {
            // Buscar en src del submodulo
            const submoduleSrcPath = path.join(context.submodulePath, 'src')
            const fullPath = path.resolve(submoduleSrcPath, relativePath)
            console.log('Trying submodule src path:', fullPath)
            resolvedPath = resolveFile(fullPath)
          }

          if (resolvedPath) {
            console.log('✅ Resolved internal import:', args.path, '->', resolvedPath)
            return { path: resolvedPath }
          } else {
            console.log('❌ Failed to resolve internal import:', args.path)
          }
        }

        // Caso 2: Importación de submodulo (@submodule)
        if (args.path.startsWith('@') && !args.path.startsWith('@/')) {
          const submoduleName = args.path.replace('@', '')
          console.log('Processing submodule import:', submoduleName)
          
          let resolvedPath: string | null = null

          if (context.type === 'master') {
            // Buscar desde el directorio principal
            resolvedPath = findSubmoduleRecursively(submoduleName, path.resolve('./'), allSubmodules)
          } else if (context.type === 'submodule' && context.submodulePath) {
            // Buscar recursivamente desde el submodulo actual
            resolvedPath = findSubmoduleRecursively(submoduleName, context.submodulePath, allSubmodules)
          }

          if (resolvedPath) {
            console.log('✅ Resolved submodule import:', args.path, '->', resolvedPath)
            return { path: resolvedPath }
          } else {
            console.log('❌ Failed to resolve submodule import:', args.path)
          }
        }

        console.log('❌ Could not resolve:', args.path)
        console.log('=== END RESOLVING ===\n')
        return undefined
      })
    }
  }
}