import fs from "fs";
import path from "path";

const files = {
  "backend/package.json": JSON.stringify({
    name: "resume-analyzer-backend",
    version: "1.0.0",
    type: "module",
    main: "server.js",
    scripts: { dev: "nodemon server.js", start: "node server.js" },
    dependencies: {
      cors: "^2.8.5",
      dotenv: "^16.4.5",
      express: "^4.19.2",
      multer: "^1.4.5-lts.1",
      "pdf-parse": "^1.1.1"
    },
    devDependencies: { nodemon: "^3.1.0" }
  }, null, 2),

  "backend/.env": `PORT=5000
GEMINI_API_KEY=GEMINI_API_KEY
CLIENT_URL=http://localhost:5173
`,

  "backend/server.js": `import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import analyzeRoute from "./routes/analyze.js";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use("/api", analyzeRoute);

app.get("/", (req, res) => res.send("Resume Analyzer API running"));

app.listen(process.env.PORT || 5000, () =>
  console.log("Server running on port " + (process.env.PORT || 5000))
);
`,

  "backend/routes/analyze.js": `import express from "express";
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
  const prompt = \`Analyze this resume for a \${jobRole} role.
Return response in this format:

SCORE: X/10

STRENGTHS:
- point

WEAKNESSES:
- point

MISSING SKILLS:
- skill

IMPROVEMENT SUGGESTIONS:
- suggestion

RESUME:
\${resumeText}\`;

  const response = await fetch(
    \`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${process.env.GEMINI_API_KEY}\`,
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
`,

  "frontend/package.json": JSON.stringify({
    name: "resume-analyzer-frontend",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    dependencies: {
      axios: "^1.7.2",
      react: "^18.3.1",
      "react-dom": "^18.3.1"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.0",
      vite: "^5.3.1"
    }
  }, null, 2),

  "frontend/vite.config.js": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`,

  "frontend/index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Resume Analyzer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,

  "frontend/src/main.jsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
`,

  "frontend/src/index.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, sans-serif; background: #f3f4f6; color: #111827; }
.container { max-width: 800px; margin: 0 auto; padding: 24px; }
.card { background: white; padding: 24px; border-radius: 14px; box-shadow: 0 2px 10px rgba(0,0,0,.08); margin-bottom: 20px; }
h1 { margin-top: 0; }
input, select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #d1d5db; border-radius: 8px; }
button { padding: 12px 18px; border: none; border-radius: 8px; background: #2563eb; color: white; cursor: pointer; }
button:disabled { background: #9ca3af; cursor: not-allowed; }
pre { white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; }
.error { color: #dc2626; }
`,

  "frontend/src/App.jsx": `import { useState } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [jobRole, setJobRole] = useState("Software Developer");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please select a PDF resume");

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobRole", jobRole);

    setLoading(true);
    setError("");
    setResult("");

    try {
      const { data } = await axios.post(
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/analyze-resume",
        formData
      );
      setResult(data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>AI Resume Analyzer</h1>
        <p>Upload your resume and get instant AI-based feedback.</p>

        <form onSubmit={analyze}>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
          <select value={jobRole} onChange={(e) => setJobRole(e.target.value)}>
            <option>Software Developer</option>
            <option>Java Backend Developer</option>
            <option>Full-Stack Developer</option>
            <option>Frontend Developer</option>
            <option>Data Analyst</option>
          </select>
          <button disabled={loading}>{loading ? "Analyzing..." : "Analyze Resume"}</button>
        </form>

        {error && <p className="error">{error}</p>}
      </div>

      {result && (
        <div className="card">
          <h2>AI Feedback</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
`
};

for (const [file, content] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log("Created:", file);
}

console.log("\nDone! backend/.env mein GEMINI_API_KEY paste karo.");
console.log("Backend: cd backend && npm install && npm run dev");
console.log("Frontend: cd frontend && npm install && npm run dev");