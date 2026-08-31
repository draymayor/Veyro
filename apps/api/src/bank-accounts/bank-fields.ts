import { BadRequestException } from '@nestjs/common';

// Country-conditional bank field shapes, per docs/product-rules.md rule 19.
// Never hardcode Nigeria-only fields as the universal default; expand
// SEPA_COUNTRY_CODES as new countries are added, per that same rule.
export type BankFieldSet = 'NG' | 'US' | 'GB' | 'SEPA' | 'FALLBACK';

// EU member states plus the non-EU SEPA scheme participants. The United
// Kingdom is deliberately excluded here even though it's a SEPA member in
// practice: rule 19 gives it its own explicit field set (sort code +
// account number), separate from IBAN/BIC.
const SEPA_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
  'CH',
  'MC',
  'SM',
  'AD',
  'VA',
]);

export function fieldSetForCountry(country: string): BankFieldSet {
  const code = country.toUpperCase();
  if (code === 'NG') return 'NG';
  if (code === 'US') return 'US';
  if (code === 'GB') return 'GB';
  if (SEPA_COUNTRY_CODES.has(code)) return 'SEPA';
  return 'FALLBACK';
}

function stringField(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value.trim() : '';
}

// Validates and normalizes the raw bank_details payload for the given
// field set, throwing with a field-specific message on anything invalid.
// Returns only the fields that field set actually uses, so a client can
// never smuggle in fields from a different country's shape.
export function validateBankDetails(
  fieldSet: BankFieldSet,
  details: Record<string, unknown>,
): Record<string, string | undefined> {
  switch (fieldSet) {
    case 'NG': {
      const bankName = stringField(details, 'bankName');
      const accountNumber = stringField(details, 'accountNumber');
      const accountName = stringField(details, 'accountName');
      if (!bankName) throw new BadRequestException('Select a bank.');
      if (!/^\d{10}$/.test(accountNumber)) {
        throw new BadRequestException('Account number must be 10 digits.');
      }
      if (!accountName) {
        throw new BadRequestException('Enter the account name.');
      }
      return { bankName, accountNumber, accountName };
    }

    case 'US': {
      const bankName = stringField(details, 'bankName');
      const routingNumber = stringField(details, 'routingNumber');
      const accountNumber = stringField(details, 'accountNumber');
      const accountType = stringField(details, 'accountType');
      if (!bankName) throw new BadRequestException('Enter the bank name.');
      if (!/^\d{9}$/.test(routingNumber)) {
        throw new BadRequestException('Routing number must be 9 digits.');
      }
      if (!/^\d{4,17}$/.test(accountNumber)) {
        throw new BadRequestException('Enter a valid account number.');
      }
      if (accountType !== 'checking' && accountType !== 'savings') {
        throw new BadRequestException(
          'Select an account type (checking or savings).',
        );
      }
      return { bankName, routingNumber, accountNumber, accountType };
    }

    case 'GB': {
      const bankName = stringField(details, 'bankName');
      const sortCode = stringField(details, 'sortCode').replace(/-/g, '');
      const accountNumber = stringField(details, 'accountNumber');
      if (!bankName) throw new BadRequestException('Enter the bank name.');
      if (!/^\d{6}$/.test(sortCode)) {
        throw new BadRequestException('Sort code must be 6 digits.');
      }
      if (!/^\d{8}$/.test(accountNumber)) {
        throw new BadRequestException('Account number must be 8 digits.');
      }
      return { bankName, sortCode, accountNumber };
    }

    case 'SEPA': {
      const bankName = stringField(details, 'bankName');
      const iban = stringField(details, 'iban')
        .replace(/\s+/g, '')
        .toUpperCase();
      const bic = stringField(details, 'bic').replace(/\s+/g, '').toUpperCase();
      if (!bankName) throw new BadRequestException('Enter the bank name.');
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
        throw new BadRequestException('Enter a valid IBAN.');
      }
      if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
        throw new BadRequestException('Enter a valid BIC/SWIFT code.');
      }
      return { bankName, iban, bic };
    }

    case 'FALLBACK': {
      const bankName = stringField(details, 'bankName');
      const ibanOrSwift = stringField(details, 'ibanOrSwift');
      const accountNumber = stringField(details, 'accountNumber');
      if (!ibanOrSwift) {
        throw new BadRequestException('Enter an IBAN or SWIFT/BIC code.');
      }
      if (!accountNumber) {
        throw new BadRequestException('Enter the account number.');
      }
      return {
        bankName: bankName || undefined,
        ibanOrSwift,
        accountNumber,
      };
    }
  }
}
