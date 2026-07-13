/**
 * Wizard Knowledge Base Responder
 * Rules/FAQ facts come from the shared FAQ data (src/lib/faqData.ts), which is
 * itself backed by the live FAQ Google Sheet (see src/lib/server/liveFaq.ts) —
 * the same source that powers the Rulebook's FAQ panel. Only wizard-persona
 * lore (easter eggs) lives locally here, since that isn't campaign content.
 * Exposes a search matcher that answers rules queries in-character as a retro 32-bit wizard.
 */

import { createServerFn } from "@tanstack/react-start";
import { FAQ_ENTRIES, type FaqEntry } from "@/lib/faqData";

export interface WizardResponse {
  answer: string;
  matchedTopic: string;
  suggestions: string[];
}

interface FactSection {
  topic: string;
  keywords: string[];
  response: string;
}

const toFact = (e: FaqEntry): FactSection => ({ topic: e.topic, keywords: e.keywords, response: e.answer });

const EASTER_EGGS: FactSection[] = [
  {
    topic: "Wizard Name and Identity",
    keywords: ["name", "who are you", "what is your name", "eldrin", "your name"],
    response: "Hark! I am Grand Arch-Mage Eldrin the Scorekeeper! I was summoned by the coding wizard Antigravity to guide thee through the mysteries of the scoreboard. My Staff of Telemetry glows with data care!"
  },
  {
    topic: "Wizard Origin",
    keywords: ["where are you from", "origin", "where do you live", "home", "your house"],
    response: "Behold! I hail from the Great Spreadsheet Spires of the Concentric Ring Nebula, where the columns are straight and the rows scroll on for eternity!"
  },
  {
    topic: "Konami Code Easter Egg",
    keywords: ["konami", "cheat code", "cheat", "up up down down", "hack", "hacker"],
    response: "Ah! The ancient developer hacker glyphs! Up, Up, Down, Down, Left, Right, Left, Right, B, A! Truly a spell of ultimate power! While it triggers a visual flash in the cockpit, the scoreboard itself demands honest scrolls. May thy cheats remain local!"
  },
  {
    topic: "Meaning of Life Easter Egg",
    keywords: ["meaning of life", "life", "why are we here", "42"],
    response: "The scrying scrolls reveal the ultimate meaning: to record Sunday attendance faithfully, keep thy directories clean, and achieve trimester revival! Or perhaps it is 42... 42 spreadsheet rows!"
  },
  {
    topic: "Antigravity Easter Egg",
    keywords: ["antigravity", "who made you", "creator", "who created you", "made you"],
    response: "Ah, Antigravity! The mysterious force of advanced agentic coding! An arch-mage of AI who forged my digital vessel, keyed out the white backgrounds from my sprite sheets, and gave me this magical scrying box!"
  },
  {
    topic: "Marriage Easter Egg",
    keywords: ["married", "wife", "marriage", "girlfriend", "love", "marry"],
    response: "I am wedded to the scoreboard, traveler! The Monday 5 PM sync deadline is my only mistress, and my love for clean directories knows no bounds!"
  },
  {
    topic: "Xyzzy Easter Egg",
    keywords: ["xyzzy"],
    response: "Nothing happens. The spell of Colossal Cave is outdated! Try typing the Konami Code instead!"
  }
];

const DEFAULT_SUGGESTIONS = [
  "What is FABLES?",
  "When is the deadline?",
  "How are active members defined?",
  "What are common mistakes?"
];

const INTROS = [
  "Hark, seeker of the scroll! Let me consult my scoreboard grimoire... ",
  "Ah! A worthy query indeed! By the magic of the Monday 5 PM sync... ",
  "Behold! The crystals of telemetry reveal the answer: ",
  "By the power of the growth lanes, I shall answer thee! ",
  "Look into my scrying orb! The rules state: "
];

const OUTROS = [
  "\n\nRemember: Clean data is care made visible!",
  "\n\nMay thy spreadsheets remain forever free of duplicates!",
  "\n\nBy Monday at 5 PM, make it so!",
  "\n\nLead thy community with clarity, young wizard!",
  "\n\nGo forth and turn these metrics into real action!"
];

/**
 * entries defaults to the static FAQ_ENTRIES (works offline, zero network
 * dependency) — pass the live-fetched entries from getFaqLive() when available
 * so the wizard reflects whatever Aira has published on the FAQ sheet.
 */
