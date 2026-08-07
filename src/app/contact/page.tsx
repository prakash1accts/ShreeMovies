import { BANK_ACCOUNT } from "@/lib/payment-info";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
      <p className="mt-2 text-neutral-400">
        Get in touch with Shree Movies — questions about showtimes, group bookings, or
        anything else, we&apos;re happy to help.
      </p>

      <div className="mt-8 space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            WhatsApp
          </h2>
          <p className="mt-1 text-lg">
            
              href={`https://wa.me/${BANK_ACCOUNT.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-400"
            >
              {BANK_ACCOUNT.whatsapp}
            </a>
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Email
          </h2>
          <p className="mt-1 text-lg">
            <a href={`mailto:${BANK_ACCOUNT.email}`} className="hover:text-red-400">
              {BANK_ACCOUNT.email}
            </a>
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Address
          </h2>
          <p className="mt-1 text-lg">[Add theater address]</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Box office hours
          </h2>
          <p className="mt-1 text-lg">[Add hours]</p>
        </div>
      </div>

      <div className="mt-6 space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Bank transfer details
        </h2>
        <p className="text-sm text-neutral-300">Bank: {BANK_ACCOUNT.bankName}</p>
        <p className="text-sm text-neutral-300">Account name: {BANK_ACCOUNT.accountName}</p>
        <p className="text-sm text-neutral-300">Account number: {BANK_ACCOUNT.accountNumber}</p>
        <p className="text-sm text-neutral-300">IBAN: {BANK_ACCOUNT.iban}</p>
        <p className="text-sm text-neutral-300">SWIFT/BIC: {BANK_ACCOUNT.swift}</p>
      </div>
    </div>
  );
}
