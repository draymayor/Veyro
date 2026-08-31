"use client";

import { useEffect, useId, useMemo } from "react";
import Image from "next/image";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface ImageUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
}

/**
 * Multiple gift card photo upload (docs/product-rules.md rule 15). No
 * dedicated upload component existed elsewhere in the app to reuse, so this
 * is a minimal dropzone-style field: a bordered tap target plus a thumbnail
 * strip, kept visually consistent with the rest of the light app card
 * surface rather than a native-looking file input.
 */
export function ImageUpload({ files, onChange }: ImageUploadProps) {
  const inputId = useId();
  const previews = usePreviews(files);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    onChange([...files, ...Array.from(fileList)]);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={inputId}
        className="border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary/60 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors"
      >
        <PhotoIcon className="text-ink/30 size-6" aria-hidden="true" />
        <span className="text-ink text-sm font-medium">
          Upload photos of your card
        </span>
        <span className="text-ink/45 text-xs">
          Front and back, clear and well-lit. You can add more than one.
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((src, index) => (
            <div
              key={src}
              className="border-border relative aspect-square overflow-hidden rounded-xl border"
            >
              <Image
                src={src}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label="Remove photo"
                className="bg-ink/60 hover:bg-ink/80 absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-white transition-colors"
              >
                <XMarkIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function usePreviews(files: File[]): string[] {
  const urls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [urls]);

  return urls;
}
