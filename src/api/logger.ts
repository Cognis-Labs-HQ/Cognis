import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
    constructor(
        private readonly level: LogLevel = 'info',
        private readonly filePath = '/tmp/cognis.log'
    ) {}

    async log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
        if (priorities[level] < priorities[this.level]) return;
        const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta });

        if (level === 'error') {
            process.stderr.write(`${line}\n`);
        } else {
            process.stdout.write(`${line}\n`);
        }

        await mkdir(path.dirname(this.filePath), { recursive: true });
        await appendFile(this.filePath, `${line}\n`, 'utf8');
    }

    info(message: string, meta?: Record<string, unknown>) { return this.log('info', message, meta); }
    warn(message: string, meta?: Record<string, unknown>) { return this.log('warn', message, meta); }
    error(message: string, meta?: Record<string, unknown>) { return this.log('error', message, meta); }
}
