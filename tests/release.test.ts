import { describe, expect, test } from 'bun:test';
import {
  changelogReleaseNotes,
  releaseMetadata,
  validateChangelog,
  validatePackResult,
} from '../scripts/release.js';

const STABLE_VERSION = '1.2.3';
const STABLE_TAG = `v${STABLE_VERSION}`;
const STABLE_ASSET = `axiom-foundation-orrery-${STABLE_VERSION}.tgz`;

const packageJson = {
  name: '@axiom-foundation/orrery',
  version: STABLE_VERSION,
  files: [
    'dist',
    'README.md',
    'CHANGELOG.md',
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
  'CHANGELOG.md',
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
    expect(releaseMetadata(packageJson, STABLE_TAG)).toEqual({
      name: '@axiom-foundation/orrery',
      version: STABLE_VERSION,
      tag: STABLE_TAG,
      npmTag: 'latest',
      prerelease: false,
      assetName: STABLE_ASSET,
    });
  });

  test('routes semantic prereleases to the preview distribution tag', () => {
    const prerelease = { ...packageJson, version: '2.0.0-preview.2' };
    expect(releaseMetadata(prerelease, 'v2.0.0-preview.2')).toMatchObject({
      npmTag: 'preview',
      prerelease: true,
      assetName: 'axiom-foundation-orrery-2.0.0-preview.2.tgz',
    });
  });

  test('rejects mismatched tags, build metadata, and private publication', () => {
    expect(() => releaseMetadata(packageJson, 'v1.2.4')).toThrow('must equal');
    expect(() =>
      releaseMetadata({ ...packageJson, version: '1.2.3+local' }, 'v1.2.3+local'),
    ).toThrow('semantic version');
    expect(() =>
      releaseMetadata(
        { ...packageJson, version: '1.2.3-preview.01' },
        'v1.2.3-preview.01',
      ),
    ).toThrow('semantic version');
    expect(() =>
      releaseMetadata(
        { ...packageJson, publishConfig: { access: 'restricted' } },
        STABLE_TAG,
      ),
    ).toThrow('public');
  });
});

describe('packed release validation', () => {
  test('accepts one exact public package with required distribution files', () => {
    const metadata = releaseMetadata(packageJson, STABLE_TAG);
    const result = validatePackResult(packageJson, metadata, [
      {
        id: `@axiom-foundation/orrery@${STABLE_VERSION}`,
        name: '@axiom-foundation/orrery',
        version: STABLE_VERSION,
        filename: metadata.assetName,
        integrity: 'sha512-deadbeef',
        files: packedFiles.map(path => ({ path })),
      },
    ]);
    expect(result.integrity).toBe('sha512-deadbeef');
    expect(result.files).toEqual([...packedFiles].sort());
  });

  test('rejects missing distribution files and paths outside package files', () => {
    const metadata = releaseMetadata(packageJson, STABLE_TAG);
    const packed = {
      id: `@axiom-foundation/orrery@${STABLE_VERSION}`,
      name: '@axiom-foundation/orrery',
      version: STABLE_VERSION,
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
    const metadata = releaseMetadata(packageJson, STABLE_TAG);
    expect(() => validatePackResult(packageJson, metadata, [])).toThrow('one');
    expect(() => validatePackResult(packageJson, metadata, [{}, {}])).toThrow(
      'one',
    );

    const base = {
      id: `@axiom-foundation/other@${STABLE_VERSION}`,
      name: '@axiom-foundation/other',
      version: STABLE_VERSION,
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
          id: `@axiom-foundation/orrery@${STABLE_VERSION}`,
          name: '@axiom-foundation/orrery',
          files: [...base.files, { path: '../secret' }],
        },
      ]),
    ).toThrow('unsafe');
  });
});

describe('compiled changelog validation', () => {
  const changelog = `# Changelog

## [${STABLE_VERSION}] - 2026-10-05

### Added

- Publish Orrery.
`;

  test('accepts a latest release matching the package version', () => {
    expect(() => validateChangelog(STABLE_VERSION, changelog, [])).not.toThrow();
    expect(changelogReleaseNotes(STABLE_VERSION, changelog)).toBe(
      '### Added\n\n- Publish Orrery.\n',
    );
  });

  test('rejects stale releases, missing headings, and pending fragments', () => {
    expect(() => validateChangelog('1.2.4', changelog, [])).toThrow(
      'must equal',
    );
    expect(() => validateChangelog(STABLE_VERSION, '# Changelog\n', [])).toThrow(
      'dated release heading',
    );
    expect(() =>
      validateChangelog(STABLE_VERSION, changelog, ['24.fixed.md']),
    ).toThrow('pending changelog fragments');
    expect(() => changelogReleaseNotes('0.6.1', changelog)).toThrow(
      'cannot find',
    );
  });

  test('extracts only the latest release for GitHub release notes', () => {
    const withHistory = `${changelog}\n## [1.2.2] - 2026-01-01\n\nOld notes.\n`;
    expect(changelogReleaseNotes(STABLE_VERSION, withHistory)).toBe(
      '### Added\n\n- Publish Orrery.\n',
    );
  });
});
