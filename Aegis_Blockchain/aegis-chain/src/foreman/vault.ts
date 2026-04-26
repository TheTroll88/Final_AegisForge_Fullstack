import { isAbsolute, join } from "path";

const DEFAULT_FOREMAN_VAULT = join(import.meta.dirname || __dirname, "..", "..", ".vault", "foreman");

export function getForemanVaultDir(): string {
  const configured = (process.env.FOREMAN_VAULT_DIR || "").trim();
  if (!configured) return DEFAULT_FOREMAN_VAULT;

  return isAbsolute(configured) ? configured : join(process.cwd(), configured);
}
