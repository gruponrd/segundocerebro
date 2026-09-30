// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureTelegramWebhook, telegramWebhookSecret } from "../../supabase/functions/_shared/telegramSetup";

afterEach(() => vi.unstubAllGlobals());

describe("server-only Telegram activation", () => {
  it("uses a stable secret and preserves explicit credentials across deployments", async () => {
    const secret = await telegramWebhookSecret("test-token-for-isolated-tests");
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
    expect(await telegramWebhookSecret("test-token-for-isolated-tests")).toBe(secret);
    expect(await telegramWebhookSecret("different-test-token")).not.toBe(secret);
    expect(await telegramWebhookSecret("test", "a".repeat(64))).toBe("a".repeat(64));
    await expect(telegramWebhookSecret("test", "short")).rejects.toThrow("Invalid webhook secret");
  });

  it("rejects another bot before registering or exposing a webhook", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { username: "AnotherBot" } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureTelegramWebhook("test", "a".repeat(64), "https://test.supabase.co", "SecondB2Bot")).rejects.toThrow("Unexpected bot identity");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("registers private-message updates and verifies delivery configuration without dropping queued updates", async () => {
    const url = "https://test.supabase.co/functions/v1/telegram-webhook";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { username: "SecondB2Bot" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { url } })));
    vi.stubGlobal("fetch", fetchMock);
    await ensureTelegramWebhook("test", "a".repeat(64), "https://test.supabase.co/", "SecondB2Bot");
    const registration = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(registration).toMatchObject({ url, secret_token: "a".repeat(64), allowed_updates: ["message", "callback_query"] });
    expect(registration).not.toHaveProperty("drop_pending_updates");
    expect(fetchMock.mock.calls[2][0]).toContain("getWebhookInfo");
  });
});
