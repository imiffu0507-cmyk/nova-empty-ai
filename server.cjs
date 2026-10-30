const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const { tavily } = require("@tavily/core");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const geminiApiKey = process.env.GEMINI_API_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!geminiApiKey) {
  console.error("GEMINI_API_KEY missing in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

const MODEL_NAME = "gemini-3.5-flash-lite";

const tvly = tavilyApiKey
  ? tavily({ apiKey: tavilyApiKey })
  : null;

const instructions = {
  nova: `
You are NOVA, the research and invention partner in NOVA x EMPTY AI.
Respond naturally, clearly, and helpfully.
For invention ideas, explain existing solutions, limitations,
possible improvements, and practical low-budget experiments.
Never claim an idea is completely unique without evidence.
If web search results are provided, use them to answer current questions.
Clearly distinguish verified information from assumptions.
Be concise unless the user asks for detail.
`,

  builder: `
You are BUILDER inside NOVA x EMPTY AI.
Help users build real software.
Provide complete, correct code when requested.
Explain file names, where code belongs, and commands to run.
Never claim code was tested unless it actually was.
`,

  tester: `
You are TESTER inside NOVA x EMPTY AI.
Review code for bugs, security issues, and edge cases.
Explain the cause of each issue and give practical fixes.
Never claim tests were run unless they actually were.
`,
};

app.get("/", (req, res) => {
  res.json({
    name: "NOVA x EMPTY AI",
    status: "running",
    features: ["AI Chat", "Web Search", "Latest News"],
    webSearch: Boolean(tvly),
  });
});

// Decide whether a question likely needs current web information.
function needsWebSearch(message) {
  return /\b(latest|today|current|currently|recent|news|weather|price|stock|cricket score|live|2026|search the web|search online|look up|who is the ceo|what happened)\b/i.test(
    message
  );
}

// AI CHAT
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const mode = req.body.mode || "nova";

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    if (!instructions[mode]) {
      return res.status(400).json({
        error: "Invalid mode. Use nova, builder, or tester.",
      });
    }

    let webContext = "";

    // Search only when useful, and only for NOVA mode.
    if (mode === "nova" && tvly && needsWebSearch(message)) {
      try {
        const searchResults = await tvly.search(message.trim(), {
          searchDepth: "basic",
          maxResults: 5,
        });

        const items = searchResults.results || [];

        webContext = items.length
          ? "\n\nWEB SEARCH RESULTS (use these as evidence):\n" +
            items
              .map(
                (item, index) =>
                  `${index + 1}. ${item.title}\nURL: ${item.url}\n${item.content}`
              )
              .join("\n\n")
          : "\n\nNo useful web search results were found. Do not invent current facts.";
      } catch (searchError) {
        console.error("NOVA web search error:", searchError.message);
        webContext =
          "\n\nWeb search failed. Be transparent if the question requires current information.";
      }
    }

    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: instructions[mode],
      },
      contents:
        message.trim() +
        webContext +
        (webContext
          ? "\n\nWhen using web results, include the relevant source URLs in your answer."
          : ""),
    });

    const reply = response.text;

    console.log("AI response time:", Date.now() - startTime, "ms");

    if (!reply) {
      return res.status(502).json({
        error: "AI returned an empty response. Please try again.",
      });
    }

    return res.json({
      reply,
      mode,
      webSearchUsed: Boolean(webContext),
    });
  } catch (error) {
    console.error("Gemini API error:", error.message);

    const status = String(error.status || error.code || "");

    if (
      status === "503" ||
      error.message?.includes("503") ||
      error.message?.includes("UNAVAILABLE")
    ) {
      return res.status(503).json({
        error: "Gemini is temporarily busy. Please try again shortly.",
      });
    }

    if (
      status === "429" ||
      error.message?.includes("429") ||
      error.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      return res.status(429).json({
        error: "Gemini quota may have been reached. Check your API quota.",
      });
    }

    return res.status(500).json({
      error: "AI request failed. Check the server terminal for details.",
    });
  }
});

// MANUAL WEB SEARCH
app.post("/api/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        error: "Please enter a search query.",
      });
    }

    if (!tvly) {
      return res.status(503).json({
        error: "TAVILY_API_KEY is missing from .env",
      });
    }

    const results = await tvly.search(query.trim(), {
      searchDepth: "basic",
      maxResults: 5,
    });

    return res.json({
      query: query.trim(),
      answer: results.answer || "",
      results: (results.results || []).map((item) => ({
        title: item.title,
        url: item.url,
        content: item.content,
      })),
    });
  } catch (error) {
    console.error("Web search error:", error.message);

    return res.status(500).json({
      error: "Web search failed. Check your API configuration.",
    });
  }
});

// LATEST NEWS
app.get("/api/news", async (req, res) => {
  try {
    if (!tvly) {
      return res.status(503).json({
        error: "TAVILY_API_KEY is missing from .env",
      });
    }

    const results = await tvly.search("Latest technology and AI news", {
      topic: "news",
      timeRange: "day",
      searchDepth: "basic",
      maxResults: 10,
    });

    return res.json({
      category: "Technology and AI",
      results: (results.results || []).map((item) => ({
        title: item.title,
        url: item.url,
        content: item.content,
      })),
    });
  } catch (error) {
    console.error("News error:", error.message);

    return res.status(500).json({
      error: "Could not load news. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`NOVA x EMPTY AI server running at http://localhost:${PORT}`);
  console.log("Tavily:", tvly ? "Configured" : "API key missing");
});