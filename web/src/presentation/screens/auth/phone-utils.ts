/**
 * Phone number utilities.
 */

/**
 * Build E.164 phone number from country code and national number.
 */
export function toE164(countryCode: string, national: string): string {
  const cleaned = national.replace(/\D/g, '');
  return `${countryCode}${cleaned}`;
}
