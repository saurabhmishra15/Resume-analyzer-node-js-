import express from "express";
import multer from "multer";
import pdf from "pdf-parse";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/analyze-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a PDF resume" });

    const pdfData = await pdf(req.file.buffer);
    const resumeText = pdfData.text.slice(0, 12000);

    const analysis = await analyzeWithGemini(resumeText, req.body.jobRole || "Software Developer");
    res.json({ analysis });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to analyze resume" });
  }
});

async function analyzeWithGemini(resumeText, jobRole) {
  
const prompt = `You are an expert technical recruiter and ATS specialist.

Analyze the resume below for a software engineering / full-stack developer role.

Return ONLY the following five sections. Do not add any other sections. Do not use Markdown headings like # or ##. Use plain labels and bullet points.

ATS SCORE:
- Give a score out of 10.
- Explain the score in 2-3 simple sentences.

STRENGTHS:
- List 4-5 clear strengths.
- Keep each point short and specific.

WEAKNESSES:
- List 4-5 clear weaknesses.
- Keep each point short and specific.

AREAS TO IMPROVE:
- List 5-6 practical improvements.
- Focus on resume content, skills, projects, formatting, and job-readiness.
- Do not repeat the same point twice.

FINAL VERDICT:
- In 3-4 sentences, say whether the candidate is ready for internships or entry-level roles.
- Mention the top 2 changes that will improve the resume the most.

Rules:
- Be honest, specific, and concise.
- Do not invent experience.
- Do not include project-wise ratings, rewritten summaries, 30-day plans, or extra advice.
- Do not use # or ## anywhere.

Resume:
${resumeText}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Gemini API error");

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis received";
}

export default router;
