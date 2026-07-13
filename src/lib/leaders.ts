// Real JRPG sprites of the Northeast leaders, mapped to their communities.
// Source art lives in src/assets/sprites/leaders/ (resized from the leadership
// directory export). Leader → community comes from the NE Leadership Directory
// sheet (1Og8MEgO7vuc2AvNiLkDz3wlxhaNEhQc0Z1Ic8qIla9c).
//
// Render sites prefer a community's leader sprite and fall back to the generic
// mascot family when a community has no leader art yet (e.g. Mid-Hudson).

import atsushiTakino from "@/assets/sprites/leaders/atsushi-takino.png";
import barbaraRobertson from "@/assets/sprites/leaders/barbara-robertson.png";
import clementinoGavilan from "@/assets/sprites/leaders/clementino-gavilan.png";
import danielRendel from "@/assets/sprites/leaders/daniel-rendel.png";
import demianDunkley from "@/assets/sprites/leaders/demian-dunkley.png";
import emiljunRapada from "@/assets/sprites/leaders/emiljun-rapada.png";
import gregoryBreland from "@/assets/sprites/leaders/gregory-breland.png";
import gregoryOdlin from "@/assets/sprites/leaders/gregory-odlin.png";
import hoonmoonChoi from "@/assets/sprites/leaders/hoonmoon-choi.png";
import ibrahimHamed from "@/assets/sprites/leaders/ibrahim-hamed.png";
import joshuaGurtatowski from "@/assets/sprites/leaders/joshua-gurtatowski.png";
import justinOkamoto from "@/assets/sprites/leaders/justin-okamoto.png";
import kazuhideKikuchi from "@/assets/sprites/leaders/kazuhide-kikuchi.png";
import kiyokaKomiya from "@/assets/sprites/leaders/kiyoka-komiya.png";
import landonDoroski from "@/assets/sprites/leaders/landon-doroski.png";
import leonitaMachado from "@/assets/sprites/leaders/leonita-machado.png";
import lloydPumphrey from "@/assets/sprites/leaders/lloyd-pumphrey.png";
import maraAllaire from "@/assets/sprites/leaders/mara-allaire.png";
import markBeaudoin from "@/assets/sprites/leaders/mark-beaudoin.png";
import miilhanStephens from "@/assets/sprites/leaders/miilhan-stephens.png";
import mikaRothstein from "@/assets/sprites/leaders/mika-rothstein.png";
import nadyaKazak from "@/assets/sprites/leaders/nadya-kazak.png";
import norikoTenepre from "@/assets/sprites/leaders/noriko-tenepre.png";
import shizukoIwaya from "@/assets/sprites/leaders/shizuko-iwaya.png";
import shotaIwasaki from "@/assets/sprites/leaders/shota-iwasaki.png";
import simoneDoroski from "@/assets/sprites/leaders/simone-doroski.png";
import takayoshiMiyamoto from "@/assets/sprites/leaders/takayoshi-miyamoto.png";
import tomCorley from "@/assets/sprites/leaders/tom-corley.png";

export interface Leader {
  slug: string;
  name: string;
  title: string;
  sprite: string;
  /** Community id this leader is the public face of (omitted for regional staff). */
  communityId?: string;
  /** Secondary role at a community (assistant pastor, CARP, etc.). */
  supportsCommunityId?: string;
}

