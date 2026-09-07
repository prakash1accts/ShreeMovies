import { listPromoCodes, listUpcomingShowtimes } from "@/lib/data";
import PromoCodeForm from "@/components/PromoCodeForm";

// Discount codes — e.g. for a WhatsApp campaign offering people who saw one
// movie a percentage off an upcoming show. Every code is single-use (see
// used_at on the PromoCode type) and can optionally be locked to one
// specific showtime, so a code that leaks past its intended audience still
// can't be reused or applied somewhere else.
export default async function AdminPromotionsPage() {
  const [codes, showtimes] = await Promise.all([listPromoCodes(), listUpcomingShowtimes()]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Promotions</h1>
      <p className="mt-1 text-neutral-400">
        Discount codes for a WhatsApp/SMS campaign or any other promotion. Each code is single-use
        — once redeemed on a booking (online or a walk-in sale), it can&apos;t be used again — and
        can optionally be locked to one specific showtime.
      </p>

      <div className="mt-6">
        <PromoCodeForm showtimes={showtimes} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Restricted to</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-neutral-800">
                <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.discount_percent}%</td>
                <td className="px-4 py-3 text-neutral-400">
                  {c.showtime_label || "Any showtime"}
                  {c.customer_name ? ` · ${c.customer_name}` : ""}
                </td>
                <td className="px-4 py-3">
                  {c.used_at ? (
                    <span className="text-neutral-500">
                      Used {new Date(c.used_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-green-400">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && (
          <div className="p-6 text-center text-neutral-400">No promo codes yet.</div>
        )}
      </div>
    </div>
  );
}
