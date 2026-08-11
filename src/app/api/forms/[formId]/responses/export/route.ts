import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";
import { exportResponsesToCsv } from "@/lib/exports/export-responses-to-csv";

export async function GET(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const schema = await getFormRuntimeSchema(params.formId);
    if (!schema) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    if (schema.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "No workspace access" } }, { status: 403 });
    }

    const responses = await db.response.findMany({
      where: { formId: params.formId },
      orderBy: { createdAt: "desc" },
      include: { answers: true },
    });

    const exportRows = responses.map((r) => {
      const answersMap: Record<string, any> = {};
      for (const a of r.answers) {
        try {
          answersMap[a.questionId] = JSON.parse(a.valueJson);
        } catch {
          answersMap[a.questionId] = a.valueJson;
        }
      }
      return {
        id: r.id,
        sessionId: r.sessionId,
        submittedAt: r.submittedAt,
        score: r.totalScore,
        normalizedScore: r.normalizedScore,
        candidateStatus: r.candidateStatus,
        answers: answersMap,
      };
    });

    const questionsList = schema.scenes.flatMap((s) => s.questions).sort((a, b) => a.position - b.position);

    const csvContent = exportResponsesToCsv(questionsList, exportRows, schema.metadata.type === "HIRING");

    const fileName = `${schema.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_responses_${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
