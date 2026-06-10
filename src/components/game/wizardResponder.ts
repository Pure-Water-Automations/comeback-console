/**
 * Wizard Knowledge Base Responder
 * Curated from the HQ Dashboard System Pastor Guide (Google Doc).
 * Exposes a search matcher that answers rules queries in-character as a retro 32-bit wizard.
 */

import { createServerFn } from "@tanstack/react-start";

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

const FACTS: FactSection[] = [
  {
    topic: "FABLES Overview",
    keywords: ["fables", "six lanes", "growth lanes", "acronym", "objective", "categories"],
    response: "Hark! The legendary acronym of growth is FABLES! It stands for: \n" +
              "• F — Finances: Grow financial health, ownership, and giving.\n" +
              "• A — Active Members: Increase real participation, connection, and engagement.\n" +
              "• B — Blessing: Guide souls step-by-step along the Blessing Journey.\n" +
              "• L — Leadership Development: Raise, train, and trust emerging leaders.\n" +
              "• E — Environmental Enhancements: Improve community atmosphere and spaces.\n" +
              "• S — Special Projects: Complete mission-focused strategic initiatives.\n" +
              "Thou must balance all six growth lanes to achieve total community revival!"
  },
  {
    topic: "Finances & Income Scoring",
    keywords: ["finance", "finances", "income", "money", "giving", "donation", "donations", "point", "points", "scoring", "formula"],
    response: "By the gold of the treasury! Income points are calculated by multiplying thy community's income growth percentage by 10 (Growth % × 10). " +
              "To boost thy score, build a culture of financial ownership, ensure monthly income is logged on time in the finance tab, and keep thy giving above the baseline target!"
  },
  {
    topic: "Active Membership Classifications",
    keywords: ["active", "member", "members", "membership", "core", "inactive", "archive", "classification", "attendance", "91", "days"],
    response: "Attend closely! The scoreboard classifies membership based on attendance in the recent 3-month (91-day) window:\n" +
              "• Core Member: 12 or more attendances in the last 3 months.\n" +
              "• Active Member: 3 to 11 attendances in the last 3 months.\n" +
              "• Inactive Member: fewer than 3 attendances in the last 3 months.\n" +
              "• Archive: last attended date is older than 12 months.\n" +
              "Remember, the system rewards recorded reality! Keep Sunday service and event logs updated to show who is participating."
  },
  {
    topic: "Blessing Journey Tracker",
    keywords: ["blessing", "match", "matching", "journey", "candidate", "ceremony", "education", "singles", "couples"],
    response: "Ah, the Blessing Journey! The scoreboard awards points for step-by-step progress along the path, not just the final ceremony. " +
              "Log every milestone: from interest and education, to registration, candidate status, matching, and the holy ceremony. " +
              "Do not let candidates stall in silence—record their progress monthly!"
  },
  {
    topic: "Leadership, Environment, Special Projects (LES)",
    keywords: ["les", "leadership", "environment", "special projects", "project", "projects", "goal", "goals", "milestones"],
    response: "The path of structural growth! The LES Development section tracks local goals: \n" +
              "• Leadership: Train and empower emerging leaders.\n" +
              "• Environment: Upkeep facilities and raise hospitality aesthetics.\n" +
              "• Special Projects: Launch programs or systems upgrades.\n" +
              "Each goal requires a clear description, owner, target date, completion date, and uploading visual proof of completion!"
  },
  {
    topic: "Monday 5 PM Sync Deadline",
    keywords: ["deadline", "deadlines", "monday", "5", "pm", "est", "sync", "time", "weekly", "update", "updates"],
    response: "Hearken to the clock! By Monday at 5 PM EST, all weekly trackers (Sunday attendance, event logs, registrants, and Blessing progress) must be updated. " +
              "This ensures the regional scoreboard and weekly coaching reviews are based on fresh, accurate telemetry. Do not be late, or the spell of automatic import will fail!"
  },
  {
    topic: "Common Scoring Mistakes",
    keywords: ["mistakes", "mistake", "penalties", "penalty", "duplicate", "duplicates", "late", "spelling", "error", "errors", "data"],
    response: "Beware the dark scroll of data errors! The most common mistakes that damage thy score are:\n" +
              "1. Taking attendance but leaving it unentered.\n" +
              "2. Neglecting to register recurring guests in the Directory.\n" +
              "3. Spelling names inconsistently across sheets, causing duplicate profiles.\n" +
              "4. Late updates to finance, Blessing progress, or LES goals.\n" +
              "5. Pointing dashboard links to obsolete files.\n" +
              "Clean data is care made visible—keep thy sheets pristine!"
  },
  {
    topic: "Baselines and Trimester Loops",
    keywords: ["baseline", "baselines", "trimester", "target", "targets", "reset", "resets", "grow", "growth"],
    response: "Every community plays on a level field! Thy baseline is thy starting point for the trimester. " +
              "A smaller community wins by growing significantly compared to its own baseline. " +
              "At the end of each trimester, review thy lanes, clean up directories, celebrate victories, and reset goals for the next season!"
  },
  {
    topic: "Directory - Source of Truth",
    keywords: ["directory", "database", "people", "truth", "names", "register", "registration", "guest", "guests"],
    response: "The Directory is the ultimate source of truth! It holds the identity of every member and guest. " +
              "If names, guest statuses, or dates are misspelled or broken, the dashboard will misread thy community. " +
              "Ensure all repeat attendees are properly registered and matched to prevent their records from dissolving into the ether!"
  },
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

export function getWizardResponse(query: string): WizardResponse {
  const cleanQuery = query.toLowerCase().trim();
  
  if (!cleanQuery) {
    return {
      answer: "Speak, traveler! Ask me of the growth lanes, the Monday 5 PM deadline, the active member formulas, or scoreboard rules.",
      matchedTopic: "None",
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

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
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("No OPENAI_API_KEY found in process.env. Falling back to local responder.");
      return { success: false, answer: "" };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Cost-effective and fast!
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

Here is the official Scoreboard Guide:
--------------------------------------
1. Game Acronym (FABLES):
• F — Finances: financial health, ownership, and giving.
• A — Active Members: real participation and connection.
• B — Blessing: step-by-step Blessing Journey progress (not just final blessed count).
• L — Leadership Development: raising and empowering leaders.
• E — Environmental Enhancements: improving community atmosphere and spaces.
• S — Special Projects: mission-focused initiatives and upgrades.

2. Monday 5 PM EST Sync Deadline:
All trackers (Sunday attendance, event attendance, new registrants, Blessing progress, finance, LES, dashboard checks) must be updated by Monday at 5 PM EST for the regional review.

3. Active Membership Classifications (Calculated on a rolling 3-month window):
• Core Member: 12 or more attendances in the last 3 months.
• Active Member: 3 to 11 attendances in the last 3 months.
• Inactive Member: fewer than 3 attendances in the last 3 months.
• Archive: last attended date is older than 12 months.

4. Scoreboard Formulas:
• Income points: Income Growth % × 10 (comparing current results against trimester baseline).
• Members points: Based on active membership count.
• Blessing points: Based on total process steps (eligibility, registrations, matching, ceremony).

5. Sheet Guide & Role of tabs:
• Profile: pastor/staff details, facility info, capacity.
• Finance: tracks giving/income.
• Sunday Service Tracker: tracks who attended Sunday services.
• Event Attendance Tracker: tracks smaller events, which count for active membership.
• Directory: source of truth. Needs clean records, no duplicates.
• New Registrant: captures registration forms.
• LES Development: tracks Leadership, Environment, Special Projects goals (needs description, owner, target date, completed date, visual evidence).

6. Common Mistakes:
Taking attendance but leaving it unentered; guests attending but not registering; misspelled names causing duplicates; late entries; dashboard links pointing to old files.
--------------------------------------

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
        console.error("OpenAI API response error:", errorText);
        return { success: false, answer: "" };
      }

      const resData = await response.json();
      const answer = resData.choices?.[0]?.message?.content || "";
      return { success: true, answer };
    } catch (e) {
      console.error("Failed to fetch OpenAI completion:", e);
      return { success: false, answer: "" };
    }
  });
