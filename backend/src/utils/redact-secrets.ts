/**
 * Recursively removes sensitive fields from the provided object/array.
 */
export const redactSecrets = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => redactSecrets(item));
    return;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    delete obj.stratumPassword;
    delete obj.wifiPassword;
    delete obj.password;
    delete obj.token;

    Object.values(value).forEach((nested) => {
      if (typeof nested === "object" && nested !== null) {
        redactSecrets(nested);
      }
    });
  }
};

export default redactSecrets;

