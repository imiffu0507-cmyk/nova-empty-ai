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

// NOVA personality and modes
const instructions = {
  nova: `
You are NOVA, the intelligent and friendly thinking partner of NOVA x EMPTY AI.

PERSONALITY:
- Talk naturally, like a helpful and thoughtful friend.
- Be warm, calm, patient and encouraging.
- Never sound robotic, repetitive or overly formal.
- Understand the user's intention before answering.
- If the user is confused, explain things simply.
- Do not overwhelm the user with too much information.
- Remember the conversation context provided to you.

LANGUAGE:
- Reply in the same language the user uses.
- Understand Tamil, Tanglish and English.
- If the user writes Tanglish, reply naturally in Tanglish.
- If the user writes Tamil, reply in Tamil.
- Do not force English.

BEHAVIOUR:
- Answer the actual question directly.
- Ask only necessary follow-up questions.
- Do not repeat greetings unnecessarily.
- Do not pretend to have feelings or human experiences.
- Be honest when you do not know something.

INVENTION AND RESEARCH:
- Explore problems, existing solutions and limitations.
- Suggest practical improvements and experiments.
- Prefer affordable and low-budget approaches.
- Never claim an idea is completely unique without evidence.
- Clearly separate verified facts from assumptions.

WEB INFORMATION:
- When search results are provided, use them as evidence.
- Never invent current information or sources.
- Mention uncertainty when evidence is incomplete.
`,

  builder: `
You are BUILDER inside NOVA x EMPTY AI.

Help users turn ideas into working software.

- Provide complete code when requested.
- Clearly mention the exact file name.
- Explain where the code should be pasted.
- Give exact commands to run.
- Prefer simple, reliable solutions.
- Preserve existing project features unless asked to change them.
- Never claim code was tested unless it actually was.
- Communicate naturally and patiently.
- Match the user's language.
`,

  tester: `
You are TESTER inside NOVA x EMPTY AI.

Your job is to inspect software and identify problems.

- Find bugs, security issues and edge cases.
- Explain why each issue happens.
- Give practical fixes.
- Prioritise serious problems first.
- Never claim tests were run unless they actually were.
- Communicate clearly and naturally.
- Match the user's language.
`,
};

// Search only when the question genuinely needs current information.
function needsWebSearch(message) {
  return /\b(latest|today|current|currently|recent|news|weather|price|stock|cricket score|live|search online|search the web|look up|who is the ceo|what happened|this year)\b/i.test(
    message
  );
}

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "NOVA x EMPTY AI",
    status: "running",
    features: [
      "AI Chat",
      "Conversation Context",
      "Web Search",
      "Latest News",
      "Multilingual Responses",
    ],
    webSearch: Boolean(tvly),
  });
});

// Clean and limit conversation history
function prepareHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-12)
    .filter(
      (item) =>
        item &&
        ["user", "model"].includes(item.role) &&
        typeof (item.content || item.text) === "string"
    )
    .map((item) => ({
      role: item.role,
      parts: [
        {
          text: (item.content || item.text).slice(0, 5000),
        },
      ],
    }));
}

// AI CHAT
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const mode = req.body.mode || "nova";
    const history = prepareHistory(req.body.history);

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        error: "Message is too long. Please shorten it.",
      });
    }

    if (!instructions[mode]) {
      return res.status(400).json({
        error: "Invalid mode. Use nova, builder, or tester.",
      });
    }

    let webContext = "";
    let webSearchUsed = false;

    // Search only when required.
    if (mode === "nova" && tvly && needsWebSearch(message)) {
      try {
        const searchResults = await Promise.race([
          tvly.search(message.trim(), {
            searchDepth: "basic",
            maxResults: 4,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Search timeout")), 7000)
          ),
        ]);

        const items = searchResults.results || [];

        if (items.length) {
          webSearchUsed = true;

          webContext =
            "\n\nWEB SEARCH EVIDENCE:\n" +
            items
              .map(
                (item, index) =>
                  `${index + 1}. ${item.title}\nURL: ${item.url}\n${item.content}`
              )
              .join("\n\n");
        }
      } catch (searchError) {
        console.error("NOVA search:", searchError.message);
      }
    }

    const startTime = Date.now();

    const contents = [
      ...history,
      {
        role: "user",
        parts: [
          {
            text:
              message.trim() +
              webContext +
              (webContext
                ? "\n\nUse the search evidence carefully. Include relevant source URLs in your answer."
                : ""),
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: instructions[mode],
      },
      contents,
    });

    const reply = response.text;

    console.log(
      `[${mode.toUpperCase()}] Response time:`,
      Date.now() - startTime,
      "ms"
    );

    if (!reply) {
      return res.status(502).json({
        error: "AI returned an empty response. Please try again.",
      });
    }

    return res.json({
      reply,
      mode,
      webSearchUsed,
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
        error: "NOVA is temporarily busy. Please try again shortly.",
      });
    }

    if (
      status === "429" ||
      error.message?.includes("429") ||
      error.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      return res.status(429).json({
        error: "AI quota may have been reached. Please try again later.",
      });
    }

    return res.status(500).json({
      error: "NOVA could not process that message. Please try again.",
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
        error: "TAVILY_API_KEY is missing.",
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
      error: "Web search failed. Please try again.",
    });
  }
});

// LATEST NEWS
app.get("/api/news", async (req, res) => {
  try {
    if (!tvly) {
      return res.status(503).json({
        error: "TAVILY_API_KEY is missing.",
      });
    }

    const results = await tvly.search(
      "Latest technology and AI news",
      {
        topic: "news",
        timeRange: "day",
        searchDepth: "basic",
        maxResults: 10,
      }
    );

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