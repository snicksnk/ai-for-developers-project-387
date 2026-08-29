/**
 * Ports for the isolated e2e stack, shared between playwright.config.ts
 * (which boots the servers) and the test/support files (which need to know
 * where they're listening).
 */
export const BACKEND_PORT = 4020;
export const FRONTEND_PORT = 5180;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
