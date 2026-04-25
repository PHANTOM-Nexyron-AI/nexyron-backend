const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Home route
app.get("/", (req, res) => {
  res.send("PHANTOM Nexyron AI Backend Running");
});

// 🔍 DuckDuckGo Search (FREE)
async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  let results = [];

  $(".result").each((i, el) => {
    if (i < 5) {
      let snippet = $(el).find(".result__snippet").text();
      let link = $(el).find("a.result__a").attr("href");

      results.push({
        snippet,
        link
      });
    }
  });

  return results;
}

// 🧠 MAIN AI ROUTE
app.post("/ask", async (req, res) => {
  try {
    const query = req.body.query;

    if (!query) {
      return res.json({ answer: "No query provided" });
    }

    let context = "";
    let sources = [];

    // Smart detection
    const needsSearch =
      query.length > 20 ||
      query.toLowerCase().includes("latest") ||
      query.toLowerCase().includes("news");

    // 🔍 Fetch search results if needed
    if (needsSearch) {
      try {
        let results = await searchDuckDuckGo(query);
        context = results.map(r => r.snippet).join("\n");
        sources = results.map(r => r.link);
      } catch (searchErr) {
        console.log("Search Error:", searchErr.message);
      }
    }

    // 🤖 OpenAI call (NEW API - FIXED)
    const ai = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: "gpt-4.1-mini",
        input: `User question: ${query}\n\nContext:\n${context}`
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // ✅ Extract response safely
    const answer =
      ai.data.output?.[0]?.content?.[0]?.text || "No response";

    res.json({
      answer: answer,
      sources: sources
    });

  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);

    res.json({
      answer:
        "Error: " +
        (err.response?.data?.error?.message || err.message)
    });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));