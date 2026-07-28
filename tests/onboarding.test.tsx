import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  exerciseGuide,
  GettingStarted,
  ratingGuide,
} from "../src/components/GettingStarted";
import { isNewRemoteProfile, type RemoteState } from "../src/lib/remote";

function remoteProfile(created: boolean): RemoteState {
  return {
    profile: { name: "Anna", created },
    cards: [],
    progress: [],
    meta: {},
  };
}

describe("instrukcja pierwszego uruchomienia", () => {
  it("otwiera się tylko dla imienia utworzonego właśnie w bazie", () => {
    expect(isNewRemoteProfile(remoteProfile(true))).toBe(true);
    expect(isNewRemoteProfile(remoteProfile(false))).toBe(false);
    expect(isNewRemoteProfile(null)).toBe(false);
  });

  it("krótko wyjaśnia metodę i znaczenie trzech ocen", () => {
    const html = renderToStaticMarkup(
      <GettingStarted name="Anna" onFinish={() => undefined} />,
    );
    expect(html).toContain("Cześć, Anna");
    expect(html).toContain("Powtórki rozłożone w czasie");
    expect(html).toContain("Pomiń");
    expect(html).toContain("Dalej");
    for (const item of ratingGuide) {
      expect(html).toContain(item.label);
      expect(html).toContain(item.timing);
      expect(html).toContain(item.description);
    }
  });

  it("obejmuje odsłuch, pisanie, wybór i rodzajniki", () => {
    expect(exerciseGuide.map((item) => item.title)).toEqual([
      "Odsłuch",
      "Pisanie",
      "Wybór",
      "Rodzajniki",
    ]);
  });
});
