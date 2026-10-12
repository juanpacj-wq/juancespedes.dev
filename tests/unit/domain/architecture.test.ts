import { describe, expect, it } from 'vitest';

import { nodeLabels, validateArchitecture } from '../../../src/domain/project/architecture';
import { architecture } from '../../support/project-builders';

const node = (id: string, label = id) => ({ id, label, detail: null });

describe('validateArchitecture', () => {
  it('accepts a well-formed diagram', () => {
    expect(validateArchitecture(architecture())).toEqual([]);
  });

  it('needs at least two layers, none of them empty', () => {
    expect(
      validateArchitecture(architecture({ layers: [{ name: 'Only', nodes: [] }], flows: [] })),
    ).toEqual([
      { field: 'layers', message: 'a diagram needs at least 2 layers' },
      { field: 'layers[0].nodes', message: 'a layer needs at least one node' },
    ]);
  });

  it('requires kebab-case ids that are unique across layers', () => {
    const issues = validateArchitecture(
      architecture({
        layers: [
          { name: 'A', nodes: [node('api'), node('Bad Id')] },
          { name: 'B', nodes: [node('api')] },
        ],
        flows: [],
      }),
    );
    expect(issues).toEqual([
      { field: 'layers[0].nodes[1].id', message: '"Bad Id" is not kebab-case' },
      { field: 'layers[1].nodes[0].id', message: 'duplicate node id "api"' },
    ]);
  });

  it('rejects flows to unknown nodes and loops', () => {
    const issues = validateArchitecture(
      architecture({
        flows: [
          { from: 'browser', to: 'ghost', label: 'x' },
          { from: 'api', to: 'api', label: 'loop' },
        ],
      }),
    );
    expect(issues).toEqual([
      { field: 'flows[0].to', message: 'unknown node "ghost"' },
      { field: 'flows[1]', message: 'a flow must connect two different nodes' },
    ]);
  });
});

describe('nodeLabels', () => {
  it('maps every node id to its label', () => {
    expect([...nodeLabels(architecture()).entries()]).toEqual([
      ['browser', 'Browser'],
      ['api', 'API'],
    ]);
  });
});
