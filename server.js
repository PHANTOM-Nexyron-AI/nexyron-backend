const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
  res.send("PHANTOM Nexyron AI Backend Running");
});

app.post("/ask", async (req,res)=>{
  try{
    const query = req.body.query;

    let context = "";
    let sources = [];

    // 🔍 Simple smart detection
    const needsSearch =
      query.includes("latest") ||
      query.includes("news") ||
      query.length > 25;

    if(needsSearch){
      const search = await axios.get(
        "https://api.search.brave.com/res/v1/web/search",
        {
          headers:{
            "X-Subscription-Token": process.env.BRAVE_API_KEY
          },
          params:{q:query}
        }
      );

      let results = search.data.web.results.slice(0,5);

      context = results.map(r => r.description).join("\n");
      sources = results.map(r => r.url);
    }

    const ai = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model:"gpt-4o-mini",
        messages:[
          {
            role:"system",
            content: needsSearch
              ? "Answer clearly using sources"
              : "Be a helpful AI assistant"
          },
          {
            role:"user",
            content: query + "\n" + context
          }
        ]
      },
      {
        headers:{
          "Authorization": `Bearer ${process.env.OPENAI_KEY}`
        }
      }
    );

    res.json({
      answer: ai.data.choices[0].message.content,
      sources: sources
    });

  } catch(err){
    res.json({answer:"Error occurred"});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running"));