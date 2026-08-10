import { blockUserAction, unblockUserAction } from "@/app/actions/admin";
import { listCustomers } from "@/lib/data";

export default async function AdminUsersPage() {
  const customers = await listCustomers();

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-1 text-neutral-400">
        Every customer account — name, email, phone, and WhatsApp — with the option to block an
        account if it's necessary.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((u) => (
              <tr key={u.id} className="border-t border-neutral-800">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-neutral-400">{u.email}</td>
                <td className="px-4 py-3 text-neutral-400">{u.phone || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">{u.whatsapp || "—"}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {u.is_blocked ? (
                    <span className="rounded-full bg-red-950/50 px-2 py-0.5 text-xs font-medium text-red-300">
                      Blocked
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-950/50 px-2 py-0.5 text-xs font-medium text-green-300">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.is_blocked ? (
                    <form action={unblockUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700">
                        Unblock
                      </button>
                    </form>
                  ) : (
                    <form action={blockUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/50">
                        Block
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="p-6 text-center text-neutral-400">No customer accounts yet.</div>
        )}
      </div>
    </div>
  );
}
