/**
 * Country-conditional bank field shapes, per docs/product-rules.md rule 19.
 * Mirrors the field-set logic in apps/api/src/bank-accounts/bank-fields.ts
 * (kept independent since the two apps don't share a package), so the form
 * rendered here always matches what the backend will accept. Never
 * hardcode Nigeria-only fields as the universal default; expand
 * SEPA_COUNTRY_CODES as new countries are added, per that same rule.
 */

export type BankFieldSet = "NG" | "US" | "GB" | "SEPA" | "FALLBACK";

// EU member states plus the non-EU SEPA scheme participants. The United
// Kingdom is deliberately excluded here even though it's a SEPA member in
// practice: rule 19 gives it its own explicit field set (sort code +
// account number), separate from IBAN/BIC.
const SEPA_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "CH",
  "MC",
  "SM",
  "AD",
  "VA",
]);

export function fieldSetForCountry(countryCode: string): BankFieldSet {
  const code = countryCode.toUpperCase();
  if (code === "NG") return "NG";
  if (code === "US") return "US";
  if (code === "GB") return "GB";
  if (SEPA_COUNTRY_CODES.has(code)) return "SEPA";
  return "FALLBACK";
}

export interface BankFieldDef {
  key: string;
  label: string;
  placeholder: string;
  /** Nigerian banks example dropdown; every other field set is a plain text input. */
  type?: "select";
  options?: string[];
  inputMode?: "text" | "numeric";
  maxLength?: number;
}

// A representative list, not exhaustive; admin-managed rate/bank data can
// replace this later the same way gift_card_brands does for gift cards.
const NIGERIAN_BANKS = [
  "Access Bank",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "Guaranty Trust Bank",
  "Kuda Bank",
  "Moniepoint",
  "Opay",
  "Polaris Bank",
  "Stanbic IBTC Bank",
  "Sterling Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa",
  "Wema Bank",
  "Zenith Bank",
];

export function fieldsForSet(fieldSet: BankFieldSet): BankFieldDef[] {
  switch (fieldSet) {
    case "NG":
      return [
        {
          key: "bankName",
          label: "Bank",
          placeholder: "Select a bank",
          type: "select",
          options: NIGERIAN_BANKS,
        },
        {
          key: "accountNumber",
          label: "Account Number",
          placeholder: "10-digit account number",
          inputMode: "numeric",
          maxLength: 10,
        },
        {
          key: "accountName",
          label: "Account Name",
          placeholder: "Name on the account",
        },
      ];
    case "US":
      return [
        { key: "bankName", label: "Bank Name", placeholder: "e.g. Chase" },
        {
          key: "routingNumber",
          label: "Routing Number",
          placeholder: "9-digit routing number",
          inputMode: "numeric",
          maxLength: 9,
        },
        {
          key: "accountNumber",
          label: "Account Number",
          placeholder: "Account number",
          inputMode: "numeric",
        },
        {
          key: "accountType",
          label: "Account Type",
          placeholder: "Select account type",
          type: "select",
          options: ["checking", "savings"],
        },
      ];
    case "GB":
      return [
        { key: "bankName", label: "Bank Name", placeholder: "e.g. Barclays" },
        {
          key: "sortCode",
          label: "Sort Code",
          placeholder: "6-digit sort code",
          inputMode: "numeric",
          maxLength: 6,
        },
        {
          key: "accountNumber",
          label: "Account Number",
          placeholder: "8-digit account number",
          inputMode: "numeric",
          maxLength: 8,
        },
      ];
    case "SEPA":
      return [
        {
          key: "bankName",
          label: "Bank Name",
          placeholder: "Your bank's name",
        },
        {
          key: "iban",
          label: "IBAN",
          placeholder: "e.g. DE89 3704 0044 0532 0130 00",
        },
        { key: "bic", label: "BIC / SWIFT", placeholder: "8 or 11 characters" },
      ];
    case "FALLBACK":
      return [
        {
          key: "bankName",
          label: "Bank Name (optional)",
          placeholder: "Your bank's name",
        },
        {
          key: "ibanOrSwift",
          label: "IBAN or SWIFT/BIC",
          placeholder: "Whichever your bank uses",
        },
        {
          key: "accountNumber",
          label: "Account Number",
          placeholder: "Account number",
        },
      ];
  }
}

/** Short label for the saved-account list row, favoring whatever the field set uses to identify the account. */
export function summarizeBankAccount(
  fieldSet: BankFieldSet,
  details: Record<string, string | undefined>,
): string {
  switch (fieldSet) {
    case "NG":
    case "US":
    case "GB":
      return `${details.bankName ?? ""} •••• ${(details.accountNumber ?? "").slice(-4)}`;
    case "SEPA":
      return `${details.bankName ?? ""} •••• ${(details.iban ?? "").slice(-4)}`;
    case "FALLBACK":
      return details.bankName
        ? `${details.bankName} •••• ${(details.accountNumber ?? "").slice(-4)}`
        : `•••• ${(details.accountNumber ?? "").slice(-4)}`;
  }
}
