import assert from "node:assert/strict";
import test from "node:test";
import net from "node:net";
import { setImmediate } from "node:timers/promises";
import { openSession, upgradeToTls, SMTP_TIMEOUT_MS } from "../smtp-session.js";

for (const transport of ["tls", "starttls"] as const) {
    test(`${transport} handshake deadlines close an unresponsive connection`, async (t) => {
        const sockets = new Set<net.Socket>();
        let accept!: () => void;
        const accepted = new Promise<void>((resolve) => {
            accept = resolve;
        });
        const server = net.createServer((socket) => {
            sockets.add(socket);
            socket.once("close", () => sockets.delete(socket));
            accept();
        });
        await new Promise<void>((resolve) =>
            server.listen(0, "127.0.0.1", resolve),
        );
        t.after(async () => {
            for (const socket of sockets) socket.destroy();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        });
        const port = (server.address() as net.AddressInfo).port;
        t.mock.timers.enable({ apis: ["setTimeout"] });
        const connecting =
            transport === "tls"
                ? openSession("127.0.0.1", port, "tls", true)
                : openSession("127.0.0.1", port, "none").then((session) => {
                      assert.equal(session.socket.timeout, SMTP_TIMEOUT_MS);
                      return upgradeToTls(session, "smtp.example.test", true);
                  });
        const failed = assert.rejects(connecting, /smtp_timeout/);
        await accepted;
        await setImmediate();
        t.mock.timers.tick(SMTP_TIMEOUT_MS);
        await failed;
    });
}
