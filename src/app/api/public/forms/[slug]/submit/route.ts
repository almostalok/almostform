import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";
import { calculateOverallFormScore, evaluateQuestionAnswer } from "@/lib/evaluation/calculate-score";
import { submitResponseSchema } from "@/lib/validation/schemas";
import { QuestionSchema } from "@/types/form-schema";

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const schema = await getFormRuntimeSchema(params.slug);

    if (!schema) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Form not found" } },
        { status: 404 }
      );
    }

    if (schema.metadata.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: { code: "FORM_NOT_PUBLISHED", message: "Form is not published" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = submitResponseSchema.parse(body);

    const answersMap: Record<string, any> = {};
    for (const ans of parsed.answers) {
      answersMap[ans.questionId] = ans.value;
    }

    // Collect all questions across scenes
    const allQuestions: QuestionSchema[] = [];
    for (const scene of schema.scenes) {
      for (const q of scene.questions) {
        allQuestions.push(q);
      }
    }

    // Validation (Section 16 & 25)
    const validationErrors: string[] = [];
    for (const q of allQuestions) {
      const val = answersMap[q.id];

      if (q.required && (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))) {
        validationErrors.push(`"${q.label}" is required.`);
        continue;
      }

      if (val !== undefined && val !== null && val !== "") {
        if (q.type === "EMAIL") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(val))) {
            validationErrors.push(`"${q.label}" must be a valid email address.`);
          }
        }
        if (q.type === "URL") {
          try {
            new URL(String(val));
          } catch {
            validationErrors.push(`"${q.label}" must be a valid URL.`);
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESPONSE_VALIDATION_FAILED",
            message: "Submission contains validation errors.",
            details: validationErrors,
          },
        },
        { status: 400 }
      );
    }

    // Calculate score if HIRING or QUIZ form
    const evalSummary = calculateOverallFormScore(allQuestions, answersMap);

    // Database Transaction for response + answers
    const responseRecord = await db.$transaction(async (tx) => {
      const createdResponse = await tx.response.create({
        data: {
          formId: schema.id,
          formVersionId: schema.versionId,
          sessionId: parsed.sessionId,
          status: "SUBMITTED",
          submittedAt: new Date(),
          totalScore: evalSummary.totalScore,
          maxScore: evalSummary.maxScore,
          normalizedScore: evalSummary.normalizedScore,
          candidateStatus: schema.metadata.type === "HIRING" ? "NEW" : undefined,
        },
      });

      const answerDataList = [];
      for (const q of allQuestions) {
        const userValue = answersMap[q.id] !== undefined ? answersMap[q.id] : null;
        const qEval = evalSummary.questionScores[q.id];

        answerDataList.push({
          responseId: createdResponse.id,
          questionId: q.id,
          valueJson: JSON.stringify(userValue),
          autoScore: qEval?.autoScore ?? null,
          maxMarks: qEval?.maxMarks ?? (q.evaluationConfig?.maxMarks || null),
        });
      }

      await tx.responseAnswer.createMany({
        data: answerDataList,
      });

      return createdResponse;
    });

    return NextResponse.json({
      success: true,
      data: {
        responseId: responseRecord.id,
        submittedAt: responseRecord.submittedAt,
        score: evalSummary.normalizedScore,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
