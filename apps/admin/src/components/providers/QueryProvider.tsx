"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { getQueriesConfig } from "@/lib/react-query/config";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: getQueriesConfig() },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
