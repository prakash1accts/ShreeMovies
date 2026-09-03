              <tbody>
                {group.rows.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-t border-neutral-800 ${
                      b.status === "cancelled" ? "text-red-500 line-through" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {b.customer_name || "—"}
                      {b.seats_changed_note && <sup>*</sup>}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{b.seat_labels || "—"}</td>
                    <td className="px-4 py-3 text-neutral-400">{ticketCount(b)}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {(b.total_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {/* A plain-text "CANCELLED" badge, not just red + strikethrough —
                          on a small phone screen (glare, a washed-out display, or just
                          not noticing the color) the status needs to read clearly on
                          its own, without depending on perceiving red at all. */}
                      {b.status === "cancelled" ? (
                        <span className="inline-block rounded-full bg-red-950 px-2 py-0.5 text-xs font-semibold tracking-wide text-red-300 no-underline">
                          CANCELLED
                        </span>
                      ) : (
                        b.status
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.checked_in_at ? (
                        <span className="text-green-400">Admitted</span>
                      ) : (
                        <span className="text-neutral-500">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
