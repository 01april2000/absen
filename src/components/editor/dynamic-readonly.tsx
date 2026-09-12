"use client";

import dynamic from "next/dynamic";

export const DynamicBlockNoteReadOnly = dynamic(
  () => import("./blocknote-readonly").then((m) => m.BlockNoteReadOnly),
  { ssr: false }
);