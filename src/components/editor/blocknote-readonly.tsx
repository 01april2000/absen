"use client";

import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

type BlockNoteReadOnlyProps = {
  initialContent: string;
};

export function BlockNoteReadOnly({ initialContent }: BlockNoteReadOnlyProps) {
  let initial: ReturnType<typeof JSON.parse>;
  try {
    initial = JSON.parse(initialContent);
  } catch {
    initial = { type: "doc", content: [] };
  }

  const editor = useCreateBlockNote({
    initialContent: initial,
    dictionary: {
      ...en,
      placeholders: {
        ...en.placeholders,
        emptyDocument: "Tidak ada isi tugas.",
      },
    },
  });

  return <BlockNoteView editor={editor} editable={false} />;
}