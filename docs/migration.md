# Moving to Orrery

Orrery by Axiom is the new name for the shared graph explorer. Axiom, Microcosm,
PlanGraph and Thesis retain their names and own their domain models.

The repository is now [TheAxiomFoundation/orrery](https://github.com/TheAxiomFoundation/orrery).
The package name is `@axiom-foundation/orrery`; the primary command is `orrery`.
Install the stable package from npm:

```sh
npm install @axiom-foundation/orrery@0.6.0
npx orrery --input graph.json --output report.html
```

For an offline installation, use the archive attached to the matching
[GitHub release](https://github.com/TheAxiomFoundation/orrery/releases/tag/v0.6.0):

```sh
npm install /path/to/axiom-foundation-orrery-0.6.0.tgz
```

## React

```tsx
import { Orrery } from '@axiom-foundation/orrery/react';
import '@axiom-foundation/orrery/style.css';

<Orrery document={snapshot} />
```

`Orrery` and `OrreryProps` are aliases for `GraphExplorer` and `GraphExplorerProps`.
Existing named exports, host callbacks, canvas controls and export projection
contracts remain supported. Changing package imports is sufficient; no adapter
or data migration is required.

The viewer's visible brand label now reads “Orrery” above the host document
title. The host's document title and domain labels retain their supplied text.

Hosts that need to retain the old import path can point that dependency key at
the new archive explicitly:

```json
{
  "dependencies": {
    "@axiom-foundation/graph-explorer": "npm:@axiom-foundation/orrery@0.6.0"
  }
}
```

The package also retains `graph-explorer` as a CLI alias. An old package name is
not automatically redirected by npm; choose the dependency alias explicitly.

## Persisted contracts

Keep `graph-explorer/v1`, `graph-explorer/receipt-binding/v1` and
`graph-explorer/receipt-assessment/v1` unchanged. Existing snapshots, Receipt
bindings and offline reports remain valid. The embedded `graph-explorer-data`
element remains supported. Historical archives and their digests are immutable.

Version 0.6.0 uses the MIT license. Earlier archives retain their original
license; bundled dependency notices are preserved independently.
