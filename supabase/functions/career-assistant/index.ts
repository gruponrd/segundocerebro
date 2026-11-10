// Temporarily disabled. No requests or personal data are forwarded to an AI provider.
Deno.serve(() => new Response(JSON.stringify({ error: "O assistente está desativado." }), {
  status: 503,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
}));
