"use client";

import { type FC, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { createPhotoUploadAction } from "~/actions/proof";
import type { ProofValues } from "~/actions/proof/schema";
import { allowedContentTypes, isAllowedContentType, photoLimits } from "~/config/photo";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/feedback";
import { Label } from "../ui/formControls";

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

      <Label htmlFor="photos" className="sr-only">
        Choose photos
      </Label>
      <input
        id="photos"
        type="file"
        multiple
        accept={allowedContentTypes.join(",")}
        disabled={uploading || remaining <= 0}
        onChange={(event) => void add(event.target.files)}
        className="text-sm text-foreground/80 file:mr-3 file:rounded-xl file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
      />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP. Up to {maxMegabytes} MB each, {maxPhotosPerProof} photos at most.
      </p>

      {uploading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Uploading…
        </p>
      )}
      {error && <ErrorState description={error} />}

      {previews.length > 0 && (
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {previews.map((preview) => (
            <li key={preview.objectKey} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.name}
                className="size-20 rounded-xl border border-border object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  remove(preview.objectKey);
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
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
  const presigned = await createPhotoUploadAction({
    proofRef,
    contentType: file.type,
  });
  if (!presigned.ok) {
    return { error: presigned.error };
  }

  const response = await fetch(presigned.data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  }).catch(() => null);
  if (!response?.ok) {
    return { error: "The upload failed. Please try again." };
  }

  return {
    objectKey: presigned.data.objectKey,
    url: URL.createObjectURL(file),
    name: file.name,
  };
}
