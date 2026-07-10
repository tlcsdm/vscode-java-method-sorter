/**
 * Post-install script: copy the TypeScript 6 shim (installed as "typescript-compat")
 * into the nested node_modules locations that typescript-eslint and ts-api-utils
 * resolve `require('typescript')` from.
 *
 * This is needed because typescript-eslint@8.x declares a peer dependency on
 * TypeScript <6.1.0 and uses the TypeScript 6 programmatic API (ts.Extension,
 * ts.TypeFlags, etc.) which was removed in TypeScript 7.  The root project
 * intentionally keeps TypeScript 7 for compilation while providing TypeScript 6
 * only to the ESLint tooling via nested node_modules.
 *
 * The TypeScript 6 version used here is controlled by the "typescript-compat"
 * devDependency alias and the "overrides" entries in package.json.
 * All three must be kept in sync when upgrading the shim version.
 *
 * If new packages that peer-depend on TypeScript <7 are added to the ESLint
 * toolchain, add their nested typescript path to the `destinations` array below.
 *
 * Can be removed once typescript-eslint releases a version that supports TypeScript 7.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'typescript-compat');

// Packages that resolve `require('typescript')` from these paths must use
// TypeScript 6.x because typescript-eslint@8.x relies on the TypeScript 6
// programmatic API which was removed in TypeScript 7.
const destinations = [
  // typescript-eslint bundles its sub-packages under its own node_modules;
  // they all resolve 'typescript' from this shared parent location.
  path.join(root, 'node_modules', 'typescript-eslint', 'node_modules', 'typescript'),
  // ts-api-utils is installed at the root level but also uses the TypeScript API.
  path.join(root, 'node_modules', 'ts-api-utils', 'node_modules', 'typescript'),
];

if (!fs.existsSync(src)) {
  console.error('[postinstall] ERROR: typescript-compat not found. ESLint will not work correctly.');
  console.error('[postinstall] Run "npm install" to ensure all devDependencies are installed.');
  process.exit(1);
}

for (const dest of destinations) {
  const parentDir = path.dirname(dest);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true });
}

console.log('[postinstall] TypeScript 6 shim installed for typescript-eslint and ts-api-utils.');
