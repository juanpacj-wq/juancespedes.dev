import { parseSlug } from '../shared/slug';

/*
 * A case study's architecture diagram, written as data instead of drawn as an image. Layers read
 * left to right (sources, processing, storage, consumers); flows connect nodes by id. Being data,
 * the diagram follows the site's theme, is readable by screen readers and is checked like any
 * other content: a flow that points to a missing node fails the build.
 */

export interface ArchitectureNode {
  /** kebab-case, unique within the diagram and identical across locales. */
  readonly id: string;
  readonly label: string;
  readonly detail: string | null;
}

export interface ArchitectureLayer {
  readonly name: string;
  readonly nodes: readonly ArchitectureNode[];
}

export interface ArchitectureFlow {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

export interface Architecture {
  /** One or two sentences that say what the diagram shows. Doubles as its text alternative. */
  readonly summary: string;
  readonly layers: readonly ArchitectureLayer[];
  readonly flows: readonly ArchitectureFlow[];
}

export interface ArchitectureIssue {
  readonly field: string;
  readonly message: string;
}

const MIN_LAYERS = 2;

export const validateArchitecture = (architecture: Architecture): readonly ArchitectureIssue[] => {
  const issues: ArchitectureIssue[] = [];

  if (architecture.layers.length < MIN_LAYERS) {
    issues.push({
      field: 'layers',
      message: `a diagram needs at least ${String(MIN_LAYERS)} layers`,
    });
  }

  const ids = new Set<string>();
  architecture.layers.forEach((layer, layerIndex) => {
    const path = `layers[${String(layerIndex)}]`;
    if (layer.nodes.length === 0) {
      issues.push({ field: `${path}.nodes`, message: 'a layer needs at least one node' });
    }
    layer.nodes.forEach((node, nodeIndex) => {
      const field = `${path}.nodes[${String(nodeIndex)}].id`;
      if (!parseSlug(node.id).ok) {
        issues.push({ field, message: `"${node.id}" is not kebab-case` });
      } else if (ids.has(node.id)) {
        issues.push({ field, message: `duplicate node id "${node.id}"` });
      }
      ids.add(node.id);
    });
  });

  architecture.flows.forEach((flow, index) => {
    const path = `flows[${String(index)}]`;
    for (const end of ['from', 'to'] as const) {
      if (!ids.has(flow[end])) {
        issues.push({ field: `${path}.${end}`, message: `unknown node "${flow[end]}"` });
      }
    }
    if (flow.from === flow.to) {
      issues.push({ field: path, message: 'a flow must connect two different nodes' });
    }
  });

  return issues;
};

/** Looks up node labels for the flow list. Assumes a validated diagram. */
export const nodeLabels = (architecture: Architecture): ReadonlyMap<string, string> =>
  new Map(architecture.layers.flatMap((layer) => layer.nodes.map((n) => [n.id, n.label] as const)));