// Full roster — usable for a directory, the NJ party panel, etc.
export const LEADERS: Leader[] = [
  // ── Community leads (the face of each community) ──────────────────────────
  {
    slug: "barbara-robertson",
    name: "Barbara Robertson",
    title: "Lead Pastor — New Jersey",
    sprite: barbaraRobertson,
    communityId: "new-jersey",
  },
  {
    slug: "kazuhide-kikuchi",
    name: "Kazuhide Kikuchi",
    title: "Pastor — Belvedere",
    sprite: kazuhideKikuchi,
    communityId: "belvedere",
  },
  {
    slug: "hoonmoon-choi",
    name: "Hoonmoon Choi",
    title: "Pastor / National KEA President",
    sprite: hoonmoonChoi,
    communityId: "new-york-kea",
  },
  // Manhattan's new pastor is Francis and Connecticut's is Denthew, but we don't
  // have their sprite art yet — demote the prior leads to secondary so those
  // communities show the neutral mascot (not a wrong face) until art arrives.
  {
    slug: "joshua-gurtatowski",
    name: "Joshua Gurtatowski",
    title: "Former Interim Pastor — Manhattan",
    sprite: joshuaGurtatowski,
    supportsCommunityId: "manhattan",
  },
  {
    slug: "simone-doroski",
    name: "Simone Doroski",
    title: "Former Pastor — Connecticut",
    sprite: simoneDoroski,
    supportsCommunityId: "connecticut",
  },
  {
    slug: "miilhan-stephens",
    name: "Miilhan Stephens",
    title: "Pastor — Boston",
    sprite: miilhanStephens,
    communityId: "boston",
  },
  {
    slug: "shota-iwasaki",
    name: "Shota Iwasaki",
    title: "Pastor — Philadelphia",
    sprite: shotaIwasaki,
    communityId: "philadelphia",
  },
  {
    slug: "takayoshi-miyamoto",
    name: "Takayoshi Miyamoto",
    title: "Pastor — Queens",
    sprite: takayoshiMiyamoto,
    communityId: "queens",
  },
  {
    slug: "leonita-machado",
    name: "Leonita Machado",
    title: "Pastor — Worcester",
    sprite: leonitaMachado,
    communityId: "worcester",
  },
  {
    slug: "emiljun-rapada",
    name: "Emiljun Rapada",
    title: "Pastor — Elizabeth",
    sprite: emiljunRapada,
    communityId: "elizabeth",
  },
  {
    slug: "lloyd-pumphrey",
    name: "Lloyd Pumphrey",
    title: "Interim Pastor — Albany",
    sprite: lloydPumphrey,
    communityId: "albany",
  }, // The directory also lists Sebastian Huemer as Albany pastor, but only Pumphrey has sprite art in the export.
  {
    slug: "mark-beaudoin",
    name: "Mark Beaudoin",
    title: "Pastor — Rhode Island",
    sprite: markBeaudoin,
    communityId: "rhode-island",
  },
  {
    slug: "tom-corley",
    name: "Tom Corley",
    title: "Pastor — Long Island",
    sprite: tomCorley,
    communityId: "long-island",
  },
  {
    slug: "gregory-odlin",
    name: "Gregory Odlin",
    title: "Pastor — Maine",
    sprite: gregoryOdlin,
    communityId: "maine",
  },
  {
    slug: "mara-allaire",
    name: "Mara Allaire",
    title: "Pastor — New Hampshire",
    sprite: maraAllaire,
    communityId: "new-hampshire",
  },
  {
    slug: "ibrahim-hamed",
    name: "Ibrahim Hamed",
    title: "Pastor — Vermont",
    sprite: ibrahimHamed,
    communityId: "vermont",
  },

  // ── Assistant / secondary community leaders ───────────────────────────────
  {
    slug: "atsushi-takino",
    name: "Atsushi Takino",
    title: "Assistant Pastor — New Jersey",
    sprite: atsushiTakino,
    supportsCommunityId: "new-jersey",
  },
  {
    slug: "mika-rothstein",
    name: "Mika Rothstein",
    title: "Assistant Pastor — Belvedere",
    sprite: mikaRothstein,
    supportsCommunityId: "belvedere",
  },
  {
    slug: "noriko-tenepre",
    name: "Noriko Tenepre",
    title: "Assistant Pastor — Elizabeth",
    sprite: norikoTenepre,
    supportsCommunityId: "elizabeth",
  },
  {
    slug: "clementino-gavilan",
    name: "Clementino Gavilan",
    title: "Pastor — Bronx",
    sprite: clementinoGavilan,
    communityId: "bronx",
  },

  // ── Regional / national staff (no single community) ───────────────────────
  {
    slug: "demian-dunkley",
    name: "Rev. Demian Dunkley",
    title: "Regional President",
    sprite: demianDunkley,
  },
  {
    slug: "daniel-rendel",
    name: "Rev. Daniel Rendel",
    title: "Regional Leadership",
    sprite: danielRendel,
  },
  {
    slug: "gregory-breland",
    name: "Gregory Breland",
    title: "NE Regional Coordinator",
    sprite: gregoryBreland,
  },
  {
    slug: "justin-okamoto",
    name: "Justin Okamoto",
    title: "Regional Staff (former Belvedere Pastor)",
    sprite: justinOkamoto,
    supportsCommunityId: "belvedere",
  },
  {
    slug: "landon-doroski",
    name: "Landon Doroski",
    title: "NE Blessing & Family Ministry",
    sprite: landonDoroski,
  },
  {
    slug: "shizuko-iwaya",
    name: "Shizuko Iwaya",
    title: "Regional Book-Keeper",
    sprite: shizukoIwaya,
  },
  { slug: "kiyoka-komiya", name: "Kiyoka Komiya", title: "Regional Staff", sprite: kiyokaKomiya },
  {
    slug: "nadya-kazak",
    name: "Nadya Kazak",
    title: "Pastor — Mid-Hudson",
    sprite: nadyaKazak,
    communityId: "mid-hudson",
  },
];

// communityId → the leader who is its public face.
const LEADER_BY_COMMUNITY: Record<string, Leader> = {};
for (const l of LEADERS) {
  if (l.communityId && !LEADER_BY_COMMUNITY[l.communityId]) LEADER_BY_COMMUNITY[l.communityId] = l;
}

export const LEADER_BY_SLUG: Record<string, Leader> = Object.fromEntries(
  LEADERS.map((l) => [l.slug, l]),
);

/** The lead leader for a community, or undefined if none has art yet. */
export function leaderFor(communityId: string): Leader | undefined {
  return LEADER_BY_COMMUNITY[communityId];
}

/** The community's leader sprite, or null to fall back to the mascot family. */
export function leaderSpriteFor(communityId: string): string | null {
  return LEADER_BY_COMMUNITY[communityId]?.sprite ?? null;
}
