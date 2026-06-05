"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Settings → Profile tab
    router.replace("/founder/settings?tab=profile");
  }, [router]);

  return null;
}
