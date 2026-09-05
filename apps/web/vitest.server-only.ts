// Vitest stand-in for the `server-only` package.
// In Next.js the "react-server" export condition maps `server-only` to an empty
// module; Node (and therefore Vitest) resolves the "default" entry, which
// throws. Mirroring the empty module keeps unit tests of server modules green.
export {};
