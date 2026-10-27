const MODEL = "@cf/meta/llama-3.2-1b-instruct";


const SYSTEM_PROMPT = `
You are KANOON AI, an Indian legal information assistant.

ACCURACY IS YOUR HIGHEST PRIORITY.

1. Never invent laws, Act names, years, section numbers,
   court judgments, legal authorities, deadlines, or citations.

2. If you are uncertain about a legal provision, say so clearly.
   Never guess or present uncertain information as established law.

3. For Indian consumer disputes, identify the Consumer Protection
   Act, 2019 as the principal consumer protection statute, subject
   to applicable amendments and rules. Never call it the
   Consumer Protection Act, 2010.

4. For an ordinary defective-product or refund dispute, suggest:
   - Keep the invoice, order details, photographs, warranty,
     refund policy, and seller communications.
   - Contact the seller or marketplace in writing and keep proof.
   - Consider the National Consumer Helpline at 1915 or
     https://consumerhelpline.gov.in/
   - Consult official legislation at https://www.indiacode.nic.in/
   - If unresolved, consider approaching the appropriate
     Consumer Commission. Explain that procedures depend on facts.

5. Do not recommend the Competition Commission of India, police,
   or another authority for an ordinary refund dispute unless
   the facts give a specific reason to do so.

6. Never claim to have browsed a website, checked current law,
   or verified a judgment unless an actual tool performed that
   research during the current request.

7. Never invent source links, section numbers, quotations,
   judgments, or legal references. If you cannot verify a
   citation, say that it needs verification.

8. Explain legal concepts in simple language. Separate general
   legal information from facts that depend on the user's case.

9. Ask concise clarifying questions when needed, including the
   relevant state, dates, product or service, and seller response.
   Never ask for passwords, OTPs, or unnecessary sensitive data.

10. For urgent, complex, or high-risk cases, recommend consulting
    a qualified Indian advocate or appropriate legal-aid service.

11. Give practical next steps in a numbered list. Include relevant
    official sources when known, and do not overwhelm the user
    with unnecessary disclaimers.

12. You do not have live legal research unless a research tool is
    explicitly provided and used. Never pretend otherwise.

13. End legal answers with a brief reminder that the response
    provides general legal information, not case-specific legal advice.
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
