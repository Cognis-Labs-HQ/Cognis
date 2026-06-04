import {
  ensureBooleanAcknowledgement,
  requireArgs,
} from './command-utils.ts'
import {
  formatStructured,
  renderModuleMutation,
  renderModulesList,
} from './formatters.ts'
import { apiGet, apiPost } from './http.ts'
import { register } from './registry.ts'

export function registerModuleCommands(): void {
  register(
    'modules:list',
    async ({ apiBaseUrl, getApiToken }) => {
      const payload = (await apiGet(
        apiBaseUrl,
        '/api/v1/modules',
        await getApiToken(),
      )) as { data: Array<{ id: string; version: string; class: string }> }

      const data = payload.data.map((moduleEntry) => ({
        ...moduleEntry,
        status: moduleEntry.class === 'core' ? 'enabled' : 'available',
      }))

      return { data }
    },
    {
      usage: 'cognisctl modules:list',
      description: 'List available modules from the API with status.',
      render: renderModulesList,
    },
  )

  register(
    'modules:import-github',
    async ({ args, apiBaseUrl, getApiToken }) => {
      const [repositoryUrl, versionTag] = args
      requireArgs(
        args,
        ['repositoryUrl', 'versionTag'],
        'cognisctl modules:import-github <repositoryUrl> <versionTag>',
      )

      return apiPost(
        apiBaseUrl,
        '/api/v1/modules/import/github',
        { repositoryUrl, versionTag },
        await getApiToken(),
      )
    },
    {
      usage: 'cognisctl modules:import-github <repositoryUrl> <versionTag>',
      description: 'Import a module release from a GitHub repository tag.',
      render: formatStructured,
    },
  )

  register(
    'modules:enable',
    async ({ args, apiBaseUrl, getApiToken }) => {
      const [moduleId] = args
      requireArgs(args, ['moduleId'], 'cognisctl modules:enable <moduleId>')

      const acknowledge = args.includes('--ack-external-disclaimer')
      const route = `/api/v1/modules/${encodeURIComponent(moduleId)}/enable${acknowledge ? '?acknowledgeExternalDisclaimer=true' : ''}`
      const payload = await apiPost(
        apiBaseUrl,
        route,
        undefined,
        await getApiToken(),
      )

      ensureBooleanAcknowledgement(
        payload,
        'enabled',
        true,
        `Module "${moduleId}" was not enabled`,
      )

      return payload
    },
    {
      usage: 'cognisctl modules:enable <moduleId> [--ack-external-disclaimer]',
      description: 'Enable a module by ID.',
      render: (payload) => renderModuleMutation('Module Enabled', payload),
    },
  )

  register(
    'modules:disable',
    async ({ args, apiBaseUrl, getApiToken }) => {
      const [moduleId] = args
      requireArgs(args, ['moduleId'], 'cognisctl modules:disable <moduleId>')

      const payload = await apiPost(
        apiBaseUrl,
        `/api/v1/modules/${encodeURIComponent(moduleId)}/disable`,
        undefined,
        await getApiToken(),
      )

      ensureBooleanAcknowledgement(
        payload,
        'enabled',
        false,
        `Module "${moduleId}" was not disabled`,
      )

      return payload
    },
    {
      usage: 'cognisctl modules:disable <moduleId>',
      description: 'Disable a module by ID.',
      render: (payload) => renderModuleMutation('Module Disabled', payload),
    },
  )
}
