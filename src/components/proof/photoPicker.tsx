"use client";

import { Camera, LoaderCircle, X } from "lucide-react";
import { type FC, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { ProofValues } from "~/actions/proof/schema";
import { allowedContentTypes, isAllowedContentType, photoLimits } from "~/config/photo";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/feedback";

interface Props {
  proofRef: string;
  instructions: string | null;
}

interface Preview {
  objectKey: string;
  url: string;
  name: string;
}

const { maxFileSizeBytes, maxPhotosPerProof } = photoLimits;
const maxMegabytes = Math.floor(maxFileSizeBytes / (1024 * 1024));

export const PhotoPicker: FC<Props> = ({ proofRef, instructions }) => {
  const { setValue } = useFormContext<ProofValues>();
  const objectKeys = useWatch<ProofValues, "objectKeys">({ name: "objectKeys" });
  const [previews, setPreviews] = useState<Array<Preview>>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = maxPhotosPerProof - objectKeys.length;

  const setKeys = (keys: Array<string>) => {
    setValue("objectKeys", keys, { shouldValidate: true });
  };

  const add = async (files: FileList | null) => {
    setError(null);
    setUploading(true);
    const added: Array<Preview> = [];

    for (const file of Array.from(files ?? []).slice(0, remaining)) {
      const problem = checkFile(file);
      if (problem) {
        setError(problem);
        continue;
      }
      const uploaded = await upload(file, proofRef);
      if ("error" in uploaded) {
        setError(uploaded.error);
        continue;
      }
      added.push(uploaded);
    }

    setPreviews((current) => [...current, ...added]);
    setKeys([...objectKeys, ...added.map((preview) => preview.objectKey)]);
    setUploading(false);
  };

  const remove = (objectKey: string) => {
    setPreviews((current) => current.filter((preview) => preview.objectKey !== objectKey));
    setKeys(objectKeys.filter((key) => key !== objectKey));
  };

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="sr-only">Photos (required)</legend>
      {instructions && <p className="text-sm text-muted-foreground">{instructions}</p>}

      <ul className="grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5">
        {previews.map((preview) => (
          <li key={preview.objectKey} className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.name}
              className="size-full rounded-xl border border-border object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute top-1 right-1 w-8 px-0"
              aria-label={`Remove ${preview.name}`}
              title="Remove"
              onClick={() => {
                remove(preview.objectKey);
              }}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
        {remaining > 0 && (
          <li className="aspect-square">
            <label
              htmlFor="photos"
              className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-foreground/50 bg-background text-center text-sm font-semibold text-foreground hover:border-foreground hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:opacity-60"
            >
              {uploading ? (
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-5" aria-hidden />
              )}
              {uploading ? "Uploading…" : "Add photos"}
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {objectKeys.length} / {maxPhotosPerProof}
              </span>
              <input
                id="photos"
                type="file"
                multiple
                accept={allowedContentTypes.join(",")}
                disabled={uploading}
                onChange={(event) => {
                  void add(event.target.files);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          </li>
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP. Up to {maxMegabytes} MB each, {maxPhotosPerProof} photos at most.
      </p>
      {uploading && (
        <p className="sr-only" aria-live="polite">
          Uploading…
        </p>
      )}
      {error && <ErrorState description={error} />}
    </fieldset>
  );
};

function checkFile(file: File): string | null {
  if (!isAllowedContentType(file.type)) {
    return "Only JPEG, PNG, and WebP photos are accepted.";
  }
  if (file.size > maxFileSizeBytes) {
    return `Photos must be ${maxMegabytes} MB or smaller.`;
  }

  return null;
}

async function upload(file: File, proofRef: string): Promise<Preview | { error: string }> {
  const body = new FormData();
  body.set("file", file);
  body.set("proofRef", proofRef);

  const response = await fetch("/api/photos/upload", {
    method: "POST",
    body,
  }).catch(() => null);
  if (!response?.ok) {
    return { error: "The upload failed. Please try again." };
  }

  const { objectKey } = (await response.json()) as { objectKey: string };

  return {
    objectKey,
    url: URL.createObjectURL(file),
    name: file.name,
  };
}
