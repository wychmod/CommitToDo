export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(value);
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

export function validateNotEmpty(value: string, fieldName: string): void {
  if (!isNonEmptyString(value)) {
    throw new Error(`${fieldName} 不能为空`);
  }
}

export function validatePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} 必须是非负整数`);
  }
}
