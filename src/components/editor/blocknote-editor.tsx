"use client";

import { useEffect } from "react";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

type BlockNoteEditorProps = {
  onChange?: (json: string) => void;
  resetKey?: unknown;
};

export function BlockNoteEditor({ onChange, resetKey }: BlockNoteEditorProps) {
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      placeholders: {
        ...en.placeholders,
        emptyDocument: "Tulis tugas untuk siswa...",
      },
    },
  });

  useEffect(() => {
    editor.replaceBlocks(editor.document, [{ type: "paragraph", content: [] }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return (
    <BlockNoteView
      editor={editor}
      className="h-64 overflow-y-auto rounded-lg border"
      onChange={() => onChange?.(JSON.stringify(editor.document))}
    />
  );
}