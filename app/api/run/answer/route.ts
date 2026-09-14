import { mutateSubmitAnswer } from "../../../../lib/run-session-mutate";

type AnswerBody = {
  sessionToken?: string;
  questionId?: string;
  selectedOption?: string;
  progressRevision?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnswerBody;
    const sessionToken = body.sessionToken?.trim();
    const questionId = body.questionId?.trim();
    const selectedOption = body.selectedOption?.trim();
    const progressRevision = body.progressRevision;

    if (!sessionToken) {
      return Response.json({ error: "sessionToken is required" }, { status: 400 });
    }
    if (!questionId) {
      return Response.json({ error: "questionId is required" }, { status: 400 });
    }
    if (!selectedOption) {
      return Response.json({ error: "selectedOption is required" }, { status: 400 });
    }
    if (!Number.isInteger(progressRevision) || progressRevision < 0) {
      return Response.json({ error: "progressRevision is required" }, { status: 400 });
    }

    const result = await mutateSubmitAnswer(sessionToken, {
      questionId,
      selectedOption,
      progressRevision,
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "作答失敗";
    return Response.json({ error: message }, { status: 400 });
  }
}
