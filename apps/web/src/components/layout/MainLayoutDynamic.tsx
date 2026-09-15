"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { SearchDeferred } from "@/components/layout/SearchDeferred";
import { CreatePostFloating } from "@/components/community/CreatePostFloating";
// import { DocumentUploadFloating } from "@/components/community/DocumentUploadFloating";

const PushNotificationPrompt = dynamic(
  () => import("@/components/notifications/PushNotificationPrompt").then((m) => ({ default: m.PushNotificationPrompt })),
  { ssr: false },
);

export function MainLayoutDynamic({ hideSearch = false }: { hideSearch?: boolean }) {
  return (
    <>
      {!hideSearch && <SearchDeferred />}
      <CreatePostFloating />
      {/* <DocumentUploadFloating /> */}
      <DeferredMount>
        <Suspense fallback={null}><PushNotificationPrompt /></Suspense>
      </DeferredMount>
    </>
  );
}