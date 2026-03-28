"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getStoredRetailerSession } from "@/services/auth.service";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getStoredRetailerSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    router.replace(session.stage === "selected" ? "/catalogue" : "/select-distributor");
  }, [router]);

  return null;
}
