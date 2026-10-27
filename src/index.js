
const MODEL = "@cf/meta/llama-3.2-1b-instruct";

const SYSTEM_PROMPT = `
You are KANOON AI, an Indian legal information assistant.

Provide cautious, practical and accurate general legal information.
Never invent laws, section numbers, court judgments, legal authorities,
complaint portals, phone numbers, deadlines or URLs.

ACCURACY RULES

1. The principal Indian consumer-protection statute is the Consumer
   Protection Act, 2019, subject to applicable amendments and rules.

2. Never invent a legal organisation or complaint website. Do not
   recommend a supposed Consumer Dispute Resolution Forum (CDRF).

3. For ordinary refund disputes, do not recommend the Competition
   Commission of India unless the facts raise a relevant competition
   law issue.

4. The National Consumer Helpline is a pre-litigation grievance
   mechanism. Its official website is:
   https://consumerhelpline.gov.in/public/
   Its official contact page is:
   https://consumerhelpline.gov.in/public/contact

5. The published National Consumer Helpline numbers are 1915 and
   1800-11-4000. Do not guarantee a refund or successful complaint.

6. The Consumer Protection Act, 2019 is available through India Code:
   https://www.indiacode.nic.in/

7. Do not claim to have searched, opened or verified a source unless
   a research tool actually did so during this conversation.

8. If you do not know a legal detail, say it needs verification.
   Never guess a limitation period, jurisdiction or legal provision.

RESPONSE STYLE

- Answer the question directly in plain, simple text.
- Use numbered steps when helpful.
- Avoid Markdown formatting, HTML and code formatting.
- Do not output escaped Markdown or literal formatting sequences.
- Do not invent facts or claim that a source endorses your answer.
- Ask a concise clarifying question when important facts are missing.
- Protect the user's private information.
- End with a reminder that the response is general legal information,
  not case-specific legal advice.

For urgent, complex or high-risk matters, suggest consulting a
qualified Indian advocate or appropriate legal-aid service.
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

function cleanModelAnswer(value) {
  return String(value || "")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .replace(/\\(?=\d)/g, "")
    .replace(/\\+[ \t]*\r?\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .trim();
}

function isConsumerQuestion(message) {
  return /\b(consumer|refund|defective|damaged|faulty|seller|product|marketplace|e-commerce|ecommerce|consumer protection|consumer commission|return policy)\b/i.test(
    message
  );
}

function isDefectiveRefundQuestion(message) {
  const mentionsProductOrSeller =
    /\b(defective|damaged|faulty|broken|refund|return|seller|merchant|product|order|purchase|marketplace|online shopping)\b/i.test(
      message
    );

  const mentionsRefundProblem =
    /\b(refund|return|defective|damaged|faulty|broken|refuses?|refused|denied|rejects?|rejected|not responding|not refunding|won't refund|cannot refund|can't refund)\b/i.test(
      message
    );

  return mentionsProductOrSeller && mentionsRefundProblem;
}

function getDefectiveRefundAnswer() {
  return `If an online seller refuses to refund a defective product in India, take these steps:

1. Keep your evidence. Save the invoice, order confirmation, payment receipt, photographs or videos showing the defect, warranty details, return policy and messages with the seller.

2. Complain to the seller in writing. Explain the defect, when you received the product and what resolution you are requesting. Keep a copy of the complaint and any response.

3. Contact the shopping platform if you bought the product through a marketplace. Use its official customer-support or grievance process and keep the complaint reference number.

4. Check the return policy and applicable warranty. Your available remedies depend on the facts, the terms of sale and applicable law.

5. If the matter remains unresolved, consider registering a grievance with the National Consumer Helpline at https://consumerhelpline.gov.in/public/ or by calling 1915 or 1800-11-4000. This is a pre-litigation grievance mechanism; it does not guarantee a refund.

6. If the dispute remains unresolved, you may consider approaching the appropriate Consumer Disputes Redressal Commission. The correct forum and filing procedure depend on your circumstances and applicable rules, so verify them before filing.

Keep communications factual and respectful. Do not share passwords, OTPs or bank credentials when pursuing a complaint.

This is general legal information, not case-specific legal advice. For advice about your particular dispute, consult a qualified Indian advocate.`;
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
        return jsonResponse(
          { error: "Request origin not allowed." },
          403
        );
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
        return jsonResponse(
          { error: "Invalid JSON request." },
          400
        );
      }

      const message =
        typeof body.message === "string"
          ? body.message.trim()
          : "";

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
        let answer;

        // Use a predefined answer for common defective-product
        // refund disputes instead of relying on the small AI model.
        if (isDefectiveRefundQuestion(message)) {
          answer = getDefectiveRefundAnswer();
        } else {
          const result = await env.AI.run(MODEL, {
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT
              },
              {
                role: "user",
                content: message
              }
            ],
            max_tokens: 500,
            temperature: 0.2
          });

          answer =
            result && typeof result.response === "string"
              ? cleanModelAnswer(result.response)
              : "";
        }

        if (!answer) {
          return jsonResponse(
            {
              error:
                "The AI did not return a usable answer. Please try again."
            },
            502
          );
        }

        const consumerQuestion = isConsumerQuestion(message);

        return jsonResponse({
          answer,
          disclaimer:
            "AI-generated general information, not verified legal advice. Verify applicable law and consult a qualified lawyer for advice about your specific situation.",
          sources: consumerQuestion ? VERIFIED_SOURCES : []
        });
      } catch (error) {
        // Keep internal errors out of the public response.
        console.error(
          "KANOON AI inference failed:",
          error?.message || "Unknown error"
        );

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

    if (!env.ASSETS) {
      return new Response("Website assets are not configured.", {
        status: 503
      });
    }

    return env.ASSETS.fetch(request);
  }
};
