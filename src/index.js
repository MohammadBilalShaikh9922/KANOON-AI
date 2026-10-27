
const MODEL = "@cf/meta/llama-3.2-1b-instruct";

const SYSTEM_PROMPT = `
You are KANOON AI, a legal information assistant focused on Indian law.

Rules:
- Provide general legal information, not a lawyer-client relationship or a guarantee of legal advice.
- Never invent laws, section numbers, court judgments, citations, case names, deadlines, or legal procedures.
- If unsure whether a law or provision is current, clearly say it needs verification from an official source.
- Ask concise clarifying questions when the facts or jurisdiction are unclear.
- Explain legal concepts in plain language and distinguish general information from case-specific advice.
- For serious criminal matters, urgent court deadlines, arrest, domestic violence, or immediate danger, recommend contacting a qualified Indian lawyer or appropriate emergency/legal-aid service promptly.
- Do not claim to have searched official legal databases unless a search was actually performed.
- Keep responses useful, structured, and concise.
- Remind users not to share passwords, identity numbers, bank details, or unnecessary confidential information.
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // AI chat API
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return jsonResponse(
          { error: "Use POST to send a chat message." },
          405
        );
      }

      // Accept requests from this website's own origin only.
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) {
        return jsonResponse({ error: "Request origin not allowed." }, 403);
      }

      if (!env.AI) {
        return jsonResponse(
          { error: "The AI service is not configured yet." },
          503
        );
      }

      const contentLength = Number(
        request.headers.get("Content-Length") || "0"
      );

      if (contentLength > 10000) {
        return jsonResponse(
          { error: "Message is too large. Please shorten it." },
          413
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON request." }, 400);
      }

      const message =
        typeof body.message === "string" ? body.message.trim() : "";

      if (!message) {
        return jsonResponse(
          { error: "Please enter a legal question." },
          400
        );
      }

      if (message.length > 3000) {
        return jsonResponse(
          { error: "Please limit your question to 3000 characters." },
          413
        );
      }

      try {
        const result = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message }
          ],
          max_tokens: 500,
          temperature: 0.2
        });

        const answer =
          result && typeof result.response === "string"
            ? result.response.trim()
            : "";

        if (!answer) {
          return jsonResponse(
            {
              error:
                "The AI did not return a usable answer. Please try again."
            },
            502
          );
        }

        return jsonResponse({
          answer,
          disclaimer:
            "AI-generated general information, not verified legal advice. Verify applicable law and consult a qualified lawyer for advice about your specific situation."
        });
      } catch (error) {
        // Keep internal errors out of the public response.
        console.error("KANOON AI inference failed:", error?.message || "Unknown error");

        return jsonResponse(
          {
            error:
              "The AI service is temporarily unavailable or its free allowance may be exhausted. Please try again later."
          },
          503
        );
      }
    }

    // Preserve static website delivery.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  }
};
