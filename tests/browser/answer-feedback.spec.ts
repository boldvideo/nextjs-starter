import { expect, test, type APIRequestContext } from "@playwright/test";

const rows = async (request: APIRequestContext, name = "feedback") =>
  (await request.get(`http://127.0.0.1:4311/test/${name}`)).json();

test.beforeEach(async ({ request }) => {
  await request.delete("http://127.0.0.1:4311/test/feedback");
  await request.delete("http://127.0.0.1:4311/test/chats");
});

for (const surface of ["video", "ask"]) {
  test(`${surface}: completed answers vote, update reasons, delete, and keep older votes independent`, async ({ page, request }) => {
    await page.goto(surface === "video" ? "/v/voice-demo" : "/ask");
    const input = page.locator("textarea").filter({ visible: true });
    await input.fill("pending");
    await input.press("Enter");
    await expect(page.locator("[data-streaming-message]").filter({ visible: true })).toBeVisible();
    const up = page.getByRole("button", { name: "Good answer", exact: true }).filter({ visible: true });
    const down = page.getByRole("button", { name: "Bad answer", exact: true }).filter({ visible: true });
    await expect(up).toHaveCount(0);
    await expect(up).toBeVisible();
    await expect(up).toHaveAttribute("title", "Good answer");
    const first = (await rows(request, "chats"))[0];
    expect(first.messageId).not.toBe(first.interactionId);

    await up.click();
    await expect(up).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => rows(request)).toEqual([{
      method: "POST", path: `/api/v1/ai/messages/${first.messageId}/feedback`,
      body: { rating: "up" }, status: 200, trustedTenant: true,
    }]);
    await up.click();
    await expect.poll(async () => (await rows(request)).at(-1).method).toBe("DELETE");
    await expect(up).toHaveAttribute("aria-pressed", "false");
    await down.click();
    await expect.poll(async () => (await rows(request)).at(-1).body).toEqual({ rating: "down" });
    const wrong = page.getByRole("button", { name: "Wrong", exact: true }).filter({ visible: true });
    await wrong.click();
    await page.getByRole("button", { name: "Too short", exact: true }).filter({ visible: true }).click();
    await expect.poll(async () => (await rows(request)).at(-1).body).toEqual({ rating: "down", reasons: ["wrong", "too_short"] });
    await wrong.click();
    await page.getByRole("button", { name: "Other…", exact: true }).filter({ visible: true }).click();
    const note = page.getByRole("textbox", { name: "Feedback note" }).filter({ visible: true });
    await expect(note).toHaveAttribute("maxlength", "500");
    await note.fill("Please explain the tradeoff.");
    await note.press("Enter");
    await expect.poll(async () => (await rows(request)).at(-1).body).toEqual({
      rating: "down", reasons: ["too_short", "other"], note: "Please explain the tradeoff.",
    });

    await input.fill("pending second answer");
    await input.press("Enter");
    await expect(page.locator("[data-streaming-message]").filter({ visible: true })).toBeVisible();
    await expect(up).toHaveCount(1);
    await up.first().click();
    await expect.poll(async () => (await rows(request)).at(-1)).toMatchObject({
      path: `/api/v1/ai/messages/${first.messageId}/feedback`, body: { rating: "up" },
    });
    await expect(up).toHaveCount(2);
    await expect(up.last()).toHaveAttribute("aria-pressed", "false");
    await input.fill("no-message-id");
    await input.press("Enter");
    await expect(input).toBeEnabled();
    await expect(page.locator("[data-streaming-message]")).toHaveCount(0);
    await expect(up).toHaveCount(2);
  });
}

test("feedback is optimistic, failures restore votes/details, and pending feedback never blocks chat", async ({ page, request }) => {
  await page.goto("/ask?q=first");
  const up = page.getByRole("button", { name: "Good answer", exact: true });
  const down = page.getByRole("button", { name: "Bad answer", exact: true });
  await down.click();
  const wrong = page.getByRole("button", { name: "Wrong", exact: true });
  await wrong.click();
  await expect.poll(async () => (await rows(request)).length).toBe(2);
  let fail!: () => Promise<void>;
  await page.route("**/api/ai/messages/*/feedback", route => new Promise<void>(resolve => {
    fail = async () => { await route.fulfill({ status: 503 }); resolve(); };
  }));
  for (const button of [up, down, wrong]) {
    const requestStarted = page.waitForRequest("**/api/ai/messages/*/feedback");
    await button.click();
    await requestStarted;
    if (button === up) await expect(up).toHaveAttribute("aria-pressed", "true");
    if (button === down) await expect(down).toHaveAttribute("aria-pressed", "false");
    await expect(up).toBeDisabled();
    await expect(page.locator("textarea").filter({ visible: true })).toBeEnabled();
    await fail();
    await expect(down).toHaveAttribute("aria-pressed", "true");
    await expect(wrong).toHaveAttribute("aria-pressed", "true");
    await expect(up).toBeEnabled();
  }
});

test("Ask history uses the persisted assistant ID, with no local vote persistence", async ({ page, request }) => {
  await page.goto("/ask/signed-history");
  const up = page.getByRole("button", { name: "Good answer", exact: true });
  await expect(up).toHaveCount(1);
  await up.click();
  await expect.poll(async () => (await rows(request)).at(-1)).toMatchObject({
    path: "/api/v1/ai/messages/signed-answer/feedback", body: { rating: "up" },
  });
  await page.reload();
  await expect(up).toHaveAttribute("aria-pressed", "false");
});

test("feedback proxy validates payloads, strips untrusted fields, and propagates upstream failure", async ({ request }) => {
  const path = "/api/ai/messages/proxy-answer/feedback";
  for (const data of [null, { rating: "good" }, { rating: "down", reasons: ["unknown"] },
    { rating: "down", reasons: "wrong" }, { rating: "down", note: 5 }, { rating: "down", note: "x".repeat(501) }]) {
    expect((await request.post(path, { data })).status()).toBe(400);
  }
  expect(await rows(request)).toEqual([]);
  const data = { rating: "down", reasons: ["not_in_video", "off_topic", "other"], note: "x".repeat(500) };
  const response = await request.post(path, { data: { ...data, viewer: "forged", api_key: "untrusted" } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ data: { message_id: "proxy-answer", ...data } });
  expect((await rows(request))[0]).toMatchObject({ body: data, trustedTenant: true });
  expect((await request.delete(path)).status()).toBe(204);
  for (const method of ["post", "delete"] as const) {
    expect((await request[method]("/api/ai/messages/feedback-fail/feedback", { data: { rating: "up" } })).status()).toBe(503);
  }
});
