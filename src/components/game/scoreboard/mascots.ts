import type { Community } from "@/lib/comebackData";
import { leaderSpriteFor } from "@/lib/leaders";

import adventurerPointing from "@/assets/sprites/adventurer/adventurer_pointing.png";
import adventurerVictory from "@/assets/sprites/adventurer/adventurer_victory.png";
import adventurerWalking from "@/assets/sprites/adventurer/adventurer_walking.png";
import mentorCheer from "@/assets/sprites/mentor/mentor_cheer.png";
import mentorFullPower from "@/assets/sprites/mentor/mentor_full_power.png";
import mentorIdle from "@/assets/sprites/mentor/mentor_idle.png";
import npcLove from "@/assets/sprites/npc/npc_love.png";
import npcSalute from "@/assets/sprites/npc/npc_salute.png";
import npcWave from "@/assets/sprites/npc/npc_wave.png";
import smartGuyCheer from "@/assets/sprites/smart_guy/smart_guy_cheer.png";
import smartGuyHologram from "@/assets/sprites/smart_guy/smart_guy_hologram.png";
import smartGuyPresenting from "@/assets/sprites/smart_guy/smart_guy_presenting.png";
import spiritGlow from "@/assets/sprites/spirit/spirit_glow.png";
import spiritIdle from "@/assets/sprites/spirit/spirit_idle.png";
import spiritWave from "@/assets/sprites/spirit/spirit_wave.png";
import wizardIdle from "@/assets/sprites/wizard/wizard_idle.png";
import wizardTalking from "@/assets/sprites/wizard/wizard_talking.png";

type MascotFamily = Community["mascot"];
export type MascotPose = "hero" | "podium" | "thumb";

export const mascotSprites = {
  adventurer: {
    hero: adventurerPointing,
    podium: adventurerVictory,
    thumb: adventurerWalking,
  },
  mentor: {
    hero: mentorFullPower,
    podium: mentorCheer,
    thumb: mentorIdle,
  },
  npc: {
    hero: npcWave,
    podium: npcLove,
    thumb: npcSalute,
  },
  smart_guy: {
    hero: smartGuyPresenting,
    podium: smartGuyCheer,
    thumb: smartGuyHologram,
  },
  spirit: {
    hero: spiritGlow,
    podium: spiritGlow,
    thumb: spiritIdle,
  },
  wizard: {
    hero: wizardTalking,
    podium: wizardTalking,
    thumb: wizardIdle,
  },
} satisfies Record<MascotFamily, Record<MascotPose, string>>;

export function mascotFor(family: MascotFamily, pose: MascotPose) {
  return mascotSprites[family][pose];
}

/**
 * The sprite to show for a community: its real leader portrait when we have one,
 * otherwise the generic mascot-family pose. Use this everywhere a community is
 * represented on the scoreboard/console so leaders show up consistently.
 */
export function communitySprite(community: Pick<Community, "id" | "mascot">, pose: MascotPose) {
  return leaderSpriteFor(community.id) ?? mascotFor(community.mascot, pose);
}

/**
 * True when `communitySprite` returns smooth leader illustration art (which must
 * NOT use pixelated image-rendering) vs a pixel-art mascot fallback.
 */
export function communityIsLeaderArt(community: Pick<Community, "id">) {
  return leaderSpriteFor(community.id) !== null;
}
