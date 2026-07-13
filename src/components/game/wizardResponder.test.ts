import { describe, expect, it } from "vitest";
import { getWizardResponse } from "./wizardResponder";
import type { FaqEntry } from "@/lib/faqData";

const entries: FaqEntry[] = [
  {
    id: "test-published",
    topic: "Test Topic",
    question: "How does the test lane score?",
    keywords: ["testlane"],
    answer: "The test lane scores by testing.",
    status: "published",
  },
  {
    id: "test-pending",
    topic: "Unwritten Topic",
    question: "What is the unwritten rule?",
    keywords: ["unwrittenrule"],
    answer: "",
    status: "needs_content",
  },
];

describe("getWizardResponse", () => {
  it("matches a published entry passed in explicitly", () => {
    const result = getWizardResponse("tell me about testlane", entries);
    expect(result.matchedTopic).toBe("Test Topic");
    expect(result.answer).toContain("The test lane scores by testing.");
  });

  it("never returns a needs_content entry, even if its keywords match", () => {
    const result = getWizardResponse("what about unwrittenrule", entries);
    expect(result.matchedTopic).not.toBe("Unwritten Topic");
    expect(result.answer).not.toContain("Unwritten Topic");
  });

  it("falls back to the built-in FAQ_ENTRIES when no entries are passed", () => {
    const result = getWizardResponse("what is fables");
    expect(result.matchedTopic).toBe("FABLES Overview");
  });
});
