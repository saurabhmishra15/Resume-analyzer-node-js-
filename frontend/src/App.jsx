import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFeedback("");
    setError("");
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a resume PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("http://https://resume-analyzer-node-js.onrender.com/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      const responseText = await res.text();

console.log("BACKEND STATUS:", res.status);
console.log("BACKEND RESPONSE:", responseText);

let data;

try {
  data = JSON.parse(responseText);
} catch (err) {
  throw new Error(`Backend response: ${responseText}`);
}

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }

      setFeedback(data.feedback || data.analysis || "No feedback received.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScore = () => {
    const match = feedback.match(/(\d+(?:\.\d+)?)\s*\/\s*10/i);
    return match ? parseFloat(match[1]) : null;
  };

  const score = getScore();

  const scoreColor =
    score === null
      ? "#64748b"
      : score >= 7
      ? "#16a34a"
      : score >= 5
      ? "#f59e0b"
      : "#dc2626";

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">AI</span>
          <h1>Resume Analyzer</h1>
        </div>
        <p className="subtitle">
          Upload your resume and get instant AI-powered ATS feedback
        </p>
      </header>

      <main className="container">
        <section className="upload-card">
          <div className="upload-area">
            <div className="upload-icon">📄</div>
            <h2>Upload Resume</h2>
            <p>PDF file only</p>

            <label className="file-button">
              Choose PDF
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />
            </label>

            {file && (
              <div className="selected-file">
                <span>✅</span>
                <p>{file.name}</p>
              </div>
            )}

            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={loading || !file}
            >
              {loading ? "Analyzing..." : "Analyze Resume"}
            </button>

            {error && <p className="error">{error}</p>}
          </div>
        </section>

        {loading && (
          <section className="loading-card">
            <div className="spinner"></div>
            <p>Analyzing your resume with AI...</p>
          </section>
        )}

        {feedback && !loading && (
          <section className="result-card">
            <div className="score-card" style={{ borderColor: scoreColor }}>
              <p className="score-label">ATS Score</p>
              <h2 className="score-value" style={{ color: scoreColor }}>
                {score !== null ? `${score}/10` : "AI Feedback"}
              </h2>
            </div>

            <div className="feedback-box">
              <pre>{feedback}</pre>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Built with React, Node.js, Express & Gemini AI</p>
      </footer>
    </div>
  );
}

export default App;