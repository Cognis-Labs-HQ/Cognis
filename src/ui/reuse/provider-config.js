/**
 * Loads per-field configuration metadata for a notification provider.
 *
 * For each config field, returns a descriptor that captures where the value
 * came from (DB vs docker env), the effective value to use in the form, and
 * whether the env and DB values are in conflict — enabling the admin UI to
 * highlight overrides and missing required fields.
 *
 * Public exports:
 *   loadProviderConfig(senderId) — fetch and return a field descriptor map and
 *     required fields list for the given provider (e.g. 'smtp').
 *
 * Usage:
 *   const { descriptors, requiredFields } = await loadProviderConfig('smtp');
 *   // descriptors.host.effectiveValue  → value to pre-fill in the form
 *   // descriptors.host.envConflict     → true when env and DB disagree
 *   // descriptors.host.source          → 'db' | 'env' | 'none'
 *   // descriptors.host.required        → true when this field must be filled
 *   // requiredFields                   → ['host', 'from']
 *
 * @param {string} senderId - The provider identifier (e.g. 'smtp').
 * @returns {Promise<{ descriptors: Record<string, ProviderFieldDescriptor>, requiredFields: string[] }>}
 */

import { apiFetch } from './api-client.js';

/**
 * @typedef {Object} ProviderFieldDescriptor
 * @property {string|undefined} dbValue        - Value stored in the database (undefined if not set).
 * @property {string|undefined} envValue       - Value sourced from docker env (undefined if not set).
 * @property {string|undefined} effectiveValue - DB value when present, else env value, else undefined.
 * @property {'db'|'env'|'none'} source        - Which source supplied the effective value.
 * @property {boolean} envConflict             - True when both sources are set and their values differ.
 * @property {boolean} required                - True when this field must be filled for the provider to be active.
 */

/**
 * Fetches provider config metadata from the API and returns a descriptor map
 * alongside the list of required field names.
 *
 * @param {string} senderId
 * @returns {Promise<{ descriptors: Record<string, ProviderFieldDescriptor>, requiredFields: string[] }>}
 */
export async function loadProviderConfig(senderId) {
  const res = await apiFetch(`/api/v1/notifications/providers/${encodeURIComponent(senderId)}/config`);
  if (!res.ok) return { descriptors: {}, requiredFields: [] };

  const payload = await res.json();
  const dbData = payload.data ?? {};
  const envData = payload.envValues ?? {};
  const requiredFields = Array.isArray(payload.requiredFields) ? payload.requiredFields : [];

  const fieldNames = new Set([...Object.keys(dbData), ...Object.keys(envData), ...requiredFields]);
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
    const required = requiredFields.includes(field);

    descriptors[field] = { dbValue, envValue, effectiveValue, source, envConflict, required };
  }

  return { descriptors, requiredFields };
}
