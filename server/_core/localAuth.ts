import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function derivePasswordHash(password: string, saltHex: string) {
  return scryptSync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
}

export function createLocalPasswordHash(password: string): string {
  const saltHex = randomBytes(SALT_BYTES).toString("hex");
  const passwordHash = derivePasswordHash(password, saltHex).toString("hex");

  return `${HASH_ALGORITHM}$${saltHex}$${passwordHash}`;
}

export function verifyLocalPassword(
  password: string,
  storedHash: string
): boolean {
  const [algorithm, saltHex, expectedHashHex] = storedHash.split("$");

  if (
    algorithm !== HASH_ALGORITHM ||
    !saltHex ||
    !expectedHashHex ||
    saltHex.length === 0 ||
    expectedHashHex.length === 0
  ) {
    return false;
  }

  try {
    const expectedHash = Buffer.from(expectedHashHex, "hex");
    const actualHash = derivePasswordHash(password, saltHex);

    if (expectedHash.length !== actualHash.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
