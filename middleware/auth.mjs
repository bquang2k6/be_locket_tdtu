import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const verifyAuthCjs = require('./auth.js');

// If the CJS file exported the function as default or as property, normalize
const verifyAuth = verifyAuthCjs.verifyAuth || verifyAuthCjs.default || verifyAuthCjs;

export { verifyAuth };
