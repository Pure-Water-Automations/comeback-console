import type { Community } from "@/lib/comebackData";

import adventurerPointing from "@/assets/sprites/adventurer/adventurer_pointing.png";
import mentorCoffee from "@/assets/sprites/mentor/mentor_coffee.png";
import mentorFullPower from "@/assets/sprites/mentor/mentor_full_power.png";
import npcWave from "@/assets/sprites/npc/npc_wave.png";
import smartGuyPresenting from "@/assets/sprites/smart_guy/smart_guy_presenting.png";
import spiritGlow from "@/assets/sprites/spirit/spirit_glow.png";
import wizardTalking from "@/assets/sprites/wizard/wizard_talking.png";

type MascotFamily = Community["mascot"];

const dashboardMascots = {
  adventurer: adventurerPointing,
  mentor: mentorFullPower,
  npc: npcWave,
  smart_guy: smartGuyPresenting,
  spirit: spiritGlow,
  wizard: wizardTalking,
} satisfies Record<MascotFamily, string>;

export function dashboardMascotFor(family: MascotFamily) {
  return dashboardMascots[family];
}

export const mentorCoachSprite = mentorCoffee;
