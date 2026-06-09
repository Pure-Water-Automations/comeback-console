// Placeholder rules — swap the copy later, the layout stays the same.
export interface Rule {
  index: string;
  kicker: string;
  title: string;
  body: string;
}

export const RULES: Rule[] = [
  {
    index: "01",
    kicker: "The Field",
    title: "Everything begins\nas a circle.",
    body: "Each player enters the field as a single point of intent. Placeholder copy — your first rule will live here.",
  },
  {
    index: "02",
    kicker: "Movement",
    title: "Mass attracts\nmass.",
    body: "Larger forms pull smaller ones into orbit. Replace this with the rule that governs how pieces move.",
  },
  {
    index: "03",
    kicker: "Collision",
    title: "When two meet,\none gives way.",
    body: "Contact resolves instantly and without appeal. This is placeholder text for the collision rule.",
  },
  {
    index: "04",
    kicker: "Scoring",
    title: "Stillness\nis a score.",
    body: "Points accrue to whoever holds the center longest. Drop your scoring logic into this slot.",
  },
  {
    index: "05",
    kicker: "The End",
    title: "The last circle\nwins.",
    body: "The round closes when only one form remains in motion. Final rule placeholder goes here.",
  },
];
