import express from "express";
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
