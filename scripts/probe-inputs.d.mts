import type { Plugin } from 'vite';

/** The Vite plugin that lists the probe build's public inputs where `STALL_PROBE_INPUTS` names (`probe-inputs.mjs`). */
export function probeInputsPlugin(options?: { env?: Record<string, string | undefined>; root?: string }): Plugin;
