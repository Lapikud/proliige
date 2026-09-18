import { photoService } from "~/infra";
import { route } from "~/lib/http";
import { getUser } from "~/lib/user";

export const GET = route<RouteContext<"/api/photos/[proofId]/[photoId]">>(
  async (_request, { params }) => {
    const object = await photoService.openPhoto(await getUser(), await params);

    return new Response(object.stream, {
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": String(object.sizeBytes),
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
