import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { GatewayRegistry, CapabilityStore } from '@cognis/core';
import { RouteRegistry } from '../../../api/route-registry.js';
import { UIRegistry } from '../../../api/ui-registry.js';
import { issueAccessToken } from '../../auth/access-tokens.js';
import { bootstrap } from '../bootstrap.js';

function createAuthContext() {
    const token = issueAccessToken('calendar-admin', 'admin', 60);
    return {
        requireAuth(req: { headers?: Record<string, string> }, res: any) {
            const auth = req.headers?.authorization ?? '';
            if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== token) {
                res.writeHead(401, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: { code: 'unauthorized', message: 'Unauthorized' },
                    }),
                );
                return null;
            }
            return { sub: 'calendar-admin', role: 'admin' };
        },
        getCookieSession() {
            return { sub: 'calendar-admin', role: 'admin' };
        },
        setPageSecurityHeaders() {},
    };
}

test('calendar bootstrap registers gateway, routes, and ui hooks', async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const authContext = createAuthContext();
    capabilities.contribute('auth:routeContext', authContext);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), 'src', 'adapters'),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    } as any);

    const gateway = gatewayRegistry.get('calendar');
    assert.ok(gateway);
    assert.equal(gateway?.id, 'calendar');
    assert.equal(gateway?.hasAdapters, true);

    const plugins = uiRegistry.listNavbarPlugins();
    assert.ok(
        plugins.some(
            (plugin) =>
                plugin.scriptUrl === '/static/gateways/calendar/ui/navbar.js',
        ),
    );

    const routes = routeRegistry.getHandlers();
    assert.ok(routes.length > 0);
});
