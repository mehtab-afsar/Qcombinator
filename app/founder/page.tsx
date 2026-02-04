"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FounderRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace("/founder/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-black text-xs">EDGE</span>
        </div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
