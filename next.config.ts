import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, too small for a photographed bank-transfer receipt
      // uploaded as payment proof when admin confirms a booking.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
