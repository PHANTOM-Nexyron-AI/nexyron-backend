const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

// Home route
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

// 🧠 Main AI route
app.post("/ask", async (req, res) => {
  try {
    const query = req.body.query;

    let context = "";
    let sources = [];

    // Smart detection
    const needsSearch =
      query.length > 20 ||
      query.includes("latest") ||
      query.includes("news");

    if (needsSearch) {
      let results = await searchDuckDuckGo(query);

      context = results.map(r => r.snippet).join("\n");
      sources = results.map(r => r.link);
    }

    // 🤖 OpenAI call
    const ai = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: needsSearch
              ? "Answer clearly using sources"
              : "Be a helpful AI assistant"
          },
          {
            role: "user",
            content: query + "\n" + context
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_KEY}`
        }
      }
    );

    res.json({
      answer: ai.data.choices[0].message.content,
      sources: sources
    });

  } catch (err) {
    res.json({ answer: "Error occurred, check backend logs." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));