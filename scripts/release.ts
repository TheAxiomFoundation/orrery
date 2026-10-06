import { readdir, readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = '@axiom-foundation/orrery';
const REQUIRED_FILES = [
  'LICENSE',
  'README.md',
  'CHANGELOG.md',
  'THIRD_PARTY_NOTICES',
  'package.json',
  'dist/cli.js',
  'dist/core/index.d.ts',
  'dist/core/index.js',
  'dist/react/index.d.ts',
  'dist/react/index.js',
  'dist/react/style.css',
] as const;
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const CHANGELOG_HEADING = /^## \[([^\]]+)] - (\d{4}-\d{2}-\d{2})$/m;

export interface ReleaseMetadata {
  name: string;
  version: string;
  tag: string;
  npmTag: 'latest' | 'preview';
  prerelease: boolean;
  assetName: string;
}

export interface ValidatedPackResult {
  integrity: string;
  files: string[];
}

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be nonempty text`);
  }
  return value;
}

function packageFileEntries(packageJson: JsonObject): string[] {
  const files = packageJson.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('package.json files must be a nonempty array');
  }
  return files.map((value, index) => text(value, `package.json files[${index}]`));
}

export function validateChangelog(
  version: string,
  changelog: string,
  fragmentPaths: string[],
): void {
  const heading = CHANGELOG_HEADING.exec(changelog);
  if (heading === null) {
    throw new Error('CHANGELOG.md must contain a dated release heading');
  }
  if (heading[1] !== version) {
    throw new Error(
      `latest CHANGELOG.md release ${heading[1]} must equal package version ${version}`,
    );
  }
  if (fragmentPaths.length !== 0) {
    throw new Error(
      `release cannot contain pending changelog fragments: ${[...fragmentPaths].sort().join(', ')}`,
    );
  }
}

export function changelogReleaseNotes(
  version: string,
  changelog: string,
): string {
  const heading = CHANGELOG_HEADING.exec(changelog);
  if (heading === null || heading[1] !== version) {
    throw new Error(`cannot find latest changelog release ${version}`);
  }
  const bodyStart = heading.index + heading[0].length;
  const nextHeading = /^## \[/gm;
  nextHeading.lastIndex = bodyStart;
  const next = nextHeading.exec(changelog);
  const notes = changelog.slice(bodyStart, next?.index).trim();
  if (notes.length === 0) {
    throw new Error(`changelog release ${version} has no notes`);
  }
  return `${notes}\n`;
}

function assetName(name: string, version: string): string {
  return `${name.replace(/^@/, '').replaceAll('/', '-')}-${version}.tgz`;
}

export function releaseMetadata(
  packageValue: unknown,
  tag: string,
): ReleaseMetadata {
  const packageJson = object(packageValue, 'package.json');
  const name = text(packageJson.name, 'package.json name');
  const version = text(packageJson.version, 'package.json version');
  if (name !== PACKAGE_NAME) {
    throw new Error(`package name must be ${PACKAGE_NAME}`);
  }
  const match = SEMVER.exec(version);
  if (match === null) {
    throw new Error(`package version ${version} must be a semantic version`);
  }
  if (
    match[4]
      ?.split('.')
      .some(
        identifier =>
          /^\d+$/.test(identifier) &&
          identifier.length > 1 &&
          identifier.startsWith('0'),
      )
  ) {
    throw new Error(`package version ${version} must be a semantic version`);
  }
  const expectedTag = `v${version}`;
  if (tag !== expectedTag) {
    throw new Error(`release tag ${tag} must equal ${expectedTag}`);
  }
  const publishConfig = object(
    packageJson.publishConfig,
    'package.json publishConfig',
  );
  if (publishConfig.access !== 'public') {
    throw new Error('package publication must be public');
  }
  packageFileEntries(packageJson);
  const prerelease = match[4] !== undefined;
  return {
    name,
    version,
    tag,
    npmTag: prerelease ? 'preview' : 'latest',
    prerelease,
    assetName: assetName(name, version),
  };
}

function validatePath(path: string): void {
  const segments = path.split('/');
  if (
    path.startsWith('/') ||
    path.includes('\\') ||
    posix.normalize(path) !== path ||
    segments.some(segment => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`packed file path ${JSON.stringify(path)} is unsafe`);
  }
}

function declaredPath(path: string, declared: string[]): boolean {
  if (path === 'package.json') return true;
  return declared.some(entry => path === entry || path.startsWith(`${entry}/`));
}

export function validatePackResult(
  packageValue: unknown,
  metadata: ReleaseMetadata,
  packValue: unknown,
): ValidatedPackResult {
  const packageJson = object(packageValue, 'package.json');
  if (!Array.isArray(packValue) || packValue.length !== 1) {
    throw new Error('npm pack must produce exactly one package');
  }
  const packed = object(packValue[0], 'npm pack result');
  const identity = `${metadata.name}@${metadata.version}`;
  if (
    packed.id !== identity ||
    packed.name !== metadata.name ||
    packed.version !== metadata.version ||
    packed.filename !== metadata.assetName
  ) {
    throw new Error(`packed package identity must be ${identity}`);
  }
  const integrity = text(packed.integrity, 'packed package integrity');
  if (!/^sha512-[A-Za-z0-9+/=]+$/.test(integrity)) {
    throw new Error('packed package integrity must be an sha512 value');
  }
  if (!Array.isArray(packed.files)) {
    throw new Error('packed package files must be an array');
  }
  const declared = packageFileEntries(packageJson);
  const files = packed.files.map((value, index) => {
    const path = text(object(value, `packed file ${index}`).path, 'packed file path');
    validatePath(path);
    if (!declaredPath(path, declared)) {
      throw new Error(`packed file ${path} is not declared by package.json`);
    }
    return path;
  });
  if (new Set(files).size !== files.length) {
    throw new Error('packed package contains duplicate file paths');
  }
  const fileSet = new Set(files);
  for (const required of REQUIRED_FILES) {
    if (!fileSet.has(required)) {
      throw new Error(`packed package is missing ${required}`);
    }
  }
  return { integrity, files: [...files].sort() };
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

async function readJson(path: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON`, { cause: error });
  }
}

