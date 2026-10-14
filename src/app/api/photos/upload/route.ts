import { validation } from "~/domain/errors";
import { photoService } from "~/infra";
import { route } from "~/lib/http";
import { getUser } from "~/lib/user";

export const POST = route(async (request) => {
  const form = await request.formData();
  const file = form.get("file");
  const proofRef = form.get("proofRef");
  if (!(file instanceof File) || typeof proofRef !== "string" || proofRef.length === 0) {
    throw validation("A photo file and proof reference are required.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { objectKey } = await photoService.uploadPhoto(await getUser(), {
    proofRef,
    bytes,
  });

  return Response.json({ objectKey });
});
