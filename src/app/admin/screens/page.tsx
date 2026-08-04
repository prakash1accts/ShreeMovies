import { createGridScreenAction, loadRealScreensAction } from "@/app/actions/admin";
import { listScreens, listTheaters } from "@/lib/data";
import GridScreenForm from "@/components/GridScreenForm";
import LoadRealScreensButton from "@/components/LoadRealScreensButton";
import { REAL_SCREENS } from "@/lib/real-screens";

export default async function AdminScreensPage() {
  const theaters = await listTheaters();
  const theaterId = theaters[0]?.id;
  const screens = theaterId ? await listScreens(theaterId) : [];
  const realScreenNames = new Set(REAL_SCREENS.map((s) => s.name));

  return (
    <div>
      <h1 className="text-2xl font-bold">Screens</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Each screen&apos;s seat map is used whenever you schedule a showtime on it.
      </p>

      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="font-medium">Real seat maps: Screen 4, Screen 6, Screen 7</h2>
        <p className="mt-1 text-sm text-neutral-400">
          These three use your actual box-office seat charts (real aisles, gaps, and
          row lengths) instead of a plain grid. Click below to create them, or to
          refresh them if you&apos;ve sent me an updated photo.
        </p>
        <form action={loadRealScreensAction} className="mt-3">
          <LoadRealScreensButton />
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="font-medium">Add another screen (plain grid)</h2>
        <p className="mt-1 text-sm text-neutral-400">
          For any screen you haven&apos;t sent me a photo of yet, add it here as a
          simple rows × seats-per-row grid. Send me a photo any time and I&apos;ll swap
          it for the real layout.
        </p>
        <GridScreenForm action={createGridScreenAction} />
      </div>

      <div className="mt-8 space-y-3">
        {screens.length === 0 && (
          <p className="text-sm text-neutral-500">No screens yet.</p>
        )}
        {screens.map((s) => {
          const seatCount = s.layout_json
            ? s.layout_json.rows.reduce((sum, r) => sum + r.seatNumbers.length, 0)
            : s.rows * s.cols;
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div>
                <div className="font-medium">
                  {s.name}
                  {realScreenNames.has(s.name) && s.layout_json && (
                    <span className="ml-2 rounded bg-red-900/50 px-2 py-0.5 text-xs text-red-300">
                      real layout
                    </span>
                  )}
                </div>
                <div className="text-sm text-neutral-500">
                  {s.layout_json
                    ? `${s.layout_json.rows.length} rows, ${seatCount} seats (irregular layout)`
                    : `${s.rows} rows × ${s.cols} seats = ${seatCount} seats (grid)`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
