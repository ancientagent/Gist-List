import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PolicyConfig } from './types.js';

export function loadPolicy(): PolicyConfig {
  const policyPath = resolve(process.cwd(), 'policy.json');
  const contents = readFileSync(policyPath, 'utf-8');
  const parsed = JSON.parse(contents) as PolicyConfig;
  if (!Array.isArray(parsed.allowDomains) || parsed.allowDomains.length === 0) {
    throw new Error('policy.json must include allowDomains');
  }
  return parsed;
}
