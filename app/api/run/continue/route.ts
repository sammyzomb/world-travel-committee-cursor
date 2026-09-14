import { mutateContinueAfterReward } from "../../../../lib/run-session-mutate";

type ContinueBody = {
  sessionToken?: string;
  progressRevision?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContinueBody;
    const sessionToken = body.sessionToken?.trim();
    const progressRevision = body.progressRevision;

    if (!sessionToken) {
      return Response.json({ error: "sessionToken is required" }, { status: 400 });
    }
    if (!Number.isInteger(progressRevision) || progressRevision < 0) {
      return Response.json({ error: "progressRevision is required" }, { status: 400 });
    }

    const result = await mutateContinueAfterReward(sessionToken, progressRevision);
    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法繼續遊戲";
    return Response.json({ error: message }, { status: 400 });
  }
}
