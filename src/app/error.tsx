"use client";

import { type FC, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { StatusPage } from "~/components/ui/feedback";
import { reportClientError } from "~/lib/logging/client";

interface Props {
  error: Error & { digest?: string };
  retry: () => void;
}

const ErrorPage: FC<Props> = ({ error, retry }) => {
  useEffect(() => {
    reportClientError(error, {
      source: "app.error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <StatusPage
      title="Something went wrong"
      description={error.digest ? `Reference: ${error.digest}` : "Please try again in a moment."}
    >
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </StatusPage>
  );
};

export default ErrorPage;
