import { z } from "zod";
import { toCommentView } from "~/components/feed/model";
import { notFound } from "~/domain/errors";
import { commentService } from "~/infra";
import { route } from "~/lib/http";
import { getUser } from "~/lib/user";

export const GET = route(async (_request, { params }: { params: Promise<{ proofId: string }> }) => {
  const { proofId } = await params;

  if (!z.uuid().safeParse(proofId).success) {
    throw notFound("That proof does not exist.");
  }

  const user = await getUser();
  const comments = await commentService.listComments(user, proofId);

  return Response.json({
    comments: comments.map((comment) => toCommentView(comment, user)),
  });
});
