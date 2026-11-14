"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, PhotoIcon } from "@/components/icons";
import { button } from "@/components/styles";

/** The first image among dropped, pasted or picked files. */
const firstImage = (files: FileList | null | undefined): File | null =>
  Array.from(files ?? []).find((file) => file.type.startsWith("image/") || file.type === "") ?? null;

interface Props {
  onPhoto: (file: File) => void;
}

/** Pick a worksheet photo: camera or library on a phone; file picker, drag-and-drop or paste on desktop. */
export function PhotoInput({ onPhoto }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Ctrl/⌘+V with a screenshot or copied photo on the clipboard.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = firstImage(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      onPhoto(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onPhoto]);

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = firstImage(event.target.files);
    // Reset so picking the same photo again still fires a change.
    event.target.value = "";
    if (file) onPhoto(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = firstImage(event.dataTransfer.files);
        if (file) onPhoto(file);
      }}
      className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors sm:py-10 ${
        dragging ? "border-ink bg-card" : "border-line bg-card/60"
      }`}
    >
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPicked}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={library}
        type="file"
        accept="image/*"
        onChange={onPicked}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {/* Touch devices: camera first. */}
      <div className="hidden flex-wrap justify-center gap-3 pointer-coarse:flex">
        <button type="button" className={`${button.primary} gap-2`} onClick={() => camera.current?.click()}>
          <CameraIcon />
          Take photo
        </button>
        <button type="button" className={`${button.secondary} gap-2`} onClick={() => library.current?.click()}>
          <PhotoIcon />
          Choose photo
        </button>
      </div>

      {/* Mouse and keyboard: file picker, drop or paste. */}
      <div className="pointer-coarse:hidden">
        <button type="button" className={`${button.primary} gap-2`} onClick={() => library.current?.click()}>
          <PhotoIcon />
          Choose photo
        </button>
        <p className="mt-3 text-sm text-muted">
          {dragging ? "Drop it here" : "or drag a photo here · paste a screenshot with Ctrl+V"}
        </p>
      </div>

      <p className="mx-auto mt-5 max-w-md text-sm text-muted">
        Get the whole page in the frame, with your kid&apos;s answers easy to see.
      </p>
    </div>
  );
}
