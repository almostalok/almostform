import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";
import { PAGINATION_DEFAULTS } from "@/lib/constants";

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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || `${PAGINATION_DEFAULTS.DEFAULT_PAGE}`);
    const pageSize = parseInt(url.searchParams.get("pageSize") || `${PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE}`);
    const statusFilter = url.searchParams.get("status");
    const candidateStatusFilter = url.searchParams.get("candidateStatus");
    const searchQuery = url.searchParams.get("search");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = { formId: params.formId };

    if (statusFilter) {
      where.status = statusFilter;
    }
    if (candidateStatusFilter) {
      where.candidateStatus = candidateStatusFilter;
    }

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === "score" || sortBy === "normalizedScore") {
      orderBy = { normalizedScore: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const totalResponses = await db.response.count({ where });

    const responses = await db.response.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        answers: {
          include: { question: true },
        },
        reviewNotes: {
          include: { author: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Format rows with map of answers
    const rows = responses.map((r) => {
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
        status: r.status,
        submittedAt: r.submittedAt,
        totalScore: r.totalScore,
        maxScore: r.maxScore,
        normalizedScore: r.normalizedScore,
        candidateStatus: r.candidateStatus,
        answers: answersMap,
        rawAnswers: r.answers,
        reviewNotes: r.reviewNotes,
      };
    });

    // Filter by search query across text answers if specified
    let filteredRows = rows;
    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      filteredRows = rows.filter((r) => {
        for (const qId in r.answers) {
          const val = r.answers[qId];
          if (val && JSON.stringify(val).toLowerCase().includes(q)) {
            return true;
          }
        }
        return false;
      });
    }

    // Extract ordered questions for spreadsheet column headers
    const questionsList = schema.scenes.flatMap((s) => s.questions).sort((a, b) => a.position - b.position);

    return NextResponse.json({
      success: true,
      data: {
        formTitle: schema.metadata.title,
        formType: schema.metadata.type,
        questions: questionsList,
        responses: filteredRows,
        pagination: {
          page,
          pageSize,
          totalResponses,
          totalPages: Math.ceil(totalResponses / pageSize),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
