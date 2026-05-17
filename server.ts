import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/evaluate", async (req, res) => {
    try {
      const { caseText, framework, customRubric } = req.body;
      if (!caseText || !framework) {
        return res.status(400).json({ error: "Missing caseText or framework" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an expert McKinsey/Bain/BCG management consulting principal grading a candidate's case interview framework.

Case prompt:
${caseText}

Internal Grading Rubric / Knowledge Base for this specific case:
${customRubric || "No specific rubric provided. Use standard consulting case logic."}

Candidate's Initial Framework:
${framework}

Task:
1. Identify if the framework is Mutually Exclusive, Collectively Exhaustive (MECE). Explain briefly.
2. Highlight exactly ONE specific "missing bucket" or major category that the candidate forgot, which is critical to solving the prompt.
3. Provide a Consulting Grade (S, A, B, or C). Provide 'S' for exceptional/genius, 'A' for great, 'B' for okay/missing some stuff, 'C' for bad.
4. Give brief, actionable feedback.

Respond purely as a JSON object matching this schema.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isMECE: {
                type: Type.BOOLEAN,
                description: "Whether the framework is reasonably MECE."
              },
              meceExplanation: {
                type: Type.STRING,
                description: "Brief explanation of MECE grading."
              },
              missingBucket: {
                type: Type.STRING,
                description: "One specific missing bucket the student forgot."
              },
              grade: {
                type: Type.STRING,
                description: "The grade: 'S', 'A', 'B', or 'C'.",
              },
              feedback: {
                type: Type.STRING,
                description: "Brief, actionable feedback."
              }
            },
            required: ["isMECE", "meceExplanation", "missingBucket", "grade", "feedback"]
          }
        }
      });

      const text = response.text;
      if (!text) {
         return res.status(500).json({ error: "AI returned empty text" });
      }

      const json = JSON.parse(text);
      res.json(json);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to evaluating framework" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
