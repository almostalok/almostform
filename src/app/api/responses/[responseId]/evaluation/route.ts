import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateCandidateEvaluationSchema } from "@/lib/validation/schemas";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";
import { calculateOverallFormScore } from "@/lib/evaluation/calculate-score";
import { QuestionSchema } from "@/types/form-schema";

export async function GET(
  req: Request,
  { params }: { params: { responseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const response = await db.response.findUnique({
      where: { id: params.responseId },
      include: {
        form: true,
        answers: { include: { question: true } },
        reviewNotes: {
          include: { author: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!response || response.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Response not found" } }, { status: 404 });
    }

    const schema = await getFormRuntimeSchema(response.formId);

    const answersMap: Record<string, any> = {};
    const manualScoresMap: Record<string, number> = {};

    for (const a of response.answers) {
      try {
        answersMap[a.questionId] = JSON.parse(a.valueJson);
      } catch {
        answersMap[a.questionId] = a.valueJson;
      }
      if (a.manualScore !== null && a.manualScore !== undefined) {
        manualScoresMap[a.questionId] = a.manualScore;
      }
    }

    const allQuestions: QuestionSchema[] = schema ? schema.scenes.flatMap((s) => s.questions) : [];
    const scoreSummary = calculateOverallFormScore(allQuestions, answersMap, manualScoresMap);

    return NextResponse.json({
      success: true,
      data: {
        response,
        schema,
        scoreSummary,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { responseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const responseRecord = await db.response.findUnique({
      where: { id: params.responseId },
      include: { form: true, answers: true },
    });

    if (!responseRecord || responseRecord.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Response not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateCandidateEvaluationSchema.parse(body);

    const schema = await getFormRuntimeSchema(responseRecord.formId);
    const allQuestions = schema ? schema.scenes.flatMap((s) => s.questions) : [];

    // Perform evaluation updates in a transaction
    const updated = await db.$transaction(async (tx) => {
      // 1. Update candidate status if provided
      if (parsed.candidateStatus) {
        await tx.response.update({
          where: { id: params.responseId },
          data: { candidateStatus: parsed.candidateStatus },
        });
      }

      // 2. Add reviewer note if provided
      if (parsed.note && parsed.note.trim() !== "") {
        await tx.reviewNote.create({
          data: {
            responseId: params.responseId,
            authorId: user.id,
            content: parsed.note.trim(),
          },
        });
      }

      // 3. Update manual scores if provided
      if (parsed.manualScores) {
        for (const questionId in parsed.manualScores) {
          const mScore = parsed.manualScores[questionId];
          await tx.responseAnswer.updateMany({
            where: { responseId: params.responseId, questionId },
            data: { manualScore: mScore },
          });
        }
      }

      // Recalculate scores
      const updatedAnswers = await tx.responseAnswer.findMany({
        where: { responseId: params.responseId },
      });

      const answersMap: Record<string, any> = {};
      const manualScoresMap: Record<string, number> = {};

      for (const a of updatedAnswers) {
        try {
          answersMap[a.questionId] = JSON.parse(a.valueJson);
        } catch {
          answersMap[a.questionId] = a.valueJson;
        }
        if (a.manualScore !== null && a.manualScore !== undefined) {
          manualScoresMap[a.questionId] = a.manualScore;
        }
      }

      const evalSummary = calculateOverallFormScore(allQuestions, answersMap, manualScoresMap);

      const finalResponse = await tx.response.update({
        where: { id: params.responseId },
        data: {
          totalScore: evalSummary.totalScore,
          maxScore: evalSummary.maxScore,
          normalizedScore: evalSummary.normalizedScore,
        },
        include: {
          answers: true,
          reviewNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
        },
      });

      return { finalResponse, evalSummary };
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
