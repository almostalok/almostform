import { QuestionSchema } from "@/types/form-schema";

export interface ResponseExportRow {
  id: string;
  sessionId: string;
  submittedAt: string | Date | null;
  score: number | null;
  normalizedScore: number | null;
  candidateStatus: string | null;
  answers: Record<string, any>;
}

export function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';

  let str = "";
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      str = val.map((v) => (typeof v === "object" ? v.originalName || v.name || JSON.stringify(v) : v)).join("; ");
    } else if (val.originalName || val.url) {
      str = val.url ? `${val.originalName || "File"} (${val.url})` : val.originalName || "File";
    } else {
      str = JSON.stringify(val);
    }
  } else {
    str = String(val);
  }

  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportResponsesToCsv(
  questions: QuestionSchema[],
  responses: ResponseExportRow[],
  isHiringForm: boolean = false
): string {
  // Build header row
  const headers: string[] = ["Submitted At", "Response ID", "Session ID"];

  // Question headers ordered by position
  const orderedQuestions = [...questions].sort((a, b) => a.position - b.position);
  for (const q of orderedQuestions) {
    headers.push(q.label || `Question ${q.position + 1}`);
  }

  if (isHiringForm) {
    headers.push("Score", "Candidate Status");
  }

  const csvLines: string[] = [];
  csvLines.push(headers.map(escapeCsvField).join(","));

  for (const r of responses) {
    const rowFields: string[] = [];

    // Submitted At
    const dateStr = r.submittedAt
      ? typeof r.submittedAt === "string"
        ? r.submittedAt
        : r.submittedAt.toISOString()
      : "";
    rowFields.push(escapeCsvField(dateStr));
    rowFields.push(escapeCsvField(r.id));
    rowFields.push(escapeCsvField(r.sessionId));

    // Question answers
    for (const q of orderedQuestions) {
      const ansVal = r.answers[q.id];
      rowFields.push(escapeCsvField(ansVal));
    }

    if (isHiringForm) {
      rowFields.push(escapeCsvField(r.normalizedScore !== null ? r.normalizedScore : r.score ?? ""));
      rowFields.push(escapeCsvField(r.candidateStatus ?? "NEW"));
    }

    csvLines.push(rowFields.join(","));
  }

  return csvLines.join("\n");
}
