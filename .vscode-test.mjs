import { defineConfig } from '@vscode/test-cli';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Use a short user-data-dir in the OS temp folder to avoid exceeding the
// 103-character Unix domain socket path limit on macOS, which otherwise causes
// "IPC handle ... is longer than 103 chars" / EINVAL errors in CI.
const userDataDir = mkdtempSync(join(tmpdir(), 'vsct-'));

export default defineConfig({
  version: 'stable',
  files: './out/test/extension.test.js',
  extensionDevelopmentPath: '.',
  extensionTestsPath: './out/test/extension.test.js',
  launchArgs: ['--user-data-dir', userDataDir],
});
