// Shree Movies' bank account for customers paying by transfer, and the
// contact channels used to confirm those payments. Shown at checkout, on
// the Contact page, and anywhere else customers need to pay or reach us.
export const BANK_ACCOUNT = {
  bankName: "Banco BIC",
  accountName: "SHREESHA GROUP PRE DE SER COM E IND LDA",
  accountNumber: "23677134310001",
  nib: "005100003677134310195",
  iban: "AO06005100003677134310195",
  swift: "BCCBAOLU",
  whatsapp: "+244950490909",
  email: "shree.movies@gmail.com",
};

// Currency shown throughout the site — Angolan Kwanza.
export const CURRENCY_CODE = "AOA";

export function formatMoney(cents: number): string {
  return `${CURRENCY_CODE} ${(cents / 100).toFixed(2)}`;
}
