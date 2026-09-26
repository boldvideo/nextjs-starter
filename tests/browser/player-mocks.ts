import type { Page } from "@playwright/test";

// Ask panels use Mux; the custom watch page uses Video.js's native video element.
export const player = (page: Page) => page.locator("mux-player, video").first();

export const preparePlayer = async (page: Page): Promise<void> => {
  await player(page).waitFor({ state: "attached" });
  await player(page).evaluate(element => {
    let paused = true;
    let currentTime = 0;
    Object.defineProperties(element, {
      paused: { get: () => paused }, ended: { get: () => false },
      currentTime: { get: () => currentTime, set: value => { currentTime = value; } },
      play: { value: () => { paused = false; element.dispatchEvent(new Event("play")); return Promise.resolve(); } },
      pause: { value: () => { paused = true; element.dispatchEvent(new Event("pause")); } },
    });
  });
};
