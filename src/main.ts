import { boot } from './app';

const root = document.getElementById('app');
if (!root) {
    throw new Error('missing #app');
}
boot(root);
