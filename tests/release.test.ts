import { describe, expect, test } from 'bun:test';
import {
  releaseMetadata,
  validatePackResult,
} from '../scripts/release.js';

const packageJson = {
  name: '@axiom-foundation/orrery',
  version: '0.6.0',
  files: [
    'dist',
    'README.md',
    'LICENSE',
    'THIRD_PARTY_NOTICES',
    'docs',
    'examples/ADAPTERS.md',
    'src/core/types.ts',
    'scripts/receipt_bridge.py',
  ],
  publishConfig: { access: 'public' },
};

const packedFiles = [
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES',
  'package.json',
  'dist/cli.js',
  'dist/core/index.d.ts',
  'dist/core/index.js',
  'dist/react/index.d.ts',
  'dist/react/index.js',
  'dist/react/style.css',
  'src/core/types.ts',
];

describe('release metadata', () => {
  test('accepts an exact stable version tag', () => {
    expect(releaseMetadata(packageJson, 'v0.6.0')).toEqual({
      name: '@axiom-foundation/orrery',
      version: '0.6.0',
      tag: 'v0.6.0',
      npmTag: 'latest',
      prerelease: false,
      assetName: 'axiom-foundation-orrery-0.6.0.tgz',
    });
  });

  test('routes semantic prereleases to the preview distribution tag', () => {
    const prerelease = { ...packageJson, version: '0.7.0-preview.2' };
    expect(releaseMetadata(prerelease, 'v0.7.0-preview.2')).toMatchObject({
      npmTag: 'preview',
      prerelease: true,
      assetName: 'axiom-foundation-orrery-0.7.0-preview.2.tgz',
    });
  });

  test('rejects mismatched tags, build metadata, and private publication', () => {
    expect(() => releaseMetadata(packageJson, 'v0.6.1')).toThrow('must equal');
    expect(() =>
      releaseMetadata({ ...packageJson, version: '0.6.0+local' }, 'v0.6.0+local'),
    ).toThrow('semantic version');
    expect(() =>
      releaseMetadata(
        { ...packageJson, publishConfig: { access: 'restricted' } },
        'v0.6.0',
      ),
    ).toThrow('public');
  });
});

describe('packed release validation', () => {
  test('accepts one exact public package with required distribution files', () => {
    const metadata = releaseMetadata(packageJson, 'v0.6.0');
    const result = validatePackResult(packageJson, metadata, [
      {
        id: '@axiom-foundation/orrery@0.6.0',
        name: '@axiom-foundation/orrery',
        version: '0.6.0',
        filename: metadata.assetName,
        integrity: 'sha512-deadbeef',
        files: packedFiles.map(path => ({ path })),
      },
    ]);
    expect(result.integrity).toBe('sha512-deadbeef');
    expect(result.files).toEqual([...packedFiles].sort());
  });

  test('rejects missing distribution files and paths outside package files', () => {
    const metadata = releaseMetadata(packageJson, 'v0.6.0');
    const packed = {
      id: '@axiom-foundation/orrery@0.6.0',
      name: '@axiom-foundation/orrery',
      version: '0.6.0',
      filename: metadata.assetName,
      integrity: 'sha512-deadbeef',
      files: packedFiles.map(path => ({ path })),
    };

    expect(() =>
      validatePackResult(packageJson, metadata, [
        {
          ...packed,
          files: packed.files.filter(file => file.path !== 'dist/cli.js'),
        },
      ]),
    ).toThrow('dist/cli.js');

    expect(() =>
      validatePackResult(packageJson, metadata, [
        { ...packed, files: [...packed.files, { path: '.env' }] },
      ]),
    ).toThrow('not declared');
  });

  test('rejects multiple packages, wrong identities, and unsafe paths', () => {
    const metadata = releaseMetadata(packageJson, 'v0.6.0');
    expect(() => validatePackResult(packageJson, metadata, [])).toThrow('one');
    expect(() => validatePackResult(packageJson, metadata, [{}, {}])).toThrow(
      'one',
    );

    const base = {
      id: '@axiom-foundation/other@0.6.0',
      name: '@axiom-foundation/other',
      version: '0.6.0',
      filename: metadata.assetName,
      integrity: 'sha512-deadbeef',
      files: packedFiles.map(path => ({ path })),
    };
    expect(() => validatePackResult(packageJson, metadata, [base])).toThrow(
      'identity',
    );
    expect(() =>
      validatePackResult(packageJson, metadata, [
        {
          ...base,
          id: '@axiom-foundation/orrery@0.6.0',
          name: '@axiom-foundation/orrery',
          files: [...base.files, { path: '../secret' }],
        },
      ]),
    ).toThrow('unsafe');
  });
});
