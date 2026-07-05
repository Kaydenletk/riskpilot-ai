// No-op stand-in for the `server-only` package under vitest. The real package
// throws if imported into a Client Component bundle; in unit tests we import
// server modules' pure helpers directly, where that guard does not apply.
export {};
