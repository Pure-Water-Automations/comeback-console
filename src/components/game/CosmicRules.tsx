import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useScroll, useVelocity, useTransform } from "motion/react";
import { Volume2, VolumeX, Play, Pause, HelpCircle, Sparkles, Monitor, Info, Keyboard, Terminal, Trophy, Activity, Timer, Music, Grid, MessageCircleQuestion } from "lucide-react";
import { getFaqLive } from "@/lib/faqApi";
import { FAQ_ENTRIES } from "@/lib/faqData";
import heroImg from "@/assets/sprites/adventurer/adventurer_walking.png";
import heroClipboardImg from "@/assets/sprites/adventurer/adventurer_clipboard.png";
import heroPointingImg from "@/assets/sprites/adventurer/adventurer_pointing.png";
import heroVictoryImg from "@/assets/sprites/adventurer/adventurer_victory.png";
import heroBibleImg from "@/assets/sprites/adventurer/adventurer_bible.png";
import heroPencilImg from "@/assets/sprites/adventurer/adventurer_pencil.png";

import npcWaveImg from "@/assets/sprites/npc/npc_wave.png";
import npcReadingImg from "@/assets/sprites/npc/npc_reading.png";
import npcSaluteImg from "@/assets/sprites/npc/npc_salute.png";
import npcConfusedImg from "@/assets/sprites/npc/npc_confused.png";
import npcWalkingImg from "@/assets/sprites/npc/npc_walking.png";
import npcLoveImg from "@/assets/sprites/npc/npc_love.png";

import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import spiritCalendarImg from "@/assets/sprites/spirit/spirit_calendar.png";
import spiritLoveImg from "@/assets/sprites/spirit/spirit_love.png";
import spiritIdleImg from "@/assets/sprites/spirit/spirit_idle.png";
import spiritSadImg from "@/assets/sprites/spirit/spirit_sad.png";
import spiritWaveImg from "@/assets/sprites/spirit/spirit_wave.png";

import mentorChairImg from "@/assets/sprites/mentor/mentor_chair.png";
import mentorCheerImg from "@/assets/sprites/mentor/mentor_cheer.png";
import mentorLetterImg from "@/assets/sprites/mentor/mentor_letter.png";
import mentorCoffeeImg from "@/assets/sprites/mentor/mentor_coffee.png";
import mentorFullPowerImg from "@/assets/sprites/mentor/mentor_full_power.png";
import mentorIdleImg from "@/assets/sprites/mentor/mentor_idle.png";

import smartGuyPresentingImg from "@/assets/sprites/smart_guy/smart_guy_presenting.png";
import smartGuyBooksImg from "@/assets/sprites/smart_guy/smart_guy_books.png";
import smartGuyScrollImg from "@/assets/sprites/smart_guy/smart_guy_scroll.png";
import smartGuyWritingImg from "@/assets/sprites/smart_guy/smart_guy_writing.png";
import smartGuyHologramImg from "@/assets/sprites/smart_guy/smart_guy_hologram.png";
import smartGuyCheerImg from "@/assets/sprites/smart_guy/smart_guy_cheer.png";

import wizardIdleImg from "@/assets/sprites/wizard/wizard_idle.png";
import wizardTalkingImg from "@/assets/sprites/wizard/wizard_talking.png";
import { getWizardResponse, getOpenAIResponse } from "./wizardResponder";

type Scene = {
  kicker: string;
  title: string;
  subtitle?: string;
  body: string[];
  bullets?: string[];
  badge?: string;
  sprite: string;
  supportSprites?: string[];
};

