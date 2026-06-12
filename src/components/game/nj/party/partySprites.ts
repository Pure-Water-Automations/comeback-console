// Shared sprite catalog for the party builder + views. Every staff member
// gets a unique sprite = a (family, pose) pair. 32 poses across 6 families.

import adventurerBible from "@/assets/sprites/adventurer/adventurer_bible.png";
import adventurerClipboard from "@/assets/sprites/adventurer/adventurer_clipboard.png";
import adventurerPencil from "@/assets/sprites/adventurer/adventurer_pencil.png";
import adventurerPointing from "@/assets/sprites/adventurer/adventurer_pointing.png";
import adventurerVictory from "@/assets/sprites/adventurer/adventurer_victory.png";
import adventurerWalking from "@/assets/sprites/adventurer/adventurer_walking.png";
import mentorChair from "@/assets/sprites/mentor/mentor_chair.png";
import mentorCheer from "@/assets/sprites/mentor/mentor_cheer.png";
import mentorCoffee from "@/assets/sprites/mentor/mentor_coffee.png";
import mentorFullPower from "@/assets/sprites/mentor/mentor_full_power.png";
import mentorIdle from "@/assets/sprites/mentor/mentor_idle.png";
import mentorLetter from "@/assets/sprites/mentor/mentor_letter.png";
import npcConfused from "@/assets/sprites/npc/npc_confused.png";
import npcLove from "@/assets/sprites/npc/npc_love.png";
import npcReading from "@/assets/sprites/npc/npc_reading.png";
import npcSalute from "@/assets/sprites/npc/npc_salute.png";
import npcWalking from "@/assets/sprites/npc/npc_walking.png";
import npcWave from "@/assets/sprites/npc/npc_wave.png";
import smartGuyBooks from "@/assets/sprites/smart_guy/smart_guy_books.png";
import smartGuyCheer from "@/assets/sprites/smart_guy/smart_guy_cheer.png";
import smartGuyHologram from "@/assets/sprites/smart_guy/smart_guy_hologram.png";
import smartGuyPresenting from "@/assets/sprites/smart_guy/smart_guy_presenting.png";
import smartGuyScroll from "@/assets/sprites/smart_guy/smart_guy_scroll.png";
import smartGuyWriting from "@/assets/sprites/smart_guy/smart_guy_writing.png";
import spiritCalendar from "@/assets/sprites/spirit/spirit_calendar.png";
import spiritGlow from "@/assets/sprites/spirit/spirit_glow.png";
import spiritIdle from "@/assets/sprites/spirit/spirit_idle.png";
import spiritLove from "@/assets/sprites/spirit/spirit_love.png";
import spiritSad from "@/assets/sprites/spirit/spirit_sad.png";
import spiritWave from "@/assets/sprites/spirit/spirit_wave.png";
import wizardIdle from "@/assets/sprites/wizard/wizard_idle.png";
import wizardTalking from "@/assets/sprites/wizard/wizard_talking.png";

export interface SpriteEntry {
  /** stable id, e.g. "adventurer:adventurer_bible" */
  id: string;
  family: string;
  pose: string;
  src: string;
  /** human label, e.g. "Bible" */
  label: string;
}

const RAW: Record<string, Record<string, string>> = {
  adventurer: {
    adventurer_bible: adventurerBible,
    adventurer_clipboard: adventurerClipboard,
    adventurer_pencil: adventurerPencil,
    adventurer_pointing: adventurerPointing,
    adventurer_victory: adventurerVictory,
    adventurer_walking: adventurerWalking,
  },
  mentor: {
    mentor_chair: mentorChair,
    mentor_cheer: mentorCheer,
    mentor_coffee: mentorCoffee,
    mentor_full_power: mentorFullPower,
    mentor_idle: mentorIdle,
    mentor_letter: mentorLetter,
  },
  npc: {
    npc_confused: npcConfused,
    npc_love: npcLove,
    npc_reading: npcReading,
    npc_salute: npcSalute,
    npc_walking: npcWalking,
    npc_wave: npcWave,
  },
  smart_guy: {
    smart_guy_books: smartGuyBooks,
    smart_guy_cheer: smartGuyCheer,
    smart_guy_hologram: smartGuyHologram,
    smart_guy_presenting: smartGuyPresenting,
    smart_guy_scroll: smartGuyScroll,
    smart_guy_writing: smartGuyWriting,
  },
  spirit: {
    spirit_calendar: spiritCalendar,
    spirit_glow: spiritGlow,
    spirit_idle: spiritIdle,
    spirit_love: spiritLove,
    spirit_sad: spiritSad,
    spirit_wave: spiritWave,
  },
  wizard: {
    wizard_idle: wizardIdle,
    wizard_talking: wizardTalking,
  },
};

export const SPRITE_FAMILIES = Object.keys(RAW);

export const SPRITE_CATALOG: SpriteEntry[] = Object.entries(RAW).flatMap(([family, poses]) =>
  Object.entries(poses).map(([pose, src]) => ({
    id: `${family}:${pose}`,
    family,
    pose,
    src,
    label: pose
      .replace(new RegExp(`^${family}_`), "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
);

const FALLBACK = RAW.adventurer.adventurer_pointing;

/** Resolve a (family, pose) pair to its PNG url, with a safe fallback. */
export function spriteSrc(family: string, pose: string): string {
  return RAW[family]?.[pose] ?? Object.values(RAW[family] ?? {})[0] ?? FALLBACK;
}

/** Pick the first sprite not already used by the given members (for uniqueness). */
export function firstFreeSprite(used: { spriteFamily: string; spritePose: string }[]): SpriteEntry {
  const taken = new Set(used.map((m) => `${m.spriteFamily}:${m.spritePose}`));
  return SPRITE_CATALOG.find((s) => !taken.has(s.id)) ?? SPRITE_CATALOG[0];
}
