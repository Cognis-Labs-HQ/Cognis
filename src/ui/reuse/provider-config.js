/**
 * Loads per-field configuration metadata for a notification provider.
 *
 * For each config field, returns a descriptor that captures where the value
 * came from (DB vs docker env), the effective value to use in the form, and
 * whether the env and DB values are in conflict — enabling the admin UI to
 * highlight overrides and missing required fields.
 *
 * Public exports:
 *   loadProviderConfig(senderId) — fetch and return a field descriptor map for
 *     the given provider (e.g. 'smtp').
 *
 * Usage:
 *   const descriptors = await loadProviderConfig('smtp');
 *   // descriptors.host.effectiveValue  → value to pre-fill in the form
 *   // descriptors.host.envConflict     → true when env and DB disagree
 *   // descriptors.host.source          → 'db' | 'env' | 'none'
 *
 * @param {string} senderId - The provider identifier (e.g. 'smtp').
 * @returns {Promise<Record<string, ProviderFieldDescriptor>>}
 */

import { apiFetch } from './api-client.js';

/**
 * @typedef {Object} ProviderFieldDescriptor
 * @property {string|undefined} dbValue      - Value stored in the database (undefined if not set).
 * @property {string|undefined} envValue     - Value sourced from docker env (undefined if not set).
 * @property {string|undefined} effectiveValue - DB value when present, else env value, else undefined.
 * @property {'db'|'env'|'none'} source      - Which source supplied the effective value.
 * @property {boolean} envConflict           - True when both sources are set and their values differ.
 */

/**
 * Fetches provider config metadata from the API and returns a descriptor map.
 *
 * @param {string} senderId
 * @returns {Promise<Record<string, ProviderFieldDescriptor>>}
 */
export async function loadProviderConfig(senderId) {
  const res = await apiFetch(`/api/v1/notifications/providers/${encodeURIComponent(senderId)}/config`);
  if (!res.ok) return {};

  const payload = await res.json();
  const dbData = payload.data ?? {};
  const envData = payload.envValues ?? {};

  const fieldNames = new Set([...Object.keys(dbData), ...Object.keys(envData)]);
  const descriptors = {};

  for (const field of fieldNames) {
    const rawDb = dbData[field];
    const rawEnv = envData[field];

    const dbValue = rawDb != null && rawDb !== '' ? String(rawDb) : undefined;
    const envValue = rawEnv != null && rawEnv !== '' ? String(rawEnv) : undefined;

    let effectiveValue;
    let source;

    if (dbValue !== undefined) {
      effectiveValue = dbValue;
      source = 'db';
    } else if (envValue !== undefined) {
      effectiveValue = envValue;
      source = 'env';
    } else {
      effectiveValue = undefined;
      source = 'none';
    }

    const envConflict = dbValue !== undefined && envValue !== undefined && dbValue !== envValue;

    descriptors[field] = { dbValue, envValue, effectiveValue, source, envConflict };
  }

  return descriptors;
}