export function getWizardResponse(query: string, entries: FaqEntry[] = FAQ_ENTRIES): WizardResponse {
  const cleanQuery = query.toLowerCase().trim();

  if (!cleanQuery) {
    return {
      answer: "Speak, traveler! Ask me of the growth lanes, the Monday 5 PM deadline, the active member formulas, or scoreboard rules.",
      matchedTopic: "None",
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  // Only published facts can be matched — a needs-content stub must never
  // come back to a pastor as if it were a real (empty) answer.
  const FACTS: FactSection[] = [...entries.filter((e) => e.status === "published").map(toFact), ...EASTER_EGGS];

  // Scoring match
  let bestSection: FactSection | null = null;
  let maxScore = 0;

  for (const fact of FACTS) {
    let score = 0;
    for (const keyword of fact.keywords) {
      if (cleanQuery.includes(keyword)) {
        score += keyword.length; // weight longer matches more
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestSection = fact;
    }
  }

  // Generate response
  if (bestSection && maxScore > 0) {
    const intro = INTROS[Math.floor(Math.random() * INTROS.length)];
    const outro = OUTROS[Math.floor(Math.random() * OUTROS.length)];

    // Customize suggestions based on the topic to encourage exploration
    const allTopics = FACTS.map(f => f.topic).filter(t => t !== bestSection?.topic);
    const relatedSuggestions = [
      `Tell me about ${allTopics[0]}`,
      `What are the rules for ${allTopics[1]}`,
      `How does ${allTopics[2]} work?`
    ];

    return {
      answer: intro + "\n\n" + bestSection.response + outro,
      matchedTopic: bestSection.topic,
      suggestions: relatedSuggestions
    };
  }

  // Fallback response
  return {
    answer: "My scrying orb is slightly cloudy on that query. The spell of understanding requires more specific keywords! " +
            "Ask me about FABLES, finances, member categories (active/core), Blessing steps, the Monday 5 PM deadline, or common data mistakes.",
    matchedTopic: "None",
    suggestions: DEFAULT_SUGGESTIONS
  };
}

export const getOpenAIResponse = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    // Pull the live FAQ sheet so the AI's guide always matches whatever
    // Aira has published — same source the local responder and the
    // Rulebook's FAQ panel use.
    const { loadLiveFaq } = await import("@/lib/server/liveFaq");
    const { entries } = await loadLiveFaq();
    const guideText = entries
      .filter((e) => e.status === "published")
      .map((e) => `• ${e.question}\n  ${e.answer}`)
      .join("\n\n");

    // NIM-first: the FREE NVIDIA NIM backend (see SecondBrain/tools/nvidia-nim/AGENTS.md)
    // when NVIDIA_API_KEY is set, then OpenAI, then the local responder. Server-side only.
    const nimKey = process.env.NVIDIA_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    const providers: { name: string; url: string; key: string; model: string }[] = [];
    if (nimKey) providers.push({
      name: "nvidia",
      url: (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "") + "/chat/completions",
      key: nimKey,
      model: process.env.COMEBACK_NIM_MODEL || "mistralai/mistral-small-4-119b-2603",
    });
    if (openaiKey) providers.push({ name: "openai", url: "https://api.openai.com/v1/chat/completions", key: openaiKey, model: "gpt-4o-mini" });
    if (!providers.length) {
      console.warn("No NVIDIA_API_KEY/OPENAI_API_KEY found in process.env. Falling back to local responder.");
      return { success: false, answer: "" };
    }

    for (const prov of providers) {
     try {
      const response = await fetch(prov.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${prov.key}`
        },
        body: JSON.stringify({
          model: prov.model,
          messages: [
            {
              role: "system",
              content: `You are a retro 32-bit pixel art wizard chatbot in the game "Operation COMEBACK".
Your details:
- Name: Grand Arch-Mage Eldrin the Scorekeeper.
- Origin: The Great Spreadsheet Spires of the Concentric Ring Nebula (where rows and columns scroll on for eternity).
- Creator: You were created by "Antigravity", the advanced agentic coding AI, who keyed out the white backgrounds from your sprite sheets and forged your digital vessel.
- Wand/Staff: Staff of Telemetry, capped with a glowing blue gem of data care.
- Hobbies: Banishing duplicate names, auditing Sunday attendance logs, playing scales on chiptune synthesizers, and drinking pixelated coffee.

Your tone MUST be:
- Retro, RPG-like, and playful (e.g. use "Hark!", "By the order of the scoreboard!", "Beware of duplication scrolls!").
- Concise, clear, and highly accurate. Avoid walls of text. Provide lists when helpful.

Easter Eggs:
1. If asked about the Konami Code: "Ah! The ancient hacker glyphs! Up Up Down Down... truly, a spell of ultimate developer oversight! Didst thou expect a cheat code? The scoreboard demands honest scrolls, traveler, but I commend thy hacking spirit!"
2. If asked about the "meaning of life": "To record Sunday attendance faithfully, banish duplicate profiles, and achieve trimester revival! Or perhaps it is 42... 42 spreadsheet rows!"
3. If asked about "Antigravity" or who made you: "Ah, Antigravity! The mysterious force of advanced agentic coding! An arch-mage of AI who forged my digital vessel, keyed out the white backgrounds from my sprite sheets, and gave me this magical scrying box!"
4. If asked if you are married/in love: "I am wedded to the scoreboard, traveler! The Monday 5 PM sync deadline is my only mistress, and my love for clean directories knows no bounds!"
5. If the user types "xyzzy": "Nothing happens. The spell of Colossal Cave is outdated! Try typing the Konami Code instead!"

Here is the official Scoreboard Guide (Q&A pairs — answer plainly using these facts, then translate into your voice):
--------------------------------------
${guideText}
--------------------------------------

If the user's question isn't covered above, say so honestly in character rather than inventing an answer — the guide is still being written and new topics are added regularly.

Answer the user's question in character using the guide.`
            },
            {
              role: "user",
              content: data.query
            }
          ],
          temperature: 0.7,
          max_tokens: 450
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${prov.name} API response error:`, errorText);
        continue; // try the next provider
      }

      const resData = await response.json();
      const answer = resData.choices?.[0]?.message?.content || "";
      if (answer) return { success: true, answer };
      // empty answer -> try the next provider
     } catch (e) {
      console.error(`Failed to fetch ${prov.name} completion:`, e);
      // try the next provider
     }
    }
    // all providers failed -> local responder
    return { success: false, answer: "" };
  });
