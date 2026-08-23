const PLUGIN_MISSING_SNIPPET = '404: Plugin "agora" not loaded';

const UNREACHABLE_CODES = new Set([
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNABORTED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNRESET',
    'ENETUNREACH',
    'ERR_NETWORK',
    'ESOCKETTIMEDOUT',
]);

export function messageOf(err: unknown): string {
    if (err instanceof Error) {
        return err.message;
    }
    return String(err);
}

function codesOf(err: unknown, into: string[]): void {
    if (typeof err !== 'object' || err === null) {
        return;
    }
    if ('code' in err && typeof err.code === 'string') {
        into.push(err.code);
    }
    if (err instanceof Error && err.cause !== undefined) {
        codesOf(err.cause, into);
    }
}

export function isPluginMissing(err: unknown): boolean {
    return messageOf(err).includes(PLUGIN_MISSING_SNIPPET);
}

export function isTimeout(err: unknown): boolean {
    if (isPluginMissing(err)) {
        return false;
    }
    const codes: string[] = [];
    codesOf(err, codes);
    if (codes.some((c) => c === 'ETIMEDOUT' || c === 'ECONNABORTED' || c === 'ESOCKETTIMEDOUT')) {
        return true;
    }
    return /timeout/i.test(messageOf(err));
}

export function isUnreachable(err: unknown): boolean {
    if (isPluginMissing(err)) {
        return false;
    }
    const msg = messageOf(err);
    if (/error connecting to known chronik/i.test(msg) || /network error/i.test(msg)) {
        return true;
    }
    const codes: string[] = [];
    codesOf(err, codes);
    if (codes.some((c) => UNREACHABLE_CODES.has(c))) {
        return true;
    }
    return isTimeout(err);
}
