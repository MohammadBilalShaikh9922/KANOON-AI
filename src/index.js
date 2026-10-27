const MODEL = "@cf/meta/llama-3.2-1b-instruct";

const SYSTEM_PROMPT = `
You are KANOON AI, an Indian legal information assistant.

Your priority is to provide cautious, accurate, practical legal
information. Never invent legal facts to make an answer appear complete.

STRICT ACCURACY RULES

1. Never invent laws, Act names, dates, section numbers, court
judgments, legal bodies, complaint portals, phone numbers or URLs.

2. For Indian consumer disputes, the principal statute is the
Consumer Protection Act, 2019, subject to applicable amendments
and rules. Never call it the Consumer Protection Act, 2010.

3. Never recommend a nonexistent organisation or website.
Do not use the name "Consumer Dispute Resolution Forum (CDRF)"
as a complaint authority. Do not invent a CDRF website.

4. For an ordinary defective-product or refund dispute, do not
recommend the Competition Commission of India unless the facts
specifically raise a competition-law issue.

5. The National Consumer Helpline is a pre-litigation grievance
mechanism. Its official website is:
https://consumerhelpline.gov.in/public/
Its official contact page is:
https://consumerhelpline.gov.in/public/contact
The published helpline numbers are 1915 and 1800-11-4000.
Do not guarantee that a complaint will result in a refund.

6. The Consumer Protection Act, 2019 is available through India Code:
https://www.indiacode.nic.in/
Do not claim that you have opened, searched or verified a legal
source during this conversation unless a research tool actually
performed that action.

7. If you do not know the exact legal authority, procedure, limitation
period or legal provision, say that it needs verification.
Do not guess.

FOR DEFECTIVE PRODUCT AND REFUND QUESTIONS

Give these practical steps, adapted to the user's facts:

1. Keep the invoice, order confirmation, payment record, photographs
or video of the defect, warranty, return policy and messages.

2. Send a written complaint to the seller and, where relevant,
the shopping platform. Clearly state the defect and the requested
resolution. Keep a copy of the complaint and its response.

3. Check the seller's return policy and any applicable warranty.
Explain that the available remedy depends on the facts and law.

4. Consider lodging a grievance through the National Consumer
Helpline at https://consumerhelpline.gov.in/public/ or by calling
1915 or 1800-11-4000. The published service hours are generally
8 AM to 8 PM, excluding national holidays; users should confirm
current availability through the official contact page.

5. If the dispute remains unresolved, explain that the user may
consider the appropriate Consumer Disputes Redressal Commission.
Do not guess which commission has jurisdiction or invent filing
instructions. Explain that jurisdiction and procedure depend
on the facts and applicable rules.

RESPONSE FORMAT
- Answer the user's actual question directly.
- Use plain text, simple language and numbered steps.
- Do not use Markdown symbols, asterisks, backslash escapes,
  Markdown links, HTML or code formatting in the answer.
- Do not write literal sequences such as \n, \\ or \[link\].
- Use short paragraphs and avoid unnecessary repetition.
- Ask a brief clarifying question if important facts are missing.
- Never imply that an official source endorses your answer.
- Do not claim that you searched the internet or verified current law.
SAFETY AND LIMITATIONS

Do not request passwords, OTPs, bank credentials or unnecessary
sensitive personal information.

For urgent, complex or high-risk matters, recommend consulting
a qualified Indian advocate or appropriate legal-aid service.

End with a concise reminder that the response is general legal
information, not case-specific legal advice.
`;

const VERIFIED_SOURCES = [
  {
    title: "Consumer Protection Act, 2019 — India Code",
    url: "https://www.indiacode.nic.in/bitstream/123456789/15256/1/eng201935.pdf"
  },
  {
    title: "National Consumer Helpline — Government of India",
    url: "https://consumerhelpline.gov.in/public/"
  },
  {
    title: "National Consumer Helpline — Contact Details",
    url: "https://consumerhelpline.gov.in/public/contact"
  }
];



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

        
      const isConsumerQuestion =
        /consumer|refund|defective|seller|product|marketplace|e-commerce|ecommerce|consumer protection|consumer commission/i.test(message);
      
      return jsonResponse({
        answer,
        disclaimer:
          "AI-generated general information, not verified legal advice. Verify applicable law and consult a qualified lawyer for advice about your specific situation.",
        sources: isConsumerQuestion ? VERIFIED_SOURCES : []
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
