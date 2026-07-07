import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GatewayBootstrapContext } from '../../shared.js';
import type { DbExecutor } from '../../db/reuse/db-executor.js';
import { createGatewayUiRegistryHooks } from '../../reuse/ui-registry-hooks.js';
import { resolveRouteContext, type RouteContext } from '../../../api/reuse/route-context.js';
import { ShareTokenStore } from '../gateway/store.js';
import { CoreShareGateway } from '../gateway/index.js';
import { registerShareBootstrapHooks } from './flow-registrations.js';
import { createShareRoutes } from './routes.js';

const GATEWAY_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor = ctx.capabilities.get<DbExecutor>('db:executor');
    if (!dbExecutor) {
        return;
    }
    const routeContext = resolveRouteContext(
        ctx.capabilities.get<RouteContext>('auth:routeContext'),
    );
    const store = new ShareTokenStore(dbExecutor, ctx.log);
    const gateway = new CoreShareGateway(store);
    await gateway.ensureSchema();

    ctx.capabilities.contribute('share:mintToken', gateway.issueToken.bind(gateway));
    ctx.capabilities.contribute('share:listTokens', gateway.listTokens.bind(gateway));
    ctx.capabilities.contribute('share:deleteToken', gateway.deleteToken.bind(gateway));
    ctx.capabilities.contribute('share:resolveToken', gateway.resolveToken.bind(gateway));

    await registerShareBootstrapHooks({ ctx, gateway });

    ctx.routeRegistry.register(
        createShareRoutes({
            gateway,
            routeContext,
            uiRoot: path.join(GATEWAY_ROOT, 'ui'),
            log: ctx.log,
        }),
        'share',
    );

    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, 'share');
    uiHooks.registerStaticDir('share', GATEWAY_ROOT);

    ctx.routeRegistry.registerPrefix('/api/v1/share', 'share');
    ctx.gatewayRegistry.register({
        id: 'share',
        name: 'Share Gateway',
        version: '1.0.0',
        description: 'Public share token orchestration for Cognis resources.',
        publisher: 'Cognis Labs HQ',
        hasAdapters: false,
    });
}
