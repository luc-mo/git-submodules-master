# Git Submodules Master Project

## Overview
This project demonstrates a modular architecture using Git submodules to simulate a monorepo environment in scenarios where traditional monorepo setups are not feasible, such as enterprise CI/CD pipelines. The structure ensures strict encapsulation of dependencies and modular boundaries, enabling scalable and maintainable development workflows.

## Architecture
The project is organized as follows:

```
master/
├── src/
├── packages/
│   ├── lib/
│   │   ├── src/
│   │   └── packages/
│   │       └── sub-lib/
│   └── sub-lib/
```

### Key Features
- **Git Submodules**: Each folder inside `packages/` is a Git submodule, allowing independent version control and modular development.
- **TypeScript Path Aliases**: Simplified imports using aliases like `@lib` and `@sub-lib`.
- **Custom Build Plugin**: The `submoduleAliasesPlugin` ensures proper resolution of path aliases without relying on `node_modules`.
- **Encapsulation**: Each repository can only access submodules located directly inside its `packages/` folder, enforcing strict modular boundaries.

## Purpose
The primary goal of this project is to:
- Simulate a monorepo environment using Git submodules.
- Enable modular development workflows in environments that cannot handle monorepo architectures.
- Provide a scalable and maintainable codebase for enterprise CI/CD pipelines.

## Installation
1. Clone the main repository including submodules:
   ```bash
   git clone --recurse-submodules <repository-url>
   ```
2. Initialize and update submodules recursively and fetch remote updates:
   ```bash
   git submodule update --init --recursive --remote
   ```
3. Install dependencies for the main repository and submodules:
   ```bash
   npm install
   ```

### Submodules Dependencies
All submodules' `node_modules` must be installed by the master repository. This ensures proper dependency resolution and avoids conflicts across submodules.

## Usage
### Development
- Use TypeScript path aliases for simplified imports:
  ```ts
  import { internalLibFunction, externalLibFunction } from '@lib';
  import { axiosCall } from '@sub-lib';
  import { internalMasterFunction } from '@/function';

  const main = async () => {
    const internalLibCall = internalLibFunction();
    console.log({ internalLibCall });

    const externalLibCall = await externalLibFunction();
    console.log({ externalLibCall });

    const subLibAxiosCall = await axiosCall();
    console.log({ subLibAxiosCall });

    const internalMasterCall = internalMasterFunction();
    console.log({ internalMasterCall });
  };

  main();
  ```

### Build Process
The project uses `tsup` for building TypeScript files. The configuration includes:
- Entry point: `src/index.ts`
- Format: ESM
- Plugins: `submoduleAliasesPlugin` for alias resolution

### Git Submodules
- Each submodule is independently version-controlled.
- Submodules must be updated recursively using:
  ```bash
  git submodule update --init --recursive
  ```

## Constraints
- Each repository can only import what is explicitly exposed by its direct submodules.
- No deep or transitive submodule imports are allowed.

## License
This project is licensed under the MIT License.

## Submodule Repositories
- [lib repository](https://github.com/luc-mo/git-submodules-lib)
- [sub-lib repository](https://github.com/luc-mo/git-submodules-sub-lib)
