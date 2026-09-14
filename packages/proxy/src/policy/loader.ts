import fs from 'fs';
import yaml from 'yaml';
import { PolicySchema, PolicyConfig } from './schema';
import { logger } from '../observability/logger';

export function loadPolicy(filepath: string): PolicyConfig {
  try {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Policy file not found: ${filepath}`);
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const parsed = yaml.parse(content);
    return PolicySchema.parse(parsed);
  } catch (err: any) {
    logger.error(`Failed to load policy: ${err.message || String(err)}`);
    process.exit(1);
  }
}
