/**
 * Link Share adapter-owned popup for listing, creating, and revoking share links.
 *
 * Renders a modal dialog that displays a list of existing share links and a
 * form for generating new ones. All API calls are supplied by the caller via
 * async callback functions so this module stays provider-agnostic. It lives
 * under the Link Share adapter's own UI directory (not a generic
 * `src/ui/reuse` helper) so that disabling the Link Share adapter means this
 * static asset is never served, the dynamic import fails, and no share popup
 * or link-creation logic is ever created in the first place.
 *
 * Public exports:
 *   openShareLinksPopup(options) — opens the popup and returns a Promise that
 *     resolves when the user dismisses it.
 *
 * Usage:
 *   import { openShareLinksPopup } from
 *     '/static/adapters/share/link/ui/share-links-popup/index.js';
 *
 *   await openShareLinksPopup({
 *     title: 'Share Meeting',
 *     labels: {
 *       empty: 'No share links yet.',
 *       untitled: 'Untitled',
 *       copyLink: 'Copy Link',
 *       revoke: 'Revoke',
 *       shareOptions: 'Share:',
 *       mail: 'Mail',
 *       label: 'Label',
 *       labelPlaceholder: 'Enter a label…',
 *       expiryLabel: 'Expires in (hours)',
 *       generateLink: 'Generate Link',
 *       done: 'Done',
 *       createFailed: 'Failed to create link.',
 *       copySuccess: 'Link copied!',
 *       copyFailed: 'Failed to copy link.',
 *       deleteFailed: 'Failed to revoke link.',
 *       statusActive: 'Active',
 *       statusExpired: 'Expired',
 *       expiresAtLabel: 'Expires',
 *       expiredAtLabel: 'Expired',
 *     },
 *     fetchLinks: async () => [{ id, label, shareUrl, status, expiresAt, quickShareActions: [] }],
 *     createLink: async ({ label, expiresInHours }) => ({ shareUrl }),
 *     deleteLink: async ({ shareId }) => {},
 *   });
 *
 * @param {{
 *   title: string,
 *   labels: {
 *     empty: string,
 *     untitled: string,
 *     copyLink: string,
 *     revoke: string,
 *     shareOptions: string,
 *     mail: string,
 *     label: string,
 *     labelPlaceholder: string,
 *     expiryLabel: string,
 *     generateLink: string,
 *     done: string,
 *     createFailed: string,
 *     copySuccess: string,
 *     copyFailed: string,
 *     deleteFailed: string,
 *     deleteConfirmTitle?: string,
 *     deleteConfirmMessage?: string,
 *     confirm?: string,
 *     cancel?: string,
 *     statusActive: string,
 *     statusExpired: string,
 *     expiresAtLabel: string,
 *     expiredAtLabel: string,
 *     users?: string,
 *     userSearchPlaceholder?: string,
 *     removeUser?: string,
 *     readPermission?: string,
 *     writePermission?: string,
 *     methods?: string,
 *     linkMethod?: string,
 *     userMethod?: string,
 *     shareWithUsers?: string,
 *   },
 *   fetchLinks: () => Promise<Array<{
 *     id: string,
 *     label: string,
 *     shareUrl: string,
 *     status?: 'active' | 'expired',
 *     expiresAt?: string,
 *     quickShareActions?: Array<{ id: string, label: string, href: string }>,
 *   }>>,
 *   createLink: (opts: { label: string, expiresInHours: string }) => Promise<{
 *     shareUrl?: string,
 *     quickShareActions?: Array<{ id: string, label: string, href: string }>,
 *   } | null>,
 *   deleteLink: (opts: { shareId: string }) => Promise<void>,
 *   updateLink?: (opts: { shareId: string, accessControls: object }) => Promise<object|null>,
 *   searchUsers?: (query: string) => Promise<Array<{id: string, label: string, handle?: string}>>,
 *   fetchMethods?: () => Promise<Array<{id: string, name: string, pageModuleUrl?: string}>>,
 * }} options
 * @returns {Promise<void>}
 */
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { buildShareTokenCallbacks } from "/static/gateways/share/ui/reuse/share-api.js";
import { openShareLinksPopup } from "./implementation.js";

export { openShareLinksPopup };

export function openSharePopup({
    resourceType,
    resourceId,
    contentUrl,
    grantedCapabilities = [],
    passwordRequired = false,
    ...popupOptions
}) {
    return openShareLinksPopup({
        ...popupOptions,
        passwordRequired,
        defaultGrantedCapabilities: grantedCapabilities,
        ...buildShareTokenCallbacks({
            resourceType,
            resourceId,
            contentUrl,
            grantedCapabilities,
        }),
    });
}

uiCtx.capabilities.contribute("share:openPopup", openSharePopup);
uiCtx.capabilities.contribute("share:openLinksPopup", openShareLinksPopup);
