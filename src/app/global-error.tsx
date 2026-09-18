"use client";

import "./globals.css";
import type { FC } from "react";
import { Document } from "~/components/document";
import { Button } from "~/components/ui/button";
import { StatusPage } from "~/components/ui/feedback";
import { reportClientError } from "~/lib/logging/client";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  retry: () => void;
}

const GlobalError: FC<Props> = ({ error, retry }) => {
  useEffect(() => {
    reportClientError(error, {
      source: "global-error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <Document>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <StatusPage
          title="Something went wrong"
          description={
            error.digest ? `Reference: ${error.digest}` : "Please try again in a moment."
          }
        >
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </StatusPage>
      </main>
    </Document>
  );
};

export default GlobalError;
