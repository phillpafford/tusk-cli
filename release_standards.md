# Release Standards Checklist

## 1. Package Configuration (package.json)
- [ ] **Descriptive Metadata:** `name`, `description`, `keywords`, `author`, and `repository` fields are present and accurate.
- [ ] **License:** A valid SPDX `license` field is present.
- [ ] **Engines:** `engines` field explicitly specifies supported Node.js versions (e.g., `>=18.0.0`).
- [ ] **Scripts:**
    - `prepublishOnly`: Must exist to run build/test steps before publishing.
    - `test`: Must exist and pass.
- [ ] **Dependencies:**
    - `devDependencies` are strictly for build/test tools.
    - `peerDependencies` are used if this package is a plugin (e.g., for React or NestJS).

## 2. Entry Points & Exports
- [ ] **Main Entry:** `main` points to a valid file (e.g., `dist/index.js`).
- [ ] **Types:** `types` (or `typings`) points to valid declaration files (`.d.ts`).
- [ ] **Modern Exports:** The `exports` field is defined for granular control and conditional imports (ESM/CJS support).

## 3. Bundle Integrity (What gets published)
- [ ] **Allowlist Strategy:** A `files` array is present in package.json (Preferred over `.npmignore`).
- [ ] **No Secrets:** No `.env`, `.github`, `src/` (if compiling), or `tsconfig.json` files included in the tarball.
- [ ] **Size Check:** No large assets (images/videos) included unless necessary.

## 4. Code Quality & CI
- [ ] **Clean Console:** No `console.log` statements in production code.
- [ ] **Type Check:** TypeScript builds with `declaration: true` and no errors.
- [ ] **Lockfile:** `package-lock.json` (or `yarn.lock`/`pnpm-lock.yaml`) is committed to git.