const scenes: Scene[] = [
  {
    kicker: "Welcome Brief",
    title: "Operation COMEBACK",
    subtitle: "A team-based ministry growth game",
    body: [
      "Every community is invited to grow, revive, strengthen, and win together.",
      "This is not just a reporting system. It is a campaign. The dashboard is your scoreboard. Your community is your team. Your people are the mission.",
      "The score is not the mission. The score is the mirror of the mission.",
    ],
    badge: "Make your comeback",
    sprite: heroImg,
    supportSprites: [spiritGlowImg, mentorCheerImg],
  },
  {
    kicker: "01 · Game Objective",
    title: "FABLES",
    subtitle: "Six main growth lanes",
    body: [
      "The objective is to grow in all six FABLES lanes. A community wins by turning each lane into real action that strengthens people, families, and the mission.",
    ],
    bullets: [
      "F — Finances: financial health, ownership, and giving.",
      "A — Active Members: real participation and connection.",
      "B — Blessing: step-by-step Blessing Journey progress.",
      "L — Leadership Development: raising and empowering leaders.",
      "E — Environmental Enhancements: improving community atmosphere and spaces.",
      "S — Special Projects: mission-focused initiatives and upgrades.",
    ],
    badge: "F · A · B · L · E · S",
    sprite: smartGuyPresentingImg,
    supportSprites: [heroClipboardImg, npcReadingImg],
  },
  {
    kicker: "02 · Playing Field",
    title: "Connected Tools",
    subtitle: "Trackers feed the scoreboard",
    body: [
      "Local ministry activity feeds the local trackers. The local trackers feed the dashboard. The dashboard feeds regional and national scoreboards.",
      "The scoreboards reveal progress, gaps, and opportunities.",
    ],
    bullets: [
      "Directory",
      "Attendance Tracker",
      "Blessing Journey Tracker",
      "LES Development Tracker",
      "Finance Source",
      "Local Dashboard",
      "Regional/National Scoreboard",
    ],
    badge: "Your field notes become your scoreboard",
    sprite: smartGuyScrollImg,
    supportSprites: [spiritCalendarImg, mentorLetterImg],
  },
  {
    kicker: "03 · Your Team",
    title: "No Solo Players",
    subtitle: "Play with local leaders, coordinators, captains, and peers",
    body: [
      "Operation COMEBACK is not designed for solo pastors or isolated leaders.",
      "A dashboard is useful only when it leads to better care, better follow-up, better teamwork, and better mission movement.",
    ],
    bullets: [
      "Record what is happening.",
      "Review what the scoreboard reveals.",
      "Take action based on the people behind the numbers.",
    ],
    badge: "Community is your team",
    sprite: mentorCheerImg,
    supportSprites: [npcWaveImg, heroPointingImg],
  },
  {
    kicker: "04 · Main Score Categories",
    title: "Providential Development",
    subtitle: "The core scoring lanes",
    body: [
      "These lanes show whether the community is becoming financially healthier, more active, and more aligned with the Blessing providence.",
    ],
    bullets: [
      "Donations: financial growth and ownership.",
      "Active Members: real participation, not just names on a list.",
      "Blessing Journey: movement through the Blessing path, step by step.",
    ],
    badge: "Core score",
    sprite: heroClipboardImg,
    supportSprites: [spiritLoveImg, smartGuyBooksImg],
  },
  {
    kicker: "04 · Bonus Development",
    title: "Fresh Momentum",
    subtitle: "Additional lanes that show new energy",
    body: [
      "Bonus development shows that the community is not only maintaining itself but gaining fresh energy.",
    ],
    bullets: [
      "New Registered Members: new people entering the system.",
      "Blessing Registrations: people taking formal steps toward the Blessing.",
      "Special Donations: extra giving beyond normal patterns.",
    ],
    badge: "Momentum lanes",
    sprite: spiritGlowImg,
    supportSprites: [npcSaluteImg, mentorCheerImg],
  },
  {
    kicker: "05 · Win Conditions",
    title: "Grow From Baseline",
    subtitle: "Fair play for every community size",
    body: [
      "A baseline is your starting point for the trimester. A smaller community can win by growing significantly from where it began. A larger community must also show real progress.",
      "The scoreboard shows the outer results. The real win is the inner revival.",
    ],
    bullets: [
      "Guests become active participants.",
      "Inactive members reconnect.",
      "Blessing candidates take their next step.",
      "Leaders are trained and empowered.",
      "The community becomes more joyful, organized, and mission-driven.",
    ],
    badge: "Growth beats size",
    sprite: heroVictoryImg,
    supportSprites: [mentorChairImg, spiritLoveImg],
  },
  {
    kicker: "06 · Rewards",
    title: "Recognition & Investment",
    subtitle: "Celebrate real progress",
    body: [
      "Awards are designed to celebrate real progress, encourage teamwork, and inspire communities to learn from one another.",
      "The best players do not chase rewards alone. They chase mission, and the rewards follow the growth.",
    ],
    bullets: [
      "Team, regional, community, and growth awards.",
      "Triple-Header recognition and public celebration.",
      "Financial investment into communities and leaders.",
    ],
    badge: "Mission first",
    sprite: mentorLetterImg,
    supportSprites: [heroVictoryImg, npcWaveImg],
  },
  {
    kicker: "07 · Core Rules",
    title: "Record What Is Real",
    subtitle: "Unrecorded ministry will not appear on the scoreboard",
    body: [
      "Real ministry must be recorded to count. The Directory is the source of truth. Attendance determines activity.",
      "Guests must be followed up with and registered. Blessing progress should be recorded step by step.",
    ],
    bullets: [
      "Keep names, contact information, guest status, membership status, and Blessing status clean.",
      "Use activity categories such as Core, Active, Inactive, and Archive.",
      "A guest should never disappear into the crowd.",
    ],
    badge: "Data = care made visible",
    sprite: smartGuyBooksImg,
    supportSprites: [npcReadingImg, spiritCalendarImg],
  },
  {
    kicker: "07 · Core Rules Continued",
    title: "Goals, Baselines, Deadlines",
    subtitle: "Turn ideas into accountable action",
    body: [
      "Leadership, environment, and special projects need clear goals. Baselines matter because every trimester asks your community to grow from where it began.",
      "By Monday at 5 PM EST, community data should be updated so weekly reviews are based on current information.",
    ],
    bullets: [
      "Each LES goal needs a description, target date, owner, completion date, and evidence when needed.",
      "Update Sunday attendance, event attendance, registrants, Blessing progress, finance, LES, and dashboard checks.",
      "Every dashboard meeting should end with names, owners, dates, and next actions.",
    ],
    badge: "Monday · 5 PM EST",
    sprite: spiritCalendarImg,
    supportSprites: [heroPointingImg, mentorChairImg],
  },
  {
    kicker: "08 · Weekly Gameplay Loop",
    title: "Review, Assign, Follow Up",
    subtitle: "The weekly coaching huddle",
    body: [
      "After Sunday service and every event, record attendance, add guests, notice repeat participants, and identify follow-up needs.",
      "By Monday at 5 PM EST, confirm the data and review the local dashboard.",
    ],
    bullets: [
      "Study the scoreboard.",
      "Identify the people behind the numbers.",
      "Choose the weakest lane.",
      "Assign next actions.",
      "Follow up before the next Sunday.",
    ],
    badge: "Weekly rhythm",
    sprite: heroClipboardImg,
    supportSprites: [npcSaluteImg, smartGuyScrollImg],
  },
  {
    kicker: "09–10 · Monthly & Trimester Loops",
    title: "Seasonal Play",
    subtitle: "Choose focus, celebrate wins, reset goals",
    body: [
      "Each month, review donation growth, attendance, active and core members, new registered members, Blessing progress, LES progress, and scoreboard standing. Then choose one main focus for the next month.",
      "At the end of each trimester, review the baseline, measure growth, study each lane, celebrate wins, identify weaknesses, clean up data, reset goals, and prepare for the next round.",
    ],
    badge: "Every trimester is a new season",
    sprite: smartGuyPresentingImg,
    supportSprites: [spiritGlowImg, mentorLetterImg],
  },
  {
    kicker: "11 · Common Penalties",
    title: "Avoid Score Damage",
    subtitle: "The easiest improvements often come from clean data",
    body: [
      "These mistakes hurt the score and weaken the system. Avoiding them is one of the easiest ways to improve.",
    ],
    bullets: [
      "Attendance taken but not entered.",
      "Guests attending but not registering.",
      "Duplicate or misspelled names across sheets.",
      "Blessing progress, finance data, or LES updates entered late.",
      "Dashboard links pointing to old files.",
      "Weekly review happening without action steps.",
    ],
    badge: "Clean data, clear leadership",
    sprite: npcReadingImg,
    supportSprites: [spiritCalendarImg, heroPointingImg],
  },
  {
    kicker: "12 · Champion Play",
    title: "Build a Culture",
    subtitle: "Champion communities do not simply fill out spreadsheets",
    body: [
      "Champion communities know their people, record ministry faithfully, follow up quickly, develop leaders, invite guests into relationship, move people through the Blessing path, and turn every number into a next action.",
      "Every data point represents a person, a family, a story, and a possible comeback.",
    ],
    badge: "People behind every number",
    sprite: mentorCheerImg,
    supportSprites: [heroVictoryImg, spiritLoveImg],
  },
  {
    kicker: "13 · Final Mission Brief",
    title: "Campaign for Revival",
    subtitle: "The real victory is a healthier, more active, more loving, more mission-driven community",
    body: [
      "The dashboard is your scoreboard. The trackers are your field notes. The community is your team. The people are the mission. The weekly review is your coaching huddle. The awards are celebration and investment.",
      "Play faithfully. Record honestly. Review weekly. Act quickly. Celebrate progress. Help your community make its comeback.",
    ],
    badge: "COMEBACK",
    sprite: wizardIdleImg,
    supportSprites: [mentorCheerImg, spiritGlowImg, npcWaveImg],
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const CHARACTER_POSES = {
  hero: [
    heroImg,
    heroPencilImg,
    heroClipboardImg,
    heroPointingImg,
    heroBibleImg,
    heroVictoryImg,
  ],
  smart_guy: [
    smartGuyPresentingImg,
    smartGuyWritingImg,
    smartGuyScrollImg,
    smartGuyHologramImg,
    smartGuyBooksImg,
    smartGuyCheerImg,
  ],
  mentor: [
    mentorIdleImg,
    mentorChairImg,
    mentorCoffeeImg,
    mentorLetterImg,
    mentorFullPowerImg,
    mentorCheerImg,
  ],
  spirit: [
    spiritIdleImg,
    spiritGlowImg,
    spiritCalendarImg,
    spiritSadImg,
    spiritWaveImg,
    spiritLoveImg,
  ],
  npc: [
    npcWalkingImg,
    npcConfusedImg,
    npcReadingImg,
    npcSaluteImg,
    npcWaveImg,
    npcLoveImg,
  ],
  wizard: [
    wizardIdleImg,
    wizardTalkingImg,
    wizardIdleImg,
    wizardTalkingImg,
    wizardIdleImg,
    wizardTalkingImg,
  ]
};

const getCharacterType = (baseSprite: string): keyof typeof CHARACTER_POSES => {
  if (baseSprite.includes("wizard")) return "wizard";
  if (baseSprite.includes("adventurer") || baseSprite.includes("hero")) return "hero";
  if (baseSprite.includes("smart_guy")) return "smart_guy";
  if (baseSprite.includes("mentor")) return "mentor";
  if (baseSprite.includes("spirit")) return "spirit";
  if (baseSprite.includes("npc")) return "npc";
  return "hero";
};

const getActivePose = (characterType: keyof typeof CHARACTER_POSES, progress: number) => {
  const poses = CHARACTER_POSES[characterType];
  const index = clamp(Math.floor(progress * poses.length), 0, poses.length - 1);
  return poses[index];
};

const getGlowColor = (index: number) => {
  const colors = [
    "rgba(79, 127, 255, 0.2)",   // 0: Blue
    "rgba(45, 212, 191, 0.2)",   // 1: Teal
    "rgba(234, 179, 8, 0.18)",   // 2: Gold
    "rgba(249, 115, 22, 0.18)",   // 3: Orange
    "rgba(168, 85, 247, 0.2)",   // 4: Purple
    "rgba(236, 72, 153, 0.2)",   // 5: Pink
    "rgba(16, 185, 129, 0.2)",   // 6: Emerald
    "rgba(234, 179, 8, 0.2)",    // 7: Bronze/Gold
    "rgba(14, 165, 233, 0.2)",   // 8: Sky Blue
    "rgba(239, 68, 68, 0.2)",    // 9: Red
    "rgba(132, 204, 22, 0.18)",  // 10: Lime
    "rgba(217, 70, 239, 0.2)",   // 11: Fuchsia
    "rgba(245, 158, 11, 0.2)",   // 12: Warning Amber
    "rgba(244, 63, 94, 0.2)",    // 13: Coral
    "rgba(139, 92, 246, 0.25)",  // 14: Violet
  ];
  return colors[index % colors.length];
};

const CHARACTER_TIPS: Record<keyof typeof CHARACTER_POSES, string[]> = {
  hero: [
    "Let's make our comeback today!",
    "The dashboard is our scoreboard, but our people are the mission.",
    "Let's review the weekly scoreboard. Where can we take action?",
    "Every community is invited to grow, revive, and win together.",
    "Don't play solo! We need to collaborate to win this campaign.",
    "Victory is in sight! Let's check the Blessing Journey progress."
  ],
  smart_guy: [
    "Directory details must be kept clean to ensure accurate telemetry.",
    "Unrecorded ministry does not appear on the scoreboard. Record everything!",
    "By Monday at 5 PM EST, all weekly trackers must be fully updated.",
    "Data is care made visible. Let's make sure no guest disappears into the crowd.",
    "Weekly review is our coaching huddle. Every meeting needs clear action steps.",
    "Check your links! An outdated dashboard sheet hurts our score."
  ],
  mentor: [
    "The score is not the mission. The score is the mirror of the mission.",
    "A smaller community can win by growing significantly from its baseline.",
    "Our real victory is a healthier, more active, more loving community.",
    "Every dashboard meeting should end with names, owners, and clear dates.",
    "Real leaders empower others. Who are you training this trimester?",
    "Celebrate real progress and let the awards follow the growth."
  ],
  spirit: [
    "Keep the fire burning! Joyful energy is contagious.",
    "The real win is the inner revival of our team.",
    "Fresh momentum comes from welcoming new active members.",
    "Let's focus on our weakest lane and turn it into our comeback story.",
    "Every name on that sheet represents a story, a family, and a soul.",
    "Let's step forward on the Blessing Journey together."
  ],
  npc: [
    "Hey! Don't let me get lost in the crowd. Record my attendance!",
    "Are repeat guests being followed up with? Let's check.",
    "I'm ready to take the next step on my Blessing Journey!",
    "Can we update the event attendance before the Monday 5 PM deadline?",
    "I want to join a team project. Let's make it happen!",
    "Is our contact database up to date? Let's verify."
  ],
  wizard: [
    "Hark, traveler! Ask me anything about the rules of the campaign.",
    "By the power of the Monday 5 PM scoreboard, I shall answer thy queries!",
    "Speak thy questions into the scroll of communication.",
    "Behold the ancient scoreboard grimoire!",
    "Keep thy spreadsheets clean and thy duplicates banished!"
  ]
};

const getRandomTip = (characterType: keyof typeof CHARACTER_POSES, sceneIndex: number): string => {
  const tips = CHARACTER_TIPS[characterType] || CHARACTER_TIPS.hero;
  return tips[sceneIndex % tips.length];
};

export function CosmicRules() {
  const [progress, setProgress] = useState(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const targetSceneIndexRef = useRef(0);
  const sceneIndexTimeoutRef = useRef<number | null>(null);
  const isAutoScrollingRef = useRef(false);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crtActive, setCrtActive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [perfMode, setPerfMode] = useState(false);

  const faqQuery = useQuery({ queryKey: ["faq-live"], queryFn: () => getFaqLive() });
  const faqEntries = faqQuery.data?.entries ?? FAQ_ENTRIES;
  const [spriteHovered, setSpriteHovered] = useState(false);
  
  // Interactive particles and trails
  const [clickParticles, setClickParticles] = useState<{ id: number; x: number; y: number; dx: string; dy: string; color: string }[]>([]);
  const [trail, setTrail] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  // 1. Procedural Ambient Music state
  const [musicEnabled, setMusicEnabled] = useState(false);
  // 2. CLI State
  const [cliOpen, setCliOpen] = useState(false);
  const [cliInput, setCliInput] = useState("");
  const [cliHistory, setCliHistory] = useState<string[]>([
    "=== OPERATION COMEBACK TERMINAL v1.0 ===",
    "TYPE 'help' FOR SCIENTIFIC DIAGNOSTICS & TELEMETRY CONTROL.",
    "------------------------------------------------"
  ]);
  // 3. Konami Code State
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);
  // 4. CRT Glitch State & Power Collapse
  const [isGlitching, setIsGlitching] = useState(false);
  const [crtPowerTransition, setCrtPowerTransition] = useState(false);
  // 5. Speech Bubble Typewriter text
  const [typedTip, setTypedTip] = useState("");
  // 6. Achievements State
  const [achievements, setAchievements] = useState<any[]>([
    { id: "cadet", title: "Space Cadet 🚀", desc: "Initiate Operation COMEBACK brief.", unlocked: false },
    { id: "steward", title: "Financial Steward 💰", desc: "Unlock lane finances rules.", unlocked: false },
    { id: "monday", title: "Monday Captain 📅", desc: "Discover Monday 5 PM telemetries.", unlocked: false },
    { id: "victory", title: "Victory Lap 🏆", desc: "Reach the final mission brief.", unlocked: false },
    { id: "konami", title: "Super Hacker 👾", desc: "Unlock Konami developer debug HUD.", unlocked: false },
    { id: "cli", title: "Command Master 💻", desc: "Execute a terminal Command.", unlocked: false }
  ]);
  const [activeToast, setActiveToast] = useState<{ title: string; desc: string } | null>(null);
  // 7. Speedrun Timer State
  const [speedrunActive, setSpeedrunActive] = useState(false);
  const [speedrunStart, setSpeedrunStart] = useState<number | null>(null);
  const [speedrunTime, setSpeedrunTime] = useState(0);
  const [personalBest, setPersonalBest] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("comeback_pb");
      return saved ? parseFloat(saved) : null;
    } catch(e) { return null; }
  });
  // 8. Visual / Stage / Cursor Physics State
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [cursorVel, setCursorVel] = useState(0);
  const [stageGrid, setStageGrid] = useState(true);
  const [stageMode, setStageMode] = useState<"rings" | "vortex" | "radar">("rings");
  const [fps, setFps] = useState(60);
  const [virtualScroll, setVirtualScroll] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);

  // Chatbot State
  const [wizardState, setWizardState] = useState<"idle" | "talking">("idle");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: "user" | "wizard"; text: string; timestamp: string; isTyping?: boolean }[]>([
    {
      sender: "wizard",
      text: "Hark, traveler! I am the 32-bit Wizard of the Scoreboard. Ask me any question about the rules, FABLES growth lanes, active member formulas, Sunday attendance logs, sync deadlines, or common sheet mistakes, and I shall consult the scrying scrolls!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [currentlyTypingIndex, setCurrentlyTypingIndex] = useState<number | null>(null);
  const [typedTextIndex, setTypedTextIndex] = useState(0);

  const chatLogRef = useRef<HTMLDivElement>(null);

  // Content-Themed Animation States
  const [highFiveSpark, setHighFiveSpark] = useState(false);
  const [rewardStars, setRewardStars] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);
  const [penaltyItems, setPenaltyItems] = useState<{ id: number; x: number; text: string; delay: number }[]>([]);
  const [hearts, setHearts] = useState<{ id: number; x: number; delay: number }[]>([]);
  const [floatingScores, setFloatingScores] = useState<{ id: number; x: number; type: "coin" | "heart" | "step"; delay: number }[]>([]);
  const [recordCheckmarks, setRecordCheckmarks] = useState<{ id: number; x: number; type: "check" | "folder"; delay: number }[]>([]);
  const [currentSeason, setCurrentSeason] = useState<"spring" | "summer" | "autumn" | "winter">("spring");
  const [seasonParticles, setSeasonParticles] = useState<{ id: number; x: number; delay: number }[]>([]);

  // Web Audio Context reference
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  
  // Custom Music Loop Refs
  const musicNodesRef = useRef<{
    ctx: AudioContext | null;
    bassOsc: OscillatorNode | null;
    bassGain: GainNode | null;
    chordOscs: OscillatorNode[];
    chordGain: GainNode | null;
    lfo: OscillatorNode | null;
    isPlaying: boolean;
  }>({
    ctx: null,
    bassOsc: null,
    bassGain: null,
    chordOscs: [],
    chordGain: null,
    lfo: null,
    isPlaying: false
  });

  const lastMousePos = useRef({ x: 0, y: 0, time: Date.now() });

  // Derived state (moved to top of component body)
  const activeScene = scenes[activeSceneIndex];
  const sceneProgress = progress * scenes.length - activeSceneIndex;
  const activeGlowColor = getGlowColor(activeSceneIndex);
  const characterType = getCharacterType(activeScene.sprite);
  const activePose = activeSceneIndex === 14
    ? (wizardState === "talking" ? wizardTalkingImg : wizardIdleImg)
    : getActivePose(characterType, sceneProgress);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const startAmbientMusic = () => {
    if (!audioEnabled || !musicEnabled) return;
    const nodes = musicNodesRef.current;
    if (nodes.isPlaying) return;
    
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      
      // Low drone
      bassOsc.type = "sawtooth";
      bassOsc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      bassGain.gain.setValueAtTime(0.008, ctx.currentTime);
      
      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = "lowpass";
      lpFilter.frequency.setValueAtTime(110, ctx.currentTime);
      
      bassOsc.connect(bassGain);
      bassGain.connect(lpFilter);
      lpFilter.connect(ctx.destination);
      bassOsc.start();
      
      // Chords (warm minor chord swell)
      const chordFrequencies = [110, 130.81, 164.81, 196.00]; // A2, C3, E3, G3
      const chordOscs: OscillatorNode[] = [];
      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.004, ctx.currentTime);
      
      chordFrequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(chordGain);
        osc.start();
        chordOscs.push(osc);
      });
      
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.002, ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(chordGain.gain);
      lfo.start();
      
      chordGain.connect(lpFilter);
      
      nodes.ctx = ctx;
      nodes.bassOsc = bassOsc;
      nodes.bassGain = bassGain;
      nodes.chordOscs = chordOscs;
      nodes.chordGain = chordGain;
      nodes.lfo = lfo;
      nodes.isPlaying = true;
    } catch (e) {
      console.error(e);
    }
  };

  const stopAmbientMusic = () => {
    const nodes = musicNodesRef.current;
    if (!nodes.isPlaying) return;
    
    try {
      if (nodes.bassOsc) {
        nodes.bassOsc.stop();
        nodes.bassOsc.disconnect();
      }
      if (nodes.chordOscs.length) {
        nodes.chordOscs.forEach(osc => {
          osc.stop();
          osc.disconnect();
        });
        nodes.chordOscs = [];
      }
      if (nodes.lfo) {
        nodes.lfo.stop();
        nodes.lfo.disconnect();
      }
      nodes.isPlaying = false;
    } catch (e) {
      console.error(e);
    }
  };

  const playSound = (type: "click" | "hover" | "transition" | "sparkle") => {
    if (!audioEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "hover") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.setValueAtTime(650, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "transition") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.02, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      } else if (type === "sparkle") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(900 + Math.random() * 500, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playSoundboardNote = (index: number) => {
    if (!audioEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      const scale = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        392.00, // G4
        440.00, // A4
        493.88, // B4
        523.25, // C5
        587.33, // D5
        659.25  // E5
      ];
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(scale[index % scale.length], ctx.currentTime);
      
      const filter = ctx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(scale[index % scale.length], ctx.currentTime);
      filter.Q.setValueAtTime(1.0, ctx.currentTime);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch(e){}
  };

  const playCharacterSound = (type: keyof typeof CHARACTER_POSES) => {
    if (!audioEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "hero") {
        osc.type = "square";
        osc.frequency.setValueAtTime(330, ctx.currentTime); // E4
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.08); // A4
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.16); // C#5
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "smart_guy") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "mentor") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "spirit") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.02, ctx.currentTime + 0.05);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      } else if (type === "npc") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.06); // D5
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch(e){}
  };

  const unlockAchievement = (id: string) => {
    setAchievements((prev) => {
      return prev.map((a) => {
        if (a.id === id && !a.unlocked) {
          playSound("sparkle");
          setActiveToast({ title: a.title, desc: a.desc });
          setTimeout(() => setActiveToast(null), 4000);
          return { ...a, unlocked: true };
        }
        return a;
      });
    });
  };

  const executeCommand = (fullCmd: string) => {
    unlockAchievement("cli");
    const parts = fullCmd.trim().split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];
    
    let response = "";
    
    switch (cmd) {
      case "help":
        response = "Available commands: help || crt || audio || music || next || prev || goto <index> || speedrun || achievements || perf || clear || close";
        break;
      case "crt":
        setCrtActive(prev => !prev);
        response = "CRT monitor toggled.";
        break;
      case "audio":
        setAudioEnabled(prev => !prev);
        response = "Web Audio feedback toggled.";
        break;
      case "music":
        setMusicEnabled(prev => !prev);
        response = "Ambient synth loops toggled.";
        break;
      case "next":
        const nextIdx = Math.min(activeSceneIndex + 1, scenes.length - 1);
        scrollToScene(nextIdx);
        response = `Advancing to scene ${nextIdx + 1}.`;
        break;
      case "prev":
        const prevIdx = Math.max(activeSceneIndex - 1, 0);
        scrollToScene(prevIdx);
        response = `Receding to scene ${prevIdx + 1}.`;
        break;
      case "goto":
        const idx = parseInt(arg);
        if (isNaN(idx) || idx < 0 || idx >= scenes.length) {
          response = `Out of range. Telemetry range: 0 to ${scenes.length - 1}.`;
        } else {
          scrollToScene(idx);
          response = `Jumping viewport to scene ${idx + 1}.`;
        }
        break;
      case "speedrun":
        response = `Speedrun status: ${speedrunActive ? "Active" : "Idle"} || Time: ${speedrunTime.toFixed(1)}s || PB: ${personalBest ? personalBest.toFixed(1) + "s" : "None"}`;
        break;
      case "achievements":
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        response = `Unlocked achievements: ${unlockedCount}/${achievements.length}. Type list details.`;
        break;
      case "perf":
        setPerfMode(prev => !prev);
        response = "Low latency Performance Mode toggled.";
        break;
      case "clear":
        setCliHistory([]);
        return;
      case "close":
        setCliOpen(false);
        return;
      default:
        response = `Command unrecognized: '${cmd}'. Type 'help' for support.`;
    }
    
    setCliHistory((prev) => [...prev, `> ${fullCmd}`, response].slice(-100));
  };

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    executeCommand(cliInput.trim());
    setCliInput("");
  };

  const scrollToScene = (index: number) => {
    if (sceneIndexTimeoutRef.current) {
      window.clearTimeout(sceneIndexTimeoutRef.current);
    }
    targetSceneIndexRef.current = index;
    setActiveSceneIndex(index);

    // Mark that we're auto-scrolling so the scroll listener won't fight us
    isAutoScrollingRef.current = true;
    if (scrollEndTimeoutRef.current) {
      window.clearTimeout(scrollEndTimeoutRef.current);
    }
    scrollEndTimeoutRef.current = window.setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 900); // smooth scroll typically takes ~600-800ms

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetScrollY = (index / (scenes.length - 1)) * maxScroll;
    window.scrollTo({
      top: targetScrollY,
      behavior: "smooth",
    });
  };

  // Music Loop trigger Effect
  useEffect(() => {
    if (audioEnabled && musicEnabled) {
      startAmbientMusic();
    } else {
      stopAmbientMusic();
    }
    return () => stopAmbientMusic();
  }, [audioEnabled, musicEnabled]);

  // 12. Viewport Smooth Progress LERP calculation loop
  useEffect(() => {
    let frameId = 0;
    const lerpFactor = 0.085;
    
    const update = () => {
      setSmoothProgress((prev) => {
        const diff = progress - prev;
        if (Math.abs(diff) < 0.0001) return progress;
        return prev + diff * lerpFactor;
      });
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [progress]);

  // 15. Viewport shake impact on scene change
  useEffect(() => {
    setShakeActive(true);
    const timer = setTimeout(() => setShakeActive(false), 260);
    return () => clearTimeout(timer);
  }, [activeSceneIndex]);

  // Achievements unlocked state observer
  useEffect(() => {
    if (activeSceneIndex === 0) unlockAchievement("cadet");
    if (activeSceneIndex >= 1) unlockAchievement("steward");
    if (activeSceneIndex >= 9) unlockAchievement("monday");
    if (activeSceneIndex === 14) unlockAchievement("victory");
  }, [activeSceneIndex]);

  // Speedrun Timer tracker
  useEffect(() => {
    if (progress > 0.01 && progress < 0.99 && !speedrunActive && speedrunStart === null) {
      setSpeedrunActive(true);
      setSpeedrunStart(Date.now());
    }
    
    if (progress >= 0.99 && speedrunActive && speedrunStart !== null) {
      setSpeedrunActive(false);
      const duration = (Date.now() - speedrunStart) / 1000;
      setSpeedrunTime(duration);
      
      if (personalBest === null || duration < personalBest) {
        setPersonalBest(duration);
        try {
          localStorage.setItem("comeback_pb", duration.toString());
        } catch(e){}
        playSound("sparkle");
      }
    }
  }, [progress, speedrunActive, speedrunStart, personalBest]);

  useEffect(() => {
    if (!speedrunActive || speedrunStart === null) return;
    const interval = setInterval(() => {
      setSpeedrunTime((Date.now() - speedrunStart) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [speedrunActive, speedrunStart]);

  // Typewriter tip text generator
  useEffect(() => {
    if (!spriteHovered) {
      setTypedTip("");
      return;
    }
    const fullText = getRandomTip(characterType, activeSceneIndex);
    setTypedTip("");
    
    let i = 0;
    const interval = setInterval(() => {
      setTypedTip((prev) => prev + fullText.charAt(i));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
      }
    }, 20);
    
    return () => clearInterval(interval);
  }, [spriteHovered, characterType, activeSceneIndex]);

  // Diagnostic FPS metrics calculator
  useEffect(() => {
    if (perfMode) return;
    let lastTime = performance.now();
    let frames = 0;
    let frameId = 0;
    
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [perfMode]);

  // Background tab visibility low-power checker
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPlaying(false);
        stopAmbientMusic();
      } else {
        if (audioEnabled && musicEnabled) startAmbientMusic();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [audioEnabled, musicEnabled]);

  // Periodic CRT scanline Glitch effect triggers
  useEffect(() => {
    if (perfMode) return;
    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 240);
    };
    const interval = setInterval(() => {
      if (Math.random() > 0.45) {
        triggerGlitch();
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [perfMode]);

  // Main scroll progress & scroll velocity detection
  useEffect(() => {
    let frame = 0;
    let lastY = window.scrollY;
    let lastTime = Date.now();
    let speedTimeout: number;

    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const next = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const clampedNext = clamp(next, 0, 1);
      setProgress(clampedNext);

      // Skip scene index updates while scrollToScene is running its smooth scroll
      if (!isAutoScrollingRef.current) {
        const targetIndex = clamp(Math.floor(clampedNext * scenes.length), 0, scenes.length - 1);
        if (targetIndex !== targetSceneIndexRef.current) {
          targetSceneIndexRef.current = targetIndex;
          if (sceneIndexTimeoutRef.current) {
            window.clearTimeout(sceneIndexTimeoutRef.current);
          }
          sceneIndexTimeoutRef.current = window.setTimeout(() => {
            setActiveSceneIndex(targetIndex);
          }, 55);
        }
      }

      const currentY = window.scrollY;
      const currentTime = Date.now();
      const dist = Math.abs(currentY - lastY);
      const time = currentTime - lastTime || 1;
      const velocity = dist / time;
      setScrollSpeed(Math.min(velocity * 8, 12));

      lastY = currentY;
      lastTime = currentTime;

      clearTimeout(speedTimeout);
      speedTimeout = window.setTimeout(() => setScrollSpeed(0), 100);

      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(speedTimeout);
      if (sceneIndexTimeoutRef.current) {
        window.clearTimeout(sceneIndexTimeoutRef.current);
      }
    };
  }, []);

  // Track mouse coordinates for cursor parallax & velocity
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
      
      const now = Date.now();
      const dt = now - lastMousePos.current.time || 1;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      setCursorVel(Math.min((dist / dt) * 10, 45));
      lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Typewriter typing effect for wizard responses
  useEffect(() => {
    if (currentlyTypingIndex === null) return;

    const message = chatHistory[currentlyTypingIndex];
    if (!message || message.sender !== "wizard") {
      setCurrentlyTypingIndex(null);
      setWizardState("idle");
      return;
    }

    const interval = setInterval(() => {
      setTypedTextIndex((prev) => {
        const nextIndex = prev + 2; // Type 2 characters at a time for speed
        if (nextIndex >= message.text.length) {
          clearInterval(interval);
          setCurrentlyTypingIndex(null);
          setWizardState("idle");
          // Scroll chat log to bottom
          setTimeout(() => {
            if (chatLogRef.current) {
              chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
            }
          }, 50);
          return message.text.length;
        }

        // Play typewriter retro beep
        if (nextIndex % 4 === 0 && audioEnabled) {
          try {
            const ctx = audioCtxRef.current;
            if (ctx) {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
              gain.gain.setValueAtTime(0.008, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.04);
            }
          } catch (e) {}
        }

        // Scroll chat log to bottom dynamically
        if (chatLogRef.current) {
          chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }

        return nextIndex;
      });
    }, 25);

    return () => clearInterval(interval);
  }, [currentlyTypingIndex, chatHistory, audioEnabled]);

  // Prevent main page scroll when wheel event occurs inside the chat history log
  useEffect(() => {
    const logElement = chatLogRef.current;
    if (!logElement) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;
      const canScrollDown = logElement.scrollHeight - logElement.scrollTop > logElement.clientHeight + 2;
      const canScrollUp = logElement.scrollTop > 0;

      if ((isScrollingDown && canScrollDown) || (isScrollingUp && canScrollUp)) {
        logElement.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };

    logElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      logElement.removeEventListener("wheel", handleWheel);
    };
  }, [activeSceneIndex, chatHistory]);

  const handleSendChatMessage = (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : chatInput;
    const cleanText = rawText.trim();
    if (!cleanText) return;

    // Reset input
    if (textToSend === undefined) {
      setChatInput("");
    }

    // Play click sound
    playSound("click");

    // Add user message
    const userMsg = {
      sender: "user" as const,
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Show temporary typing state
    const typingMsg = {
      sender: "wizard" as const,
      text: "...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isTyping: true
    };

    setChatHistory((prev) => [...prev, userMsg, typingMsg]);
    setWizardState("talking");

    // Scroll chat log to bottom
    setTimeout(() => {
      if (chatLogRef.current) {
        chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
      }
    }, 50);

    // Simulate wizard consulting the scrying scrolls
    setTimeout(async () => {
      let resultAnswer = "";

      try {
        const apiResult = await getOpenAIResponse({ data: { query: cleanText } });
        if (apiResult && apiResult.success && apiResult.answer) {
          resultAnswer = apiResult.answer;
        }
      } catch (err) {
        console.warn("OpenAI server function failed, falling back to local responder:", err);
      }

      // Fallback if OpenAI is not configured or failed
      if (!resultAnswer) {
        const localResult = getWizardResponse(cleanText, faqEntries);
        resultAnswer = localResult.answer;
      }
      
      setChatHistory((prev) => {
        const nextHistory = [...prev];
        // Replace typing message (last element) with actual response
        const typingIdx = nextHistory.findIndex(m => m.isTyping);
        if (typingIdx !== -1) {
          nextHistory[typingIdx] = {
            sender: "wizard",
            text: resultAnswer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setCurrentlyTypingIndex(typingIdx);
          setTypedTextIndex(0);
        } else {
          // Fallback if not found
          nextHistory.push({
            sender: "wizard",
            text: resultAnswer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          setCurrentlyTypingIndex(nextHistory.length - 1);
          setTypedTextIndex(0);
        }
        return nextHistory;
      });
    }, 1000);
  };

  // Trigger content-themed animations based on active slide index
  useEffect(() => {
    // Reset all states
    setHighFiveSpark(false);
    setRewardStars([]);
    setPenaltyItems([]);
    setHearts([]);
    setFloatingScores([]);
    setRecordCheckmarks([]);
    setSeasonParticles([]);

    if (activeSceneIndex === 3) {
      const timer = setTimeout(() => {
        setHighFiveSpark(true);
        playSound("transition");
        // Spawn stardust sparks at center
        spawnBulletParticles(window.innerWidth / 2, window.innerHeight * 0.42);
      }, 700);
      return () => clearTimeout(timer);
    }

    if (activeSceneIndex === 4) {
      const scores = Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        x: -120 + Math.random() * 240,
        type: ["coin", "heart", "step"][i % 3] as "coin" | "heart" | "step",
        delay: i * 0.3
      }));
      setFloatingScores(scores);
    }

    if (activeSceneIndex === 7) {
      const stars = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        x: -160 + Math.random() * 320,
        y: -300 - Math.random() * 200,
        delay: i * 0.18
      }));
      setRewardStars(stars);
      
      const timer = setTimeout(() => {
        playSound("sparkle");
      }, 400);
      return () => clearTimeout(timer);
    }

    if (activeSceneIndex === 8) {
      const checks = Array.from({ length: 7 }).map((_, i) => ({
        id: i,
        x: -110 + Math.random() * 220,
        type: (i % 2 === 0 ? "check" : "folder") as "check" | "folder",
        delay: i * 0.3
      }));
      setRecordCheckmarks(checks);
    }

    if (activeSceneIndex === 11) {
      const particles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        x: -140 + Math.random() * 280,
        delay: i * 0.18
      }));
      setSeasonParticles(particles);
    }

    if (activeSceneIndex === 12) {
      const items = [
        { id: 1, x: -90, text: "LATE ENTRY!", delay: 0.2 },
        { id: 2, x: 10, text: "DUPLICATE NAME!", delay: 0.6 },
        { id: 3, x: 80, text: "NO ATTENDANCE!", delay: 1.0 }
      ];
      setPenaltyItems(items);
      
      const timer = setTimeout(() => {
        playSound("click");
      }, 300);
      return () => clearTimeout(timer);
    }

    if (activeSceneIndex === 13) {
      const newHearts = Array.from({ length: 10 }).map((_, i) => ({
        id: i,
        x: -120 + Math.random() * 240,
        delay: i * 0.2
      }));
      setHearts(newHearts);
      
      const timer = setTimeout(() => {
        playSound("sparkle");
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeSceneIndex, audioEnabled]);

  // Rotate seasons on Slide 11
  useEffect(() => {
    if (activeSceneIndex !== 11) return;
    const interval = setInterval(() => {
      setCurrentSeason((prev) => {
        if (prev === "spring") return "summer";
        if (prev === "summer") return "autumn";
        if (prev === "autumn") return "winter";
        return "spring";
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSceneIndex]);

  // Keyboard navigation, CLI trigger, Konami Code tracker & notes synth
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle CLI terminal
      if (e.key === "`" || e.key === "~") {
        e.preventDefault();
        setCliOpen((prev) => !prev);
        playSound("click");
        return;
      }

      if (cliOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setCliOpen(false);
          playSound("click");
        }
        return;
      }

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Keyboard Synthesizer scale note trigger
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        playSoundboardNote(parseInt(e.key));
        return;
      }

      // Konami Code sequence tracker
      const kCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
      const key = e.key;
      setKeySequence((prev) => {
        const nextSeq = [...prev, key].slice(-10);
        const matches = nextSeq.length === 10 && nextSeq.every((v, i) => v.toLowerCase() === kCode[i].toLowerCase());
        if (matches) {
          setKonamiUnlocked(true);
          unlockAchievement("konami");
          try {
            initAudio();
            const ctx = audioCtxRef.current;
            if (ctx) {
              const oscNode = ctx.createOscillator();
              const gainNode = ctx.createGain();
              oscNode.type = "sawtooth";
              oscNode.frequency.setValueAtTime(523.25, ctx.currentTime);
              oscNode.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
              oscNode.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
              oscNode.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);
              gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
              oscNode.connect(gainNode);
              gainNode.connect(ctx.destination);
              oscNode.start();
              oscNode.stop(ctx.currentTime + 0.4);
            }
          } catch(err){}
        }
        return nextSeq;
      });

      if (e.key === "ArrowDown" || e.key === "Down") {
        e.preventDefault();
        const nextIndex = Math.min(activeSceneIndex + 1, scenes.length - 1);
        scrollToScene(nextIndex);
      } else if (e.key === "ArrowUp" || e.key === "Up") {
        e.preventDefault();
        const prevIndex = Math.max(activeSceneIndex - 1, 0);
        scrollToScene(prevIndex);
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (e.shiftKey) {
          const prevIndex = Math.max(activeSceneIndex - 1, 0);
          scrollToScene(prevIndex);
        } else {
          const nextIndex = Math.min(activeSceneIndex + 1, scenes.length - 1);
          scrollToScene(nextIndex);
        }
      } else if (e.key === "PageDown") {
        e.preventDefault();
        const nextIndex = Math.min(activeSceneIndex + 2, scenes.length - 1);
        scrollToScene(nextIndex);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        const prevIndex = Math.max(activeSceneIndex - 2, 0);
        scrollToScene(prevIndex);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToScene(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToScene(scenes.length - 1);
      } else if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSceneIndex, cliOpen, achievements]);

  // Autoplay Presentation interval loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const nextIndex = (activeSceneIndex + 1) % scenes.length;
      scrollToScene(nextIndex);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPlaying, activeSceneIndex]);

  // Trigger transition chime sound when scene changes
  useEffect(() => {
    playSound("transition");
  }, [activeSceneIndex]);

  // Sound Pitch Glide scroll velocity modulator
  useEffect(() => {
    if (!audioEnabled || !oscRef.current || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const baseFreq = 75 + activeSceneIndex * 5;
      const modFreq = baseFreq + scrollSpeed * 25;
      oscRef.current.frequency.setValueAtTime(oscRef.current.frequency.value, ctx.currentTime);
      oscRef.current.frequency.exponentialRampToValueAtTime(modFreq, ctx.currentTime + 0.1);
    } catch(e){}
  }, [scrollSpeed, activeSceneIndex, audioEnabled]);

  // Ambient Low-frequency synth hum/drone
  useEffect(() => {
    if (!audioEnabled) {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch (e) {}
        oscRef.current = null;
      }
      return;
    }

    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (!oscRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(75 + activeSceneIndex * 5, ctx.currentTime);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        
        oscRef.current = osc;
        gainRef.current = gain;
      } else {
        oscRef.current.frequency.exponentialRampToValueAtTime(75 + activeSceneIndex * 5, ctx.currentTime + 0.8);
      }
    } catch (e) {
      console.error(e);
    }
  }, [audioEnabled, activeSceneIndex]);

  // Cleanup ambient oscillators on unmount
  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Particle emission from card hover
  const spawnBulletParticles = (x: number, y: number) => {
    if (perfMode) return;
    const newParticles = Array.from({ length: 4 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      const dx = `${Math.cos(angle) * dist}px`;
      const dy = `${Math.sin(angle) * dist}px`;
      
      return {
        id: Math.random() + Date.now() + i,
        x,
        y,
        dx,
        dy,
        color: activeGlowColor.replace("0.2", "0.85").replace("0.18", "0.85").replace("0.25", "0.85"),
      };
    });
    setClickParticles((prev) => [...prev, ...newParticles].slice(-40));
  };

  // Spawn starburst particles on background click
  const handleBgClick = (e: React.MouseEvent) => {
    if (perfMode) return;
    if (
      (e.target as HTMLElement).tagName !== "MAIN" && 
      (e.target as HTMLElement).tagName !== "SECTION" &&
      !(e.target as HTMLElement).classList.contains("clickable-backdrop")
    ) {
      return;
    }
    
    playSound("sparkle");
    const x = e.clientX;
    const y = e.clientY;
    
    const newParticles = Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * Math.PI) / 4 + Math.random() * 0.2;
      const dist = 60 + Math.random() * 80;
      const dx = `${Math.cos(angle) * dist}px`;
      const dy = `${Math.sin(angle) * dist}px`;
      
      return {
        id: Math.random() + Date.now() + i,
        x,
        y,
        dx,
        dy,
        color: activeGlowColor.replace("0.2", "0.85").replace("0.18", "0.85").replace("0.25", "0.85"),
      };
    });
    
    setClickParticles((prev) => [...prev, ...newParticles].slice(-40));
  };

  const stars = useMemo(
    () =>
      Array.from({ length: 130 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        size: index % 7 === 0 ? 2 : index % 11 === 0 ? 3 : 1,
        opacity: 0.16 + ((index * 11) % 50) / 100,
      })),
    []
  );

  // Divide stars into 3 layers for parallax depth
  const backgroundStars = useMemo(() => stars.filter((_, i) => i % 3 === 0), [stars]);
  const midgroundStars = useMemo(() => stars.filter((_, i) => i % 3 === 1), [stars]);
  const foregroundStars = useMemo(() => stars.filter((_, i) => i % 3 === 2), [stars]);

  const spaceDust = useMemo(() => 
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${(i * 17) % 100}%`,
      top: `${(i * 29) % 100}%`,
      size: (i % 3) + 2,
      speed: (i % 4) * 0.5 + 0.5,
    })), []);

  const NEWS_FEEDS = [
    "SYSTEM OK · CONNECTING TO SCOREBOARD TRACKER LANES · FINANCE (F) LANE ACTIVE",
    "REMINDER: SUBMIT WEEKLY DATA BY MONDAY AT 5 PM EST TO PREVENT SCORE PENALTIES",
    "GROWTH OBJECTIVE LANE: TRIPLE-HEADER RECOGNITION AND PUBLIC CELEBRATION PENDING",
    "DATA REVEALS CARE · NO SOLO PLAYERS · EVERY LOCAL TRACKER DIRECTLY FEEDS DASHBOARD",
    "MISSION UPDATE: 14 REGIONAL SECTORS ONLINE · WELCOME TO OPERATION COMEBACK"
  ];

  const scrollPercentageStr = (progress * 100).toFixed(1) + "%";

  return (
    <main 
      className={`min-h-[1600vh] bg-[#08090d] text-white ${!perfMode && !cliOpen ? "reticle-cursor-hidden" : "custom-pointer"} ${crtActive ? "crt-effect" : ""}`}
      onClick={handleBgClick}
    >
      {/* HUD Controls Toolbar */}
      <div className="fixed top-5 right-6 z-50 flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md shadow-lg pointer-events-auto select-none">
        {/* CLI Terminal Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCliOpen(!cliOpen);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${cliOpen ? "text-emerald-400" : "text-white/60 hover:text-white"}`}
          title="Toggle Command Line Console (tilde ~)"
        >
          <Terminal size={15} />
        </button>

        <span className="w-px h-3.5 bg-white/15" />

        {/* Staging Grid Floor Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setStageGrid(!stageGrid);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${stageGrid ? "text-amber-400" : "text-white/60 hover:text-white"}`}
          title="Toggle 3D Perspective Grid Floor"
        >
          <Grid size={15} />
        </button>

        <span className="w-px h-3.5 bg-white/15" />

        {/* Ambient Music Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMusicEnabled(!musicEnabled);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${musicEnabled && audioEnabled ? "text-pink-400" : "text-white/60 hover:text-white"}`}
          title="Toggle Procedural Music Loop"
        >
          <Music size={15} />
        </button>

        <span className="w-px h-3.5 bg-white/15" />

        {/* Audio Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAudioEnabled(!audioEnabled);
            if (!audioEnabled) {
              setTimeout(() => playSound("click"), 100);
            } else {
              playSound("click");
            }
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${audioEnabled ? "text-emerald-400" : "text-white/60 hover:text-white"}`}
          title={audioEnabled ? "Mute Retro Chimes" : "Enable Web Audio Synth"}
        >
          {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        
        <span className="w-px h-3.5 bg-white/15" />
        
        {/* Autoplay Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying(!isPlaying);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${isPlaying ? "text-cyan-400" : "text-white/60 hover:text-white"}`}
          title={isPlaying ? "Pause Autoplay" : "Start Slideshow Autoplay"}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
        
        <span className="w-px h-3.5 bg-white/15" />
        
        {/* CRT Scanline Filter Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCrtActive(!crtActive);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${crtActive ? "text-purple-400" : "text-white/60 hover:text-white"}`}
          title="Toggle CRT Screen Scanlines"
        >
          <Monitor size={15} />
        </button>
        
        <span className="w-px h-3.5 bg-white/15" />
        
        {/* Performance Mode Switch */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPerfMode(!perfMode);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className={`cursor-pointer transition-colors ${perfMode ? "text-amber-500" : "text-white/60 hover:text-white"}`}
          title={perfMode ? "Standard Effects Active" : "Performance Mode (No Trails/Clicks)"}
        >
          <Sparkles size={15} />
        </button>
        
        <span className="w-px h-3.5 bg-white/15" />
        
        {/* Keyboard shortcuts help panel */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowHelp(true);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className="text-white/60 hover:text-white cursor-pointer transition-colors"
          title="Telemetry Control Panel Help (?)"
        >
          <HelpCircle size={15} />
        </button>

        <span className="w-px h-3.5 bg-white/15" />

        {/* Rules FAQ panel */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFaq(true);
            playSound("click");
          }}
          onMouseEnter={() => playSound("hover")}
          className="text-white/60 hover:text-white cursor-pointer transition-colors"
          title="Frequently Asked Questions"
        >
          <MessageCircleQuestion size={15} />
        </button>
      </div>

      {/* Speedrun Timer HUD Widget */}
      <div className="fixed top-5 left-6 z-50 flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-2 rounded-full font-mono text-[10px] text-white/80 select-none">
        <Timer size={13} className={speedrunActive ? "text-cyan-400 animate-spin" : "text-white/45"} style={{ animationDuration: "3s" }} />
        <span>PB: {personalBest ? personalBest.toFixed(1) + "s" : "--.-s"}</span>
        <span className="text-white/20">|</span>
        <span className={speedrunActive ? "text-cyan-400 animate-pulse" : "text-white/60"}>TIME: {speedrunTime.toFixed(1)}s</span>
      </div>

      <section className={`fixed inset-0 overflow-hidden clickable-backdrop ${shakeActive ? "crt-glitch-active" : ""}`}>
        {/* Dynamic Glow background */}
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-out pointer-events-none" 
          style={{
            background: `radial-gradient(circle at 50% 20%, ${activeGlowColor}, transparent 35%), radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.05), transparent 30%)`
          }}
        />

        {/* Ambient Shooting Stars */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <span 
            className="absolute h-[1px] w-[80px] bg-gradient-to-r from-white via-white/40 to-transparent animate-shooting-star"
            style={{ left: "30%", top: "15%", animationDelay: "0.5s" }}
          />
          <span 
            className="absolute h-[1px] w-[110px] bg-gradient-to-r from-white via-white/40 to-transparent animate-shooting-star"
            style={{ left: "70%", top: "40%", animationDelay: "4s" }}
          />
          <span 
            className="absolute h-[1px] w-[70px] bg-gradient-to-r from-white via-white/40 to-transparent animate-shooting-star"
            style={{ left: "15%", top: "70%", animationDelay: "7s" }}
          />
        </div>

        {/* Click Particles */}
        {!perfMode && clickParticles.map((p) => (
          <span
            key={p.id}
            className="fixed rounded-full pointer-events-none z-15"
            style={{
              left: p.x,
              top: p.y,
              width: "4px",
              height: "4px",
              backgroundColor: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              ["--dx" as any]: p.dx,
              ["--dy" as any]: p.dy,
              animation: "particle-drift 0.8s ease-out forwards",
            }}
          />
        ))}

        {/* Mouse Trail */}
        {!perfMode && trail.map((p, idx) => (
          <div
            key={p.id}
            className="fixed rounded-full pointer-events-none z-50 transition-opacity bg-white/30"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              opacity: (idx / trail.length) * 0.45,
              boxShadow: `0 0 6px ${activeGlowColor.replace("0.2", "0.8").replace("0.18", "0.8").replace("0.25", "0.8")}`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Parallax Starfield Layer 1: Background Stars (using smoothProgress) */}
        <div 
          className="absolute inset-0 pointer-events-none transition-transform duration-500 ease-out"
          style={{
            transform: `translate(${mousePosition.x * -4}px, ${mousePosition.y * -4}px)`,
          }}
        >
          {backgroundStars.map((star) => (
            <span
              key={star.id}
              className={`absolute rounded-full bg-white transition-opacity ${star.id % 2 === 0 ? "animate-twinkle" : ""}`}
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                transform: `translateY(${-smoothProgress * 120 * (star.size + 0.3)}px) scaleY(${1 + scrollSpeed * 0.6})`,
                animationDelay: `${(star.id * 0.15) % 4}s`,
                animationDuration: `${3.5 + (star.id % 3)}s`
              }}
            />
          ))}
        </div>

        {/* Parallax Starfield Layer 2: Midground Stars */}
        <div 
          className="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mousePosition.x * -9}px, ${mousePosition.y * -9}px)`,
          }}
        >
          {midgroundStars.map((star) => (
            <span
              key={star.id}
              className={`absolute rounded-full bg-white transition-opacity ${star.id % 3 === 0 ? "animate-twinkle" : ""}`}
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                transform: `translateY(${-smoothProgress * 200 * (star.size + 0.4)}px) scaleY(${1 + scrollSpeed * 0.8})`,
                animationDelay: `${(star.id * 0.23) % 5}s`,
                animationDuration: `${4.5 + (star.id % 4)}s`
              }}
            />
          ))}
        </div>

        {/* Parallax Starfield Layer 3: Foreground Stars */}
        <div 
          className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${mousePosition.x * -16}px, ${mousePosition.y * -16}px)`,
          }}
        >
          {foregroundStars.map((star) => (
            <span
              key={star.id}
              className={`absolute rounded-full bg-white transition-opacity ${star.id % 4 === 0 ? "animate-twinkle" : ""}`}
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                transform: `translateY(${-smoothProgress * 280 * (star.size + 0.5)}px) scaleY(${1 + scrollSpeed * 1.0})`,
                animationDelay: `${(star.id * 0.31) % 6}s`,
                animationDuration: `${5.5 + (star.id % 5)}s`
              }}
            />
          ))}
        </div>

        {/* Drift Space Dust Layer */}
        {!perfMode && spaceDust.map((dust) => (
          <span
            key={dust.id}
            className="absolute bg-white/10 rounded-full pointer-events-none"
            style={{
              left: dust.left,
              top: dust.top,
              width: dust.size,
              height: dust.size,
              transform: `translate(${-smoothProgress * 320 * dust.speed}px, ${smoothProgress * 40}px)`,
            }}
          />
        ))}

        {/* Interactive HUD Progress Rail */}
        <div className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 flex-row items-center gap-6 md:flex select-none">
          <div className="relative flex h-80 flex-col items-center justify-between py-2">
            {/* Background Rail Line */}
            <div className="absolute h-full w-[2px] bg-white/10 rounded-full" />
            {/* Active filled line */}
            <div 
              className="absolute top-0 w-[2px] rounded-full transition-all duration-100 ease-out" 
              style={{ 
                height: `${progress * 100}%`,
                background: `linear-gradient(to bottom, #4f7fff, ${activeGlowColor.replace("0.2", "1").replace("0.18", "1").replace("0.25", "1")})`
              }}
            />
            
            {/* Navigation Dots */}
            {scenes.map((scene, index) => {
              const isActive = index === activeSceneIndex;
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToScene(index);
                    playSound("click");
                  }}
                  onMouseEnter={() => playSound("hover")}
                  className="group relative z-30 flex h-3.5 w-3.5 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white custom-hand"
                  aria-label={`Go to scene ${index + 1}: ${scene.title}`}
                >
                  {/* Dot */}
                  <span 
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      isActive 
                        ? "h-3.5 w-3.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] scale-110" 
                        : "bg-white/30 group-hover:bg-white/70 group-hover:scale-110"
                    }`}
                    style={isActive ? { 
                      backgroundColor: activeGlowColor.replace("0.2", "1").replace("0.18", "1").replace("0.25", "1"),
                      boxShadow: `0 0 10px ${activeGlowColor.replace("0.2", "1").replace("0.18", "1").replace("0.25", "1")}` 
                    } : {}}
                  />

                  {/* Tooltip */}
                  <span className="absolute left-7 scale-90 opacity-0 pointer-events-none rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/90 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap backdrop-blur-md shadow-2xl">
                    {scene.kicker}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active scene segment tracker */}
          <div className="flex flex-col text-[11px] font-mono tracking-[0.25em] text-white/45 leading-relaxed">
            <span className="font-bold text-white/90">{String(activeSceneIndex + 1).padStart(2, "0")}</span>
            <span className="text-white/20 my-0.5">/</span>
            <span>{String(scenes.length).padStart(2, "0")}</span>
          </div>
        </div>

        <div className="relative z-10 flex h-screen items-center justify-center px-5 py-10">
          <div className="grid w-full max-w-7xl items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
            
            {/* Sprite Staging Area */}
            <div className="relative mx-auto flex aspect-square w-full max-w-[460px] items-center justify-center">
              {/* 17. Scenic Stage Grid Floor Projection */}
              {stageGrid && (
                <div className="absolute inset-0 perspective-container pointer-events-none z-0">
                  <div className="absolute inset-x-0 bottom-0 h-40 grid-floor-mesh" />
                </div>
              )}

              {/* 20. Stage Cycle Modes */}
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto z-0"
                onClick={() => {
                  const modes: ("rings" | "vortex" | "radar")[] = ["rings", "vortex", "radar"];
                  const nextMode = modes[(modes.indexOf(stageMode) + 1) % modes.length];
                  setStageMode(nextMode);
                  playSound("click");
                }}
                title="Click Stage to Cycle Stage Modes"
              >
                {stageMode === "rings" && (
                  <>
                    <motion.div
                      className="absolute inset-[6%] rounded-full border border-dashed border-white/5"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-[13%] rounded-full border border-white/10"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-[21%] rounded-full border border-dashed border-white/15"
                      animate={{ rotate: 180 }}
                      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    />
                  </>
                )}
                
                {stageMode === "vortex" && (
                  <>
                    <motion.div
                      className="absolute inset-[6%] rounded-full border-2 border-t-emerald-500/20 border-r-transparent border-b-cyan-500/20 border-l-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-[12%] rounded-full border-2 border-t-purple-500/20 border-r-transparent border-b-pink-500/20 border-l-transparent"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-[18%] rounded-full border border-dotted border-white/10"
                      animate={{ rotate: 180 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                  </>
                )}

                {stageMode === "radar" && (
                  <>
                    <div className="absolute inset-[6%] rounded-full border border-white/10" />
                    <div className="absolute inset-[14%] rounded-full border border-dashed border-white/5" />
                    <motion.div
                      className="absolute top-1/2 left-1/2 w-[44%] h-[1px] bg-gradient-to-r from-emerald-500/60 via-emerald-500/10 to-transparent origin-left"
                      style={{ transform: "translate(-50%, -50%)" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  </>
                )}
              </div>

              {/* Dynamic Glow backdrop */}
              <div
                className="absolute h-[62%] w-[62%] rounded-full opacity-40 blur-3xl transition-colors duration-1000 ease-out z-0"
                style={{ backgroundColor: activeGlowColor.replace("0.2", "0.75").replace("0.18", "0.75").replace("0.25", "0.75") }}
              />

              {/* Character Speech dialogue bubble on Hover with RPG Typewriter effect */}
              <AnimatePresence>
                {spriteHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 15 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="absolute top-[8%] z-30 bg-black/90 border border-white/15 px-4 py-2.5 rounded-[1.25rem] text-[11px] font-mono text-emerald-400/90 shadow-2xl max-w-[210px] text-center backdrop-blur-md leading-relaxed select-none border-b-2 border-r-2 cursor-default"
                  >
                    <span className="text-white/45 block text-[8px] uppercase tracking-widest mb-1">Incoming Msg:</span>
                    "{typedTip}"
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stage content keyed by scene — no AnimatePresence to prevent stuck/blank slides */}
                <motion.div
                  key={`stage-${activeSceneIndex}`}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Support Sprites */}
                  {activeScene.supportSprites?.map((sprite, index) => (
                    <motion.img
                      key={`support-${index}-${sprite}`}
                      src={sprite}
                      alt=""
                      initial={{ opacity: 0, y: 35, scale: 0.6 }}
                      animate={{ 
                        opacity: 0.85, 
                        y: 0, 
                        scale: 1,
                        x: 0
                      }}

                      transition={{ 
                        type: "tween",
                        duration: 0.6, 
                        ease: "easeOut",
                        delay: index * 0.1,
                      }}
                      className={`absolute w-[18%] [image-rendering:pixelated] z-10 ${activeSceneIndex === 3 ? "" : "animate-float-reverse"}`}
                      style={{
                        left: activeSceneIndex === 3 ? (index === 0 ? '30%' : '52%') : `${18 + index * 30}%`,
                        top: activeSceneIndex === 3 ? '38%' : `${12 + ((index * 19) % 42)}%`,
                        animationDelay: `${index * 0.4}s`,
                      }}
                    />
                  ))}

                  {/* Custom Content-Themed Animations Layer */}

                  {/* Slide 0: Welcome Brief */}
                  {activeSceneIndex === 0 && (
                    <motion.div
                      className="absolute top-[8%] text-[10px] font-mono text-yellow-400 font-bold bg-black/90 px-3 py-1.5 border border-yellow-400/40 rounded tracking-widest uppercase select-none shadow-[0_0_12px_rgba(234,179,8,0.25)] z-30"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    >
                      🕹️ Campaign Start 🕹️
                    </motion.div>
                  )}

                  {/* Slide 1: Game Objective (FABLES) */}
                  {activeSceneIndex === 1 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      {[
                        { letter: "F", name: "Finances", color: "text-amber-400 bg-amber-950/85 border-amber-400/50 shadow-[0_0_8px_#f59e0b]", angle: 0 },
                        { letter: "A", name: "Active Members", color: "text-emerald-400 bg-emerald-950/85 border-emerald-400/50 shadow-[0_0_8px_#10b981]", angle: 60 },
                        { letter: "B", name: "Blessing", color: "text-pink-400 bg-pink-950/85 border-pink-400/50 shadow-[0_0_8px_#ec4899]", angle: 120 },
                        { letter: "L", name: "Leadership", color: "text-purple-400 bg-purple-950/85 border-purple-400/50 shadow-[0_0_8px_#8b5cf6]", angle: 180 },
                        { letter: "E", name: "Environment", color: "text-blue-400 bg-blue-950/85 border-blue-400/50 shadow-[0_0_8px_#3b82f6]", angle: 240 },
                        { letter: "S", name: "Special Projects", color: "text-cyan-400 bg-cyan-950/85 border-cyan-400/50 shadow-[0_0_8px_#06b6d4]", angle: 300 },
                      ].map((lane, i) => (
                        <motion.div
                          key={`fables-badge-${i}`}
                          className={`absolute w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs border ${lane.color}`}
                          initial={{ scale: 0 }}
                          animate={{
                            scale: 1,
                            x: Math.cos((lane.angle * Math.PI) / 180) * 85,
                            y: Math.sin((lane.angle * Math.PI) / 180) * 85 + (i % 2 === 0 ? -10 : 10),
                          }}
                          transition={{
                            scale: { delay: i * 0.1, type: "spring", stiffness: 120 },
                            x: { repeat: Infinity, duration: 8, ease: "linear", repeatType: "mirror" },
                            y: { repeat: Infinity, duration: 4, ease: "easeInOut", repeatType: "mirror" }
                          }}
                        >
                          {lane.letter}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Slide 2: Connected Tools */}
                  {activeSceneIndex === 2 && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <svg className="absolute inset-0 w-full h-full text-emerald-500/25" xmlns="http://www.w3.org/2000/svg">
                        <motion.path
                          d="M 100, 110 Q 160, 120 250, 160"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="4,4"
                        />
                        <motion.path
                          d="M 400, 180 Q 340, 160 250, 160"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="4,4"
                        />
                      </svg>
                      {[1, 2].map((i) => (
                        <motion.div
                          key={`path-packet-l-${i}`}
                          className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
                          style={{ left: 100, top: 110 }}
                          animate={{
                            x: [0, 150],
                            y: [0, 50],
                            opacity: [0, 1, 1, 0]
                          }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            delay: i * 1.1,
                            ease: "linear"
                          }}
                        />
                      ))}
                      {[1, 2].map((i) => (
                        <motion.div
                          key={`path-packet-r-${i}`}
                          className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
                          style={{ left: 400, top: 180 }}
                          animate={{
                            x: [0, -150],
                            y: [0, -20],
                            opacity: [0, 1, 1, 0]
                          }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            delay: i * 1.1 + 0.5,
                            ease: "linear"
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Slide 3: No Solo Players (High Five!) */}
                  {highFiveSpark && activeSceneIndex === 3 && (
                    <motion.div
                      className="absolute text-yellow-400 font-bold font-mono text-sm z-35 select-none pointer-events-none bg-black/85 px-4 py-2 rounded-2xl border-2 border-yellow-400 shadow-[0_0_15px_#f59e0b] tracking-wider"
                      initial={{ scale: 0, opacity: 1, rotate: -5 }}
                      animate={{ scale: [1, 2.5, 2, 0], opacity: [1, 1, 1, 0], rotate: [-5, 5, 0] }}
                      transition={{ duration: 0.9, times: [0, 0.2, 0.7, 1] }}
                      style={{ top: "35%", left: "50%", transform: "translate(-50%, -50%)" }}
                    >
                      💥 HIGH FIVE!
                    </motion.div>
                  )}

                  {/* Slide 4: Providential Development (Core score) */}
                  {activeSceneIndex === 4 && floatingScores.map((item) => (
                    <motion.div
                      key={`floating-score-${item.id}`}
                      className="absolute text-sm pointer-events-none select-none z-30 font-mono"
                      style={{ left: `calc(50% + ${item.x}px)`, top: "52%" }}
                      initial={{ y: 0, opacity: 0, scale: 0.5 }}
                      animate={{
                        y: [0, -110],
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1.2, 0.9]
                      }}
                      transition={{
                        duration: 2.2,
                        delay: item.delay,
                        ease: "easeOut"
                      }}
                    >
                      {item.type === "coin" && (
                        <span className="text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)] font-bold">🪙 +$</span>
                      )}
                      {item.type === "heart" && (
                        <span className="text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)] font-bold">💚 +1</span>
                      )}
                      {item.type === "step" && (
                        <span className="text-pink-400 drop-shadow-[0_0_6px_rgba(236,72,153,0.5)] font-bold">🪜 STEP</span>
                      )}
                    </motion.div>
                  ))}

                  {/* Slide 5: Fresh Momentum speed lines */}
                  {activeSceneIndex === 5 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <motion.div
                          key={`speed-line-${i}`}
                          className="absolute h-[1px] bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                          style={{
                            top: `${15 + i * 12}%`,
                            width: `${40 + (i * 20) % 60}px`
                          }}
                          initial={{ left: "100%" }}
                          animate={{ left: "-30%" }}
                          transition={{
                            duration: 0.6 + (i * 0.1) % 0.4,
                            repeat: Infinity,
                            delay: i * 0.12,
                            ease: "linear"
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Slide 6: Grow From Baseline */}
                  {activeSceneIndex === 6 && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center pb-[20%] z-10">
                      <motion.div
                        className="w-[70%] h-[2px] bg-red-500/55 shadow-[0_0_6px_#ef4444] relative"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <span className="absolute left-1 -top-4 font-mono text-[7px] text-red-400 uppercase tracking-widest">Baseline</span>
                      </motion.div>
                      <motion.div
                        className="w-16 h-[45px] origin-bottom bg-gradient-to-t from-emerald-500/80 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400/40 relative rounded-t"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      >
                        <span className="absolute inset-x-0 -top-4 text-center font-mono text-[7px] text-emerald-400 font-bold tracking-wider animate-pulse">+GROWTH!</span>
                      </motion.div>
                    </div>
                  )}

                  {/* Slide 7: Rewards pulsing Trophy backdrop */}
                  {activeSceneIndex === 7 && (
                    <>
                      <motion.div
                        className="absolute text-[80px] text-yellow-400/10 pointer-events-none select-none z-0 filter blur-[1px]"
                        initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                        animate={{ scale: [1, 1.1, 1], rotate: [-10, 10, -10], opacity: 0.15 }}
                        transition={{ scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 6, repeat: Infinity, ease: "linear" } }}
                        style={{ top: "15%", left: "calc(50% - 40px)" }}
                      >
                        🏆
                      </motion.div>
                      {rewardStars.map((star) => (
                        <motion.div
                          key={`star-${star.id}`}
                          className="absolute text-yellow-400 text-xl pointer-events-none select-none z-30 font-mono drop-shadow-[0_0_8px_#f59e0b]"
                          style={{ left: `calc(50% + ${star.x}px)`, top: 0 }}
                          initial={{ y: star.y, opacity: 0 }}
                          animate={{
                            y: [star.y, 240, 200, 220],
                            opacity: [0, 1, 1, 0]
                          }}
                          transition={{
                            duration: 2.0,
                            delay: star.delay,
                            ease: "easeOut"
                          }}
                        >
                          ★
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* Slide 8: Record What Is Real */}
                  {activeSceneIndex === 8 && recordCheckmarks.map((item) => (
                    <motion.div
                      key={`record-${item.id}`}
                      className="absolute pointer-events-none select-none z-30 font-mono text-sm"
                      style={{ left: `calc(50% + ${item.x}px)`, top: "52%" }}
                      initial={{ y: 0, opacity: 0, scale: 0.5 }}
                      animate={{
                        y: [0, -100],
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1.2, 0.95]
                      }}
                      transition={{
                        duration: 2.0,
                        delay: item.delay,
                        ease: "easeOut"
                      }}
                    >
                      {item.type === "check" ? (
                        <span className="text-emerald-400 drop-shadow-[0_0_6px_#10b981] font-bold">✓ REAL</span>
                      ) : (
                        <span className="text-cyan-400 drop-shadow-[0_0_6px_#06b6d4] font-bold">📁 DIRECTORY</span>
                      )}
                    </motion.div>
                  ))}

                  {/* Slide 9: Goals, Baselines, Deadlines */}
                  {activeSceneIndex === 9 && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <motion.div
                        className="absolute top-[12%] right-[12%] w-10 h-10 rounded-full border-2 border-white/20 bg-black/60 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="w-1 h-1 bg-white rounded-full z-20" />
                        <motion.div
                          className="absolute w-3 h-[1.5px] bg-red-400 origin-left left-1/2 top-1/2 z-10"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                      <motion.div
                        className="absolute top-[22%] left-1/2 transform -translate-x-1/2 font-mono text-[9px] text-red-500 font-bold bg-black/95 px-2.5 py-1 border border-red-500/40 rounded tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }}
                      >
                        ⚠️ DEADLINE: MON 5PM EST
                      </motion.div>
                    </div>
                  )}

                  {/* Slide 10: Weekly Gameplay Loop */}
                  {activeSceneIndex === 10 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <motion.div
                        className="w-[66%] h-[66%] rounded-full border border-dashed border-emerald-500/35 relative"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                      >
                        <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 font-mono text-[7px] text-emerald-400 font-bold uppercase tracking-widest bg-[#0b1329] px-1.5 border border-emerald-500/20 rounded z-30">Review</span>
                        <span className="absolute top-[75%] -right-3 font-mono text-[7px] text-cyan-400 font-bold uppercase tracking-widest bg-[#0b1329] px-1.5 border border-cyan-500/20 rounded z-30">Assign</span>
                        <span className="absolute top-[75%] -left-3 font-mono text-[7px] text-purple-400 font-bold uppercase tracking-widest bg-[#0b1329] px-1.5 border border-purple-500/20 rounded z-30">Follow Up</span>
                      </motion.div>
                    </div>
                  )}

                  {/* Slide 11: Seasonal Loops */}
                  {activeSceneIndex === 11 && (
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                      <div className="absolute top-[8%] left-1/2 transform -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest font-bold px-3 py-1 bg-black/90 border border-white/10 rounded">
                        {currentSeason === "spring" && <span className="text-pink-400">🌸 Spring Trimester</span>}
                        {currentSeason === "summer" && <span className="text-emerald-400">☀️ Summer Trimester</span>}
                        {currentSeason === "autumn" && <span className="text-amber-500">🍂 Autumn Trimester</span>}
                        {currentSeason === "winter" && <span className="text-cyan-300">❄️ Winter Trimester</span>}
                      </div>
                      {seasonParticles.map((p) => (
                        <motion.div
                          key={`season-particle-${p.id}-${currentSeason}`}
                          className="absolute text-sm font-mono select-none"
                          style={{ left: `calc(50% + ${p.x}px)`, top: "-10%" }}
                          initial={{ y: 0, opacity: 0, rotate: 0 }}
                          animate={{
                            y: [0, 260],
                            opacity: [0, 1, 1, 0],
                            rotate: [0, 180 + p.id * 30]
                          }}
                          transition={{
                            duration: 2.8,
                            delay: p.delay,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          {currentSeason === "spring" && <span className="text-pink-300/60 text-[9px]">🌸</span>}
                          {currentSeason === "summer" && <span className="text-emerald-400/50 text-[11px]">🍃</span>}
                          {currentSeason === "autumn" && <span className="text-amber-600/60 text-[10px]">🍁</span>}
                          {currentSeason === "winter" && <span className="text-cyan-200/50 text-[12px]">❄️</span>}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Slide 12: Common Penalties */}
                  {activeSceneIndex === 12 && (
                    <>
                      <motion.div
                        className="absolute top-[8%] left-1/2 transform -translate-x-1/2 text-red-500 border border-red-500/40 bg-black/95 px-3 py-1 font-mono font-bold text-[9px] tracking-widest rounded uppercase shadow-[0_0_15px_rgba(239,68,68,0.4)] z-30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ⚠️ SYSTEM WARNING: PENALTY DETECTED ⚠️
                      </motion.div>
                      {penaltyItems.map((item) => (
                        <motion.div
                          key={`penalty-${item.id}`}
                          className="absolute text-red-500 font-bold font-mono text-[9px] tracking-wider pointer-events-none select-none z-30 bg-black/90 border border-red-500/40 px-2 py-1.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          style={{ left: `calc(50% + ${item.x}px)`, top: "40%" }}
                          initial={{ y: 0, opacity: 0, scale: 0.8 }}
                          animate={{
                            y: [-25, -110],
                            opacity: [0, 1, 1, 0],
                            scale: [0.8, 1.2, 1]
                          }}
                          transition={{
                            duration: 2.4,
                            delay: item.delay,
                            ease: "easeOut"
                          }}
                        >
                          👾 {item.text}
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* Slide 13: Champion Play */}
                  {activeSceneIndex === 13 && (
                    <>
                      <motion.div
                        className="absolute text-2xl z-30 pointer-events-none"
                        initial={{ y: -60, opacity: 0, scale: 0.6 }}
                        animate={{ y: -38, opacity: 0.95, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 10 }}
                        style={{ left: "calc(50% - 12px)", top: "35%" }}
                      >
                        👑
                      </motion.div>
                      {hearts.map((heart) => (
                        <motion.div
                          key={`heart-${heart.id}`}
                          className="absolute text-pink-500 text-lg pointer-events-none select-none z-30 drop-shadow-[0_0_6px_#ec4899]"
                          style={{ left: `calc(50% + ${heart.x}px)`, top: "45%" }}
                          initial={{ y: 0, opacity: 0, scale: 0.5 }}
                          animate={{
                            y: [0, -90],
                            x: [0, Math.sin(heart.id) * 20, 0],
                            opacity: [0, 0.9, 0.9, 0],
                            scale: [0.5, 1.3, 1]
                          }}
                          transition={{
                            duration: 2.0,
                            delay: heart.delay,
                            ease: "easeOut"
                          }}
                        >
                          ♥
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* Slide 14: Campaign for Revival (Chatbot Wizard) */}
                  {activeSceneIndex === 14 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <motion.div
                        className="absolute bottom-[17%] w-[35%] h-[8%] rounded-full border-2 border-purple-500/40 bg-purple-950/20 blur-[2px] shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        animate={{ rotate: 360, scale: [1, 1.06, 1] }}
                        transition={{
                          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        }}
                      />
                      {[1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={`magic-spark-${i}`}
                          className="absolute text-[8px] text-purple-400/70"
                          style={{
                            bottom: "20%",
                            left: `${42 + i * 4}%`
                          }}
                          initial={{ y: 0, opacity: 0 }}
                          animate={{
                            y: -80,
                            x: [0, Math.sin(i) * 15, 0],
                            opacity: [0, 1, 1, 0]
                          }}
                          transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            delay: i * 0.4,
                            ease: "easeOut"
                          }}
                        >
                          ✦
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* 13. Sprite Shadow Depth Scaling */}
                  <div
                    className="absolute bottom-[20%] w-[25%] h-[4%] bg-black/60 rounded-full blur-[3px] transition-all duration-300 pointer-events-none z-10"
                    style={{
                      transform: `scale(${spriteHovered ? 1.25 : 1})`,
                      opacity: spriteHovered ? 0.85 : 0.6,
                    }}
                  />

                  {/* Interactive Main Sprite with Hover Spring Reaction and Click SFX */}
                  <motion.img
                    key={`main-${activeSceneIndex}`}
                    src={activePose}
                    alt="Rule character"
                    initial={{ opacity: 0, y: 45, scale: 0.5 }}
                    animate={{ 
                      opacity: 1, 
                      y: activeSceneIndex === 5 ? [0, -14, 0] :
                         activeSceneIndex === 6 ? [0, -45] :
                         (spriteHovered ? -16 : 0), 
                      scale: activeSceneIndex === 6 ? [0.5, 1.4, 0.95, 1.05, 1] : (spriteHovered ? 1.12 : 1),
                      x: activeSceneIndex === 0 ? [-240, 0] : 0
                    }}

                    transition={
                      activeSceneIndex === 0 ? { type: "spring", stiffness: 80, damping: 15 } :
                      activeSceneIndex === 5 ? { repeat: Infinity, duration: 0.45, ease: "easeInOut" } :
                      activeSceneIndex === 6 ? { duration: 1.2, ease: "easeOut", delay: 0.3 } :
                      { 
                        type: "spring",
                        stiffness: 90,
                        damping: 16,
                        mass: 0.8,
                        delay: 0.05
                      }
                    }
                    onMouseEnter={() => {
                      setSpriteHovered(true);
                      playSound("hover");
                    }}
                    onMouseLeave={() => {
                      setSpriteHovered(false);
                    }}
                    onClick={() => {
                      playCharacterSound(characterType);
                      // Trigger hover stardust sparks
                      spawnBulletParticles(lastMousePos.current.x, lastMousePos.current.y);
                    }}
                    className={`relative z-25 w-[42%] [image-rendering:pixelated] drop-shadow-[0_24px_48px_rgba(0,0,0,0.65)] pointer-events-auto custom-hand ${[3, 5, 6].includes(activeSceneIndex) ? "" : "animate-float"}`}
                  />
                </motion.div>
            </div>

            {/* Content Article with Kinetic Typography and Velocity Drift */}
            <motion.article 
              className={`rounded-[2rem] border border-white/10 bg-black/45 p-6 md:p-10 min-h-[460px] md:min-h-[520px] max-h-[80vh] overflow-y-auto flex flex-col justify-start scrollbar-thin shadow-2xl shadow-black/40 backdrop-blur-md ${activeSceneIndex === 14 ? 'select-text' : 'select-none'}`}
              style={{
                y: scrollSpeed * 0.8
              }}
            >
              {/* Article content keyed by scene — no AnimatePresence to prevent stuck/blank slides */}
                {activeSceneIndex === 14 ? (
                  <motion.div
                    key="wizard-chatbot"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col h-[500px] w-full pointer-events-auto text-left font-mono justify-between text-xs select-text animate-[glitch-shake_0.2s_ease-in-out]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-purple-500/25 pb-3 mb-3 shrink-0 select-none">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">WIZARD_COGNITION_UNIT v1.2</span>
                      </div>
                      <span className="text-[8px] text-white/30 font-mono">ONLINE · TRANSMITTING</span>
                    </div>

                    {/* Chat Messages */}
                    <div
                      ref={chatLogRef}
                      className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3 scrollbar-thin select-text"
                    >
                      {chatHistory.map((msg, index) => {
                        const isTyping = index === currentlyTypingIndex;
                        const displayText = isTyping ? msg.text.substring(0, typedTextIndex) : msg.text;
                        
                        return (
                          <div
                            key={index}
                            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                          >
                            <div className="text-[8px] text-white/30 mb-1 px-1 font-mono uppercase select-none">
                              {msg.sender === "user" ? "CAPTAIN" : "WIZARD"} · {msg.timestamp}
                            </div>
                            <div
                              className={`p-3 rounded-2xl border text-[11px] leading-relaxed max-w-[85%] whitespace-pre-line font-mono ${
                                msg.sender === "user"
                                  ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300 rounded-tr-none shadow-lg shadow-emerald-950/10"
                                  : "bg-purple-950/25 border-purple-500/20 text-purple-200 rounded-tl-none shadow-lg shadow-purple-950/10"
                              }`}
                            >
                              {displayText}
                              {isTyping && typedTextIndex < msg.text.length && (
                                <span className="animate-pulse font-bold text-purple-400">▋</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Suggested Queries */}
                    <div className="shrink-0 flex flex-col gap-2 mb-3 border-t border-purple-500/10 pt-3 select-none">
                      <div className="text-[8px] text-white/30 uppercase tracking-wider">Scry scrolls of interest:</div>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                        {getWizardResponse(chatHistory[chatHistory.length - 1]?.sender === "user" ? chatHistory[chatHistory.length - 1].text : "", faqEntries).suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSendChatMessage(suggestion)}
                            className="text-[9px] bg-purple-900/15 border border-purple-500/15 hover:border-purple-500/35 hover:bg-purple-900/30 text-purple-300 hover:text-white px-2.5 py-1 rounded-full transition-all duration-200 max-w-[240px] truncate cursor-default custom-hand"
                          >
                            🔮 {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChatMessage();
                      }}
                      className="flex items-center gap-2 border-t border-white/10 pt-3 shrink-0 select-none"
                    >
                      <span className="text-purple-400 font-bold text-sm select-none animate-pulse">&gt;</span>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Inquire of the scoreboard rules..."
                        className="flex-grow bg-black/60 border border-purple-500/15 focus:border-purple-500/40 text-purple-200 placeholder-purple-400/20 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-mono rounded-xl transition-all shadow-md shadow-purple-950/20 cursor-default custom-hand"
                      >
                        SEND
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`text-${activeSceneIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-white/45">
                      {activeScene.kicker}
                    </p>
                    
                    {/* Title Mask Reveal with Chromatic Shadow Glitch */}
                    <h1 className="text-3xl font-extralight leading-[0.95] tracking-[-0.05em] md:text-5xl lg:text-6xl overflow-hidden block pr-4">
                      <motion.span
                        className="block origin-left pr-6"
                        initial={{ y: "100%" }}
                        animate={{ 
                          y: "0%",
                          textShadow: [
                            "0 0 0px rgba(0,0,0,0)",
                            `2.5px -2.5px 0px ${activeGlowColor.replace("0.2", "0.6").replace("0.18", "0.6").replace("0.25", "0.6")}, -2.5px 2.5px 0px rgba(0, 255, 255, 0.4)`,
                            "0 0 0px rgba(0,0,0,0)"
                          ]
                        }}
                        exit={{ y: "-100%" }}
                        transition={{ 
                          duration: 0.65, 
                          ease: [0.16, 1, 0.3, 1], 
                          delay: 0.05 
                        }}
                      >
                        {activeScene.title}
                      </motion.span>
                    </h1>

                    {activeScene.subtitle ? (
                      <div className="mt-4 text-lg font-light text-white/75 md:text-2xl overflow-hidden">
                        <motion.p
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.15 }}
                        >
                          {activeScene.subtitle}
                        </motion.p>
                      </div>
                    ) : null}

                    {/* Body Paragraphs Reveal */}
                    <div className="mt-6 space-y-4 text-base font-light leading-7 text-white/72 md:text-lg">
                      {activeScene.body.map((paragraph, pIdx) => (
                        <motion.p 
                          key={paragraph}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.25 + pIdx * 0.1 }}
                        >
                          {paragraph}
                        </motion.p>
                      ))}
                    </div>

                    {/* Bullets Reveal with Hover Synth Notes */}
                    {activeScene.bullets ? (
                      <ul className="mt-4 grid gap-2 text-xs leading-relaxed text-white/70 md:grid-cols-2">
                        {activeScene.bullets.map((bullet, bIdx) => (
                          <motion.li 
                            key={bullet} 
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 cursor-default transition-all duration-300 hover:border-white/25 hover:bg-white/[0.07] border-b-2"
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.35 + bIdx * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            onMouseEnter={(e) => {
                              spawnBulletParticles(e.clientX, e.clientY);
                              playSoundboardNote(bIdx);
                            }}
                          >
                            {bullet}
                          </motion.li>
                        ))}
                      </ul>
                    ) : null}

                    {/* Dynamic Badge with Shimmer */}
                    {activeScene.badge ? (
                      <motion.div 
                        className="mt-7 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/70 relative overflow-hidden"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.55 }}
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_linear_infinite]" />
                        <span className="relative z-10">{activeScene.badge}</span>
                      </motion.div>
                    ) : null}
                  </motion.div>
                )}
            </motion.article>

          </div>
        </div>

        {/* Scroll Indicator & Progress Percentage */}
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center text-xs uppercase tracking-[0.28em] text-white/45 flex flex-col items-center select-none">
          <span>Scroll ↓</span>
          <span className="font-mono text-[9px] text-white/30 mt-1">{scrollPercentageStr} COMPLETE</span>
          <div className="mt-2.5 h-7 w-px animate-pulse bg-white/35" />
        </div>
      </section>

      {/* Retro News Marquee Ticker at the bottom */}
      <div 
        className="fixed bottom-0 inset-x-0 bg-black border-t border-white/10 z-40 h-7 flex items-center px-4 overflow-hidden pointer-events-auto select-none custom-pointer"
        onClick={(e) => {
          e.stopPropagation();
          playSound("click");
        }}
        title="Encrypted HUD Feed Marquee"
      >
        <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest mr-4 select-none shrink-0 border border-emerald-500/25 px-1 bg-emerald-500/10">SYS_FEED:</span>
        <div className="w-full overflow-hidden relative flex items-center">
          <div className="animate-marquee whitespace-nowrap text-[9px] font-mono text-emerald-400/80 tracking-wider flex gap-8">
            <span>{NEWS_FEEDS.join("   ·   ")}</span>
            <span>{NEWS_FEEDS.join("   ·   ")}</span>
          </div>
        </div>
      </div>

      {/* CLI console terminal overlay */}
      {cliOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 font-mono text-[11px] text-emerald-400 p-8 flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent pointer-events-none z-10 animate-pulse" />
          <div className="flex justify-between items-center border-b border-emerald-500/30 pb-2 mb-4 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <Terminal size={14} className="animate-pulse" />
              <span>Operation COMEBACK - Telemetry Console CLI</span>
            </span>
            <button 
              onClick={() => setCliOpen(false)}
              className="text-emerald-500 hover:text-white border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] custom-hand"
            >
              [CLOSE]
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-4 mb-4 select-text">
            {cliHistory.map((line, idx) => (
              <div key={idx} className={line.startsWith(">") ? "text-emerald-300" : "text-emerald-400/80"}>
                {line}
              </div>
            ))}
          </div>
          <form onSubmit={handleCliSubmit} className="flex gap-2 items-center border-t border-emerald-500/20 pt-3 shrink-0">
            <span className="text-emerald-300 font-bold">$</span>
            <input 
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-emerald-300 placeholder-emerald-800 caret-emerald-400 font-mono"
              placeholder="type 'help' for diagnostics controls..."
              autoFocus
            />
          </form>
        </div>
      )}

      {/* Achievements Toaster Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -80, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0c0d12]/95 border-2 border-emerald-500 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md select-none font-mono"
          >
            <Trophy className="text-emerald-400 animate-bounce" size={24} />
            <div>
              <div className="text-[9px] uppercase tracking-widest text-emerald-500/70 font-bold">Achievement Unlocked!</div>
              <div className="text-sm font-bold text-white leading-tight">{activeToast.title}</div>
              <div className="text-[10px] text-white/50">{activeToast.desc}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retro Diagnostics HUD Panel */}
      {konamiUnlocked && (
        <div className="fixed bottom-10 right-6 z-50 w-64 bg-black/85 border border-emerald-500/30 p-4 rounded-xl font-mono text-[9px] text-emerald-400 leading-relaxed shadow-2xl backdrop-blur-md select-none">
          <div className="flex items-center gap-2 text-emerald-300 font-bold border-b border-emerald-500/20 pb-1.5 mb-2">
            <Activity size={12} className="animate-pulse" />
            <span>CORE TELEMETRY DIAGNOSTICS</span>
          </div>
          <div>FPS METRIC: <span className="text-white">{fps} fps</span></div>
          <div>SCROLL VEL: <span className="text-white">{scrollSpeed.toFixed(2)} px/frame</span></div>
          <div>SCROLL PROG: <span className="text-white">{(progress * 100).toFixed(1)}%</span></div>
          <div>SMOOTH PROG: <span className="text-white">{(smoothProgress * 100).toFixed(1)}%</span></div>
          <div>STAGE MODE: <span className="text-white uppercase">{stageMode}</span></div>
          <div>ACTIVE OSC: <span className="text-white">{musicNodesRef.current.isPlaying ? "3 Active" : "1 Active"}</span></div>
          <div className="text-white/40 text-[7px] uppercase mt-2 tracking-widest text-right">Dev Mode Active</div>
        </div>
      )}

      {/* Retro Reticle Custom Cursor */}
      {!perfMode && !cliOpen && (
        <div 
          className="fixed pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2 select-none"
          style={{
            left: lastMousePos.current.x,
            top: lastMousePos.current.y,
          }}
        >
          <div 
            className="relative flex items-center justify-center h-6 w-6 border border-emerald-400/40 rounded-full transition-transform duration-75"
            style={{
              transform: `rotate(${cursorVel * 8}deg)`,
              boxShadow: "0 0 6px rgba(16, 185, 129, 0.15)",
            }}
          >
            <div className="absolute h-1 w-1 bg-emerald-300 rounded-full shadow-[0_0_4px_#10b981]" />
            <div className="absolute top-0 w-[1px] h-1 bg-emerald-400/50" />
            <div className="absolute bottom-0 w-[1px] h-1 bg-emerald-400/50" />
            <div className="absolute left-0 h-[1px] w-1 bg-emerald-400/50" />
            <div className="absolute right-0 h-[1px] w-1 bg-emerald-400/50" />
          </div>
        </div>
      )}

      {/* Help Overlay Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto"
            onClick={() => {
              setShowHelp(false);
              playSound("click");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg border border-white/10 bg-[#0c0d12] p-8 rounded-[2rem] shadow-2xl text-left font-light select-none relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wider text-white">HUD TELEMETRY PANEL</h3>
                  <p className="text-[10px] text-white/45 tracking-[0.18em] uppercase mt-1">Operation COMEBACK Sandbox Console</p>
                </div>
                <button
                  onClick={() => {
                    setShowHelp(false);
                    playSound("click");
                  }}
                  className="text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 text-sm text-white/70">
                <div>
                  <p className="font-mono text-emerald-500 uppercase tracking-widest text-xs mb-2">▶ Keyboard Commands</p>
                  <ul className="space-y-2 font-mono text-[11px] text-white/50">
                    <li><span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">↓ / Arrow Down</span> / <span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">Space</span> Next Scene</li>
                    <li><span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">↑ / Arrow Up</span> / <span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">Shift+Space</span> Prev Scene</li>
                    <li><span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">~ / `</span> Toggle CLI Terminal</li>
                    <li><span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">0 - 9</span> Play Soundboard Synth Notes</li>
                    <li><span className="text-white bg-white/10 px-1.5 py-0.5 rounded mr-2">?</span> Toggle this HUD Telemetry panel</li>
                  </ul>
                </div>

                <div>
                  <p className="font-mono text-cyan-400 uppercase tracking-widest text-xs mb-2">▶ Telemetry Features (Toggles)</p>
                  <ul className="space-y-2.5 text-xs text-white/60">
                    <li><strong className="text-white">Autoplay Presentation Mode:</strong> Let the rules advance automatically every 7 seconds.</li>
                    <li><strong className="text-white">Web Audio Synthesizer:</strong> Plays retro synthesized sound feedback and a low-frequency hum that glides pitch when slides change.</li>
                    <li><strong className="text-white">CRT Monitor Overlay:</strong> Simulate a vintage glass cathode-ray tube screen with custom scanlines and chromatic aberration.</li>
                    <li><strong className="text-white">Performance Mode:</strong> Turn off particle bursts, trails, and custom cursor shaders for maximum 60fps optimization.</li>
                  </ul>
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10px] font-mono text-white/45 uppercase tracking-[0.18em]">
                  <span>Status: Operational</span>
                  <span>Version: 3.2.0-comeback</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFaq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto"
            onClick={() => {
              setShowFaq(false);
              playSound("click");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-white/10 bg-[#0c0d12] p-8 rounded-[2rem] shadow-2xl text-left font-light select-none relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent pointer-events-none" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wider text-white">Frequently Asked Questions</h3>
                  <p className="text-[10px] text-white/45 tracking-[0.18em] uppercase mt-1">
                    {faqQuery.data?.source === "live" ? "Live from the FAQ sheet" : "Built-in defaults"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFaq(false);
                    playSound("click");
                  }}
                  className="text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer text-xs shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-5 text-sm text-white/70">
                {faqEntries.map((entry) => (
                  <div key={entry.id} className="border-b border-white/10 pb-4 last:border-0">
                    <p className="font-bold text-white text-sm mb-1.5">{entry.question}</p>
                    {entry.status === "published" ? (
                      <p className="text-xs leading-5 text-white/60">{entry.answer}</p>
                    ) : (
                      <p className="text-xs italic text-amber-300/70">🚧 Coming soon — the team is writing this one.</p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden preloader for all poses to prevent scroll flickering */}
      <div className="hidden" aria-hidden="true">
        {Object.values(CHARACTER_POSES).flat().map((src, idx) => (
          <img key={idx} src={src} alt="" />
        ))}
      </div>
    </main>
  );
}
