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
 * Can be removed once typescript-eslint releases a version that supports TypeScript 7.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'typescript-compat');

const destinations = [
  path.join(root, 'node_modules', 'typescript-eslint', 'node_modules', 'typescript'),
  path.join(root, 'node_modules', 'ts-api-utils', 'node_modules', 'typescript'),
];

if (!fs.existsSync(src)) {
  console.warn('[postinstall] typescript-compat not found – skipping TypeScript 6 shim setup.');
  process.exit(0);
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
