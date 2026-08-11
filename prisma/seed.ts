import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Starting Experience Forms Database Seeding...");

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await db.user.upsert({
    where: { email: "creator@experienceforms.com" },
    update: {},
    create: {
      email: "creator@experienceforms.com",
      name: "Demo Creator",
      passwordHash,
    },
  });
  console.log("👤 Demo Creator User created:", user.email);

  // 2. Create Demo Workspace
  const workspace = await db.workspace.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp Workspace",
      slug: "acme-corp",
      ownerId: user.id,
    },
  });

  await db.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });
  console.log("🏢 Demo Workspace created:", workspace.name);

  // 3. Create Demo Hiring Form
  const hiringForm = await db.form.create({
    data: {
      workspaceId: workspace.id,
      title: "Frontend Developer Application",
      description: "Join Acme Corp as a Senior Frontend Engineer. Interactive application with automatic scoring.",
      slug: "frontend-dev-app",
      type: "HIRING",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  const formVersion = await db.formVersion.create({
    data: {
      formId: hiringForm.id,
      versionNumber: 1,
      schemaJson: "",
    },
  });

  await db.form.update({
    where: { id: hiringForm.id },
    data: { currentVersionId: formVersion.id },
  });

  // Scenes
  const scene1Intro = await db.scene.create({
    data: {
      formVersionId: formVersion.id,
      position: 0,
      type: "INTRO",
      title: "Frontend Developer Application",
      description: "Welcome to Acme Corp! Please complete the following interactive hiring assessment.",
    },
  });

  const scene2Personal = await db.scene.create({
    data: {
      formVersionId: formVersion.id,
      position: 1,
      type: "QUESTION",
      title: "Personal & Contact Information",
      description: "Tell us a bit about yourself.",
    },
  });

  const scene3Tech = await db.scene.create({
    data: {
      formVersionId: formVersion.id,
      position: 2,
      type: "QUESTION",
      title: "Technical Knowledge Assessment",
      description: "Answer these core engineering questions.",
    },
  });

  const scene4DevExp = await db.scene.create({
    data: {
      formVersionId: formVersion.id,
      position: 3,
      type: "QUESTION",
      title: "Frontend Specialty Details",
      description: "Provide your portfolio links and resume.",
    },
  });

  const scene5ProblemSolving = await db.scene.create({
    data: {
      formVersionId: formVersion.id,
      position: 4,
      type: "QUESTION",
      title: "Problem Solving & Background",
      description: "Detailed subjective questions evaluated by our team.",
    },
  });

  const scene6Ending = await db.scene.create({
    data: {
      formVersionId: formVersion.id,
      position: 5,
      type: "ENDING",
      title: "Application Submitted Successfully!",
      description: "Thank you for applying to Acme Corp. Our hiring team will review your application shortly.",
    },
  });

  // Questions
  // Q1: Name
  const q1 = await db.question.create({
    data: {
      sceneId: scene2Personal.id,
      position: 0,
      type: "SHORT_TEXT",
      label: "Full Name",
      description: "Enter your first and last name.",
      required: true,
    },
  });

  // Q2: Email
  const q2 = await db.question.create({
    data: {
      sceneId: scene2Personal.id,
      position: 1,
      type: "EMAIL",
      label: "Email Address",
      description: "We will contact you via this email.",
      required: true,
    },
  });

  // Q3: Primary Specialty
  const q3 = await db.question.create({
    data: {
      sceneId: scene2Personal.id,
      position: 2,
      type: "SINGLE_CHOICE",
      label: "What is your primary engineering specialty?",
      required: true,
      options: {
        create: [
          { label: "Frontend Developer", value: "Frontend", position: 0 },
          { label: "Backend Developer", value: "Backend", position: 1 },
          { label: "Fullstack Engineer", value: "Fullstack", position: 2 },
          { label: "UI/UX Designer", value: "Design", position: 3 },
        ],
      },
    },
  });

  // Q4: MCQ PostgreSQL
  const q4 = await db.question.create({
    data: {
      sceneId: scene3Tech.id,
      position: 0,
      type: "SINGLE_CHOICE",
      label: "What is the primary role of PostgreSQL in a Next.js application stack?",
      required: true,
      options: {
        create: [
          { label: "Relational Database", value: "Relational Database", position: 0 },
          { label: "CSS Framework", value: "CSS Framework", position: 1 },
          { label: "In-Memory Cache", value: "In-Memory Cache", position: 2 },
          { label: "State Management Library", value: "State Management Library", position: 3 },
        ],
      },
      evaluationConfigJson: JSON.stringify({
        enabled: true,
        maxMarks: 20,
        weight: 20,
        method: "AUTOMATIC",
        correctAnswer: "Relational Database",
      }),
    },
  });

  // Q5: Yes/No React
  const q5 = await db.question.create({
    data: {
      sceneId: scene3Tech.id,
      position: 1,
      type: "YES_NO",
      label: "Do you have 3+ years of professional hands-on experience with React & TypeScript?",
      required: true,
      evaluationConfigJson: JSON.stringify({
        enabled: true,
        maxMarks: 20,
        weight: 20,
        method: "AUTOMATIC",
        correctAnswer: "Yes",
      }),
    },
  });

  // Q6: MCQ State Management
  const q6 = await db.question.create({
    data: {
      sceneId: scene3Tech.id,
      position: 2,
      type: "MULTIPLE_CHOICE",
      label: "Select all state management solutions you are comfortable using:",
      required: true,
      options: {
        create: [
          { label: "React Context API", value: "React Context", position: 0 },
          { label: "Redux Toolkit", value: "Redux", position: 1 },
          { label: "Zustand", value: "Zustand", position: 2 },
          { label: "Jotai", value: "Jotai", position: 3 },
        ],
      },
      evaluationConfigJson: JSON.stringify({
        enabled: true,
        maxMarks: 20,
        weight: 20,
        method: "AUTOMATIC",
        correctAnswer: ["React Context", "Zustand"],
      }),
    },
  });

  // Q7: URL GitHub
  const q7 = await db.question.create({
    data: {
      sceneId: scene4DevExp.id,
      position: 0,
      type: "URL",
      label: "GitHub Profile or Portfolio URL",
      description: "Provide a link to your code samples or live projects.",
      required: true,
    },
  });

  // Q8: Resume Upload
  const q8 = await db.question.create({
    data: {
      sceneId: scene4DevExp.id,
      position: 1,
      type: "FILE",
      label: "Resume Upload (PDF / DOCX)",
      required: true,
    },
  });

  // Q9: Debugging Long Text
  const q9 = await db.question.create({
    data: {
      sceneId: scene5ProblemSolving.id,
      position: 0,
      type: "LONG_TEXT",
      label: "Describe a complex React state or performance bug you solved and your debugging process.",
      required: true,
      evaluationConfigJson: JSON.stringify({
        enabled: true,
        maxMarks: 20,
        weight: 20,
        method: "MANUAL",
      }),
    },
  });

  // Q10: Why us Long Text
  const q10 = await db.question.create({
    data: {
      sceneId: scene5ProblemSolving.id,
      position: 1,
      type: "LONG_TEXT",
      label: "Why do you want to work with us at Acme Corp?",
      required: true,
      evaluationConfigJson: JSON.stringify({
        enabled: true,
        maxMarks: 20,
        weight: 20,
        method: "MANUAL",
      }),
    },
  });

  // Logic Rule: IF Specialty EQUALS Frontend THEN SHOW Scene 4 (Frontend Specialty Details)
  await db.logicRule.create({
    data: {
      formVersionId: formVersion.id,
      sourceQuestionId: q3.id,
      operator: "EQUALS",
      comparisonValue: "Frontend",
      action: "SHOW_SCENE",
      targetSceneId: scene4DevExp.id,
    },
  });

  console.log("📋 Demo Hiring Form Created with 6 Scenes, 10 Questions, and 1 Logic Rule.");

  // 4. Create 5 Candidate Responses
  const candidatesData = [
    {
      name: "Alok Singh",
      email: "alok@example.com",
      specialty: "Frontend",
      q4Val: "Relational Database",
      q5Val: "Yes",
      q6Val: ["React Context", "Zustand"],
      url: "https://github.com/aloksingh-dev",
      resume: { fileId: "f_101", originalName: "Alok_Singh_Resume.pdf", size: 450000, url: "/uploads/sample_resume.pdf" },
      q9Val: "Diagnosed infinite render loop caused by unstable object reference in useEffect dependency array. Replaced with useMemo and custom equality check.",
      q10Val: "Impressed by Acme Corp's engineering culture and focus on interactive user experience platforms.",
      manualScoreQ9: 20,
      manualScoreQ10: 18,
      status: "SHORTLISTED",
      note: "Top candidate. Excellent React architecture explanation.",
    },
    {
      name: "Sarah Jenkins",
      email: "sarah@example.com",
      specialty: "Frontend",
      q4Val: "Relational Database",
      q5Val: "Yes",
      q6Val: ["React Context"],
      url: "https://github.com/sjenkins-code",
      resume: { fileId: "f_102", originalName: "Sarah_Jenkins_CV.pdf", size: 520000, url: "/uploads/sample_resume.pdf" },
      q9Val: "Optimized a large table with 10k rows using Virtualization (react-window).",
      q10Val: "Passionate about building fast web applications.",
      manualScoreQ9: 18,
      manualScoreQ10: 15,
      status: "REVIEWING",
      note: "Strong frontend fundamentals.",
    },
    {
      name: "David Miller",
      email: "david@example.com",
      specialty: "Fullstack",
      q4Val: "Relational Database",
      q5Val: "No",
      q6Val: ["Redux"],
      url: "https://github.com/dmiller-fs",
      resume: { fileId: "f_103", originalName: "David_Miller_Resume.pdf", size: 310000, url: "/uploads/sample_resume.pdf" },
      q9Val: "Fixed memory leak in WebSocket connection pool.",
      q10Val: "Looking for a fast-paced environment.",
      manualScoreQ9: 12,
      manualScoreQ10: 12,
      status: "NEW",
      note: "",
    },
    {
      name: "Emily Chen",
      email: "emily@example.com",
      specialty: "Frontend",
      q4Val: "CSS Framework",
      q5Val: "Yes",
      q6Val: ["React Context", "Zustand"],
      url: "https://github.com/echen-ui",
      resume: { fileId: "f_104", originalName: "Emily_Chen_Portfolio.pdf", size: 610000, url: "/uploads/sample_resume.pdf" },
      q9Val: "Debounced user search input to eliminate excessive API calls.",
      q10Val: "Loved the product vision.",
      manualScoreQ9: 15,
      manualScoreQ10: 14,
      status: "ON_HOLD",
      note: "Great candidate but waiting for secondary interview slot.",
    },
    {
      name: "Michael Brown",
      email: "michael@example.com",
      specialty: "Backend",
      q4Val: "In-Memory Cache",
      q5Val: "No",
      q6Val: ["Redux"],
      url: "https://github.com/mbrown-be",
      resume: { fileId: "f_105", originalName: "Michael_Brown_CV.pdf", size: 400000, url: "/uploads/sample_resume.pdf" },
      q9Val: "N/A",
      q10Val: "Testing application.",
      manualScoreQ9: 5,
      manualScoreQ10: 5,
      status: "REJECTED",
      note: "Does not meet minimum frontend experience requirements.",
    },
  ];

  for (const c of candidatesData) {
    // Calculate auto score & normalized score
    let totalScore = 0;
    // Q4: 20 if match
    const q4Score = c.q4Val === "Relational Database" ? 20 : 0;
    // Q5: 20 if Yes
    const q5Score = c.q5Val === "Yes" ? 20 : 0;
    // Q6: 20 if exact match ["React Context", "Zustand"]
    const q6Exact = Array.isArray(c.q6Val) && c.q6Val.includes("React Context") && c.q6Val.includes("Zustand");
    const q6Score = q6Exact ? 20 : 10;

    const autoTotal = q4Score + q5Score + q6Score;
    const manualTotal = c.manualScoreQ9 + c.manualScoreQ10;
    totalScore = autoTotal + manualTotal; // Out of 100 max marks

    const response = await db.response.create({
      data: {
        formId: hiringForm.id,
        formVersionId: formVersion.id,
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        status: "SUBMITTED",
        submittedAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)),
        totalScore,
        maxScore: 100,
        normalizedScore: totalScore,
        candidateStatus: c.status,
      },
    });

    const answersList = [
      { questionId: q1.id, valueJson: JSON.stringify(c.name) },
      { questionId: q2.id, valueJson: JSON.stringify(c.email) },
      { questionId: q3.id, valueJson: JSON.stringify(c.specialty) },
      { questionId: q4.id, valueJson: JSON.stringify(c.q4Val), autoScore: q4Score, maxMarks: 20 },
      { questionId: q5.id, valueJson: JSON.stringify(c.q5Val), autoScore: q5Score, maxMarks: 20 },
      { questionId: q6.id, valueJson: JSON.stringify(c.q6Val), autoScore: q6Score, maxMarks: 20 },
      { questionId: q7.id, valueJson: JSON.stringify(c.url) },
      { questionId: q8.id, valueJson: JSON.stringify(c.resume) },
      { questionId: q9.id, valueJson: JSON.stringify(c.q9Val), manualScore: c.manualScoreQ9, maxMarks: 20 },
      { questionId: q10.id, valueJson: JSON.stringify(c.q10Val), manualScore: c.manualScoreQ10, maxMarks: 20 },
    ];

    await db.responseAnswer.createMany({
      data: answersList.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        valueJson: a.valueJson,
        autoScore: a.autoScore || null,
        manualScore: a.manualScore || null,
        maxMarks: a.maxMarks || null,
      })),
    });

    if (c.note) {
      await db.reviewNote.create({
        data: {
          responseId: response.id,
          authorId: user.id,
          content: c.note,
        },
      });
    }
  }

  console.log("👥 5 Demo Candidate Submissions with scores and review notes created.");

  // 5. Create Demo Survey Form
  await db.form.create({
    data: {
      workspaceId: workspace.id,
      title: "Product Feedback & Feature Priority Survey",
      description: "Collect user feedback on upcoming features and general satisfaction.",
      slug: "product-feedback-survey",
      type: "SURVEY",
      status: "DRAFT",
    },
  });

  console.log("🎉 Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
