"use client";

import { useEffect } from "react";
import { initPosthog } from "@/lib/posthog";

export default function PosthogProvider() {
  useEffect(() => {
    initPosthog();
  }, []);

  return null;
}
