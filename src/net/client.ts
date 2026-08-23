import { ChronikClient } from 'chronik-client';
import { CHRONIK_HOSTS } from './hosts';

/** Constructor order. Never ClosestFirst — a plugin-less node is not skipped. */
export function createChronik(): ChronikClient {
    return new ChronikClient([...CHRONIK_HOSTS]);
}
