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
            Phone
          </h2>
          <p className="mt-1 text-lg">[Add phone number]</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Email
          </h2>
          <p className="mt-1 text-lg">[Add email address]</p>
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
    </div>
  );
}
