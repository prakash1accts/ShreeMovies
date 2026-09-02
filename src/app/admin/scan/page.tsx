import ScanClient from "@/components/ScanClient";

// Continuous-scanning door screen — see ScanClient for the actual behavior.
// Auth is already enforced by /admin's own layout (admin-only), so this
// page itself has nothing extra to guard.
export default function AdminScanPage() {
  return <ScanClient />;
}
