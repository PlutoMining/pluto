/**
 * Recursively removes sensitive fields from the provided object/array.
 */
export const redactSecrets = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => redactSecrets(item));
    return;
  }

  if (value && typeof value === "object") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - dynamic property access based on runtime keys
    delete value.stratumPassword;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - dynamic property access based on runtime keys
    delete value.wifiPassword;

    Object.values(value).forEach((nested) => {
      if (typeof nested === "object" && nested !== null) {
        redactSecrets(nested);
      }
    });
  }
};

export default redactSecrets;