async function changelogFragments(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(`cannot read changelog fragment directory ${directory}`, {
      cause: error,
    });
  }
  return entries
    .filter(entry => entry.isFile() && entry.name !== '.gitkeep')
    .map(entry => entry.name)
    .sort();
}

async function main(args: string[]): Promise<void> {
  const command = args[0];
  const root = fileURLToPath(new URL('../', import.meta.url));
  const packagePath = option(args, '--package') ?? `${root}package.json`;
  const packageJson = await readJson(packagePath, 'package.json');
  const fragmentDirectory =
    option(args, '--fragments') ?? `${root}changelog.d`;
  if (command === 'current') {
    const packageObject = object(packageJson, 'package.json');
    const version = text(packageObject.version, 'package.json version');
    process.stdout.write(
      `${JSON.stringify(releaseMetadata(packageJson, `v${version}`))}\n`,
    );
    return;
  }
  const tag = option(args, '--tag');
  if (tag === undefined) throw new Error('--tag is required');
  const metadata = releaseMetadata(packageJson, tag);
  if (command === 'metadata') {
    process.stdout.write(`${JSON.stringify(metadata)}\n`);
    return;
  }
  if (command === 'validate-changelog' || command === 'notes') {
    const changelogPath = option(args, '--changelog') ?? `${root}CHANGELOG.md`;
    const changelog = await readFile(changelogPath, 'utf8');
    validateChangelog(
      metadata.version,
      changelog,
      await changelogFragments(fragmentDirectory),
    );
    if (command === 'notes') {
      process.stdout.write(changelogReleaseNotes(metadata.version, changelog));
      return;
    }
    process.stdout.write(`${JSON.stringify(metadata)}\n`);
    return;
  }
  if (command === 'validate-pack') {
    const packPath = option(args, '--pack-json');
    if (packPath === undefined) throw new Error('--pack-json is required');
    const packed = await readJson(packPath, 'npm pack output');
    process.stdout.write(
      `${JSON.stringify(validatePackResult(packageJson, metadata, packed))}\n`,
    );
    return;
  }
  throw new Error(
    'command must be current, metadata, notes, validate-changelog, or validate-pack',
  );
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
