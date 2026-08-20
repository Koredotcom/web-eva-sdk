import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const exportPaths = Object.values(packageJson.exports || {}).flatMap((entry) => [
  entry.import,
  entry.require,
]);

const requiredFiles = [
  packageJson.main,
  packageJson.module,
  packageJson.style,
  ...exportPaths,
].filter(Boolean);

const missingFiles = requiredFiles.filter((file) => !existsSync(new URL(`../${file}`, import.meta.url)));

if (missingFiles.length > 0) {
  console.error('Missing package output files:');
  missingFiles.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

const npmLogDirectory = '/tmp/eva-web-sdk-npm-logs';
const npmCacheDirectory = '/tmp/eva-web-sdk-npm-cache';
await mkdir(npmLogDirectory, { recursive: true });
await mkdir(npmCacheDirectory, { recursive: true });

const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--loglevel=error'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  env: {
    ...process.env,
    npm_config_cache: npmCacheDirectory,
    npm_config_logs_dir: npmLogDirectory,
    npm_config_update_notifier: 'false',
  },
});
const packResult = JSON.parse(packOutput)[0];
const packedFiles = new Set(packResult.files.map(({ path }) => path));

const missingFromPackage = requiredFiles
  .map((file) => file.replace(/^\.\//, ''))
  .filter((file) => !packedFiles.has(file));

if (missingFromPackage.length > 0) {
  console.error('Required files are not included in the npm package:');
  missingFromPackage.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log(`Package verification passed: ${requiredFiles.length} public output files are present and packed.`);
