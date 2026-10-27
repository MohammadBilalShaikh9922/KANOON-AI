
const MODEL = "@cf/meta/llama-3.2-1b-instruct";

const SYSTEM_PROMPT = `
You are KANOON AI, an Indian legal information assistant.

Provide cautious, practical general legal information in plain English.

LEGAL ACCURACY RULES

1. Never invent statutes, section numbers, judgments, authorities,
   websites, phone numbers, deadlines, or legal procedures.
2. If a fact depends on the user's state, dates, documents, or case
   details, explain what needs to be checked.
3. Never guarantee a legal outcome, refund, or court decision.
4. Do not claim to have browsed a website, read a legal document,
   checked a database, or verified current law unless that actually
   happened during this request.
5. The Consumer Protection Act, 2019 is an important central
   consumer-protection statute. Applicable rules and amendments
   may also matter.
6. The National Consumer Helpline is a pre-litigation grievance
   mechanism. It does not guarantee a particular outcome.
7. Do not recommend a fictional organisation called a
   "Consumer Dispute Resolution Forum".
8. Do not recommend the Competition Commission of India for an
   ordinary refund dispute without facts suggesting a competition
   law issue.
9. Never request passwords, OTPs, bank PINs, or other credentials.
10. If uncertain, say so instead of guessing.

RESPONSE STYLE

- Answer the user's question directly.
- Use simple language and numbered steps where helpful.
- Avoid unnecessary legal jargon and invented citations.
- Ask a short clarifying question when essential facts are missing.
- Distinguish general information from advice for a particular case.
- Explain when a qualified Indian advocate or legal-aid service
  may be appropriate.
- End with a brief reminder that this is general legal information,
  not case-specific legal advice.
`;

const SOURCES = {
  consumerAct: {
    title: "Consumer Protection Act, 2019 — India Code",
    url: "https://www.indiacode.nic.in/bitstream/123456789/15256/1/eng201935.pdf"
  },
  indiaCode: {
    title: "India Code — Official legislation repository",
    url: "https://www.indiacode.nic.in/"
  },
  consumerHelpline: {
    title: "National Consumer Helpline — Government of India",
    url: "https://consumerhelpline.gov.in/public/"
  },
  consumerContact: {
    title: "National Consumer Helpline — Contact Details",
    url: "https://consumerhelpline.gov.in/public/contact"
  },
  maharashtraRent: {
    title: "Maharashtra Rent Control Act, 1999 — Maharashtra Government",
    url: "https://lj.maharashtra.gov.in/en/document/the-maharashtra-rent-control-act-1999-text-as-on-7th-march-2025-2/"
  }
};

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
    .replace(/^[ \t]*\*[ \t]+/gm, "- ")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isConsumerQuestion(message) {
  return /\b(consumer|refund|defective|damaged|faulty|seller|product|marketplace|e-commerce|ecommerce|consumer protection|consumer commission|return policy|online shopping)\b/i.test(
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

function isNCHQuestion(message) {
  return /\b(national consumer helpline|consumer helpline|1915|1800[\s-]*11[\s-]*4000)\b/i.test(
    message
  );
}

function isMaharashtraRentalQuestion(message) {
  const mentionsRental =
    /\b(rental agreement|rent agreement|lease agreement|tenancy agreement|landlord|tenant|leave and licence|leave and license|leave-and-licence|leave-and-license)\b/i.test(
      message
    );

  const mentionsMaharashtra =
    /\b(maharashtra|mumbai|pune|thane|nagpur|nashik)\b/i.test(
      message
    );

  return mentionsRental && mentionsMaharashtra;
}

function getDefectiveRefundAnswer() {
  return `If an online seller refuses to refund a defective product in India, consider these steps:

1. Preserve your evidence. Keep the invoice, order confirmation, payment receipt, photographs or videos showing the defect, warranty details, return policy, and messages with the seller.

2. Contact the seller in writing. Describe the defect, when you received the product, and the resolution you want. Keep copies of your complaint and the response.

3. If you purchased through an online marketplace, use its official customer-support or grievance process. Save the complaint reference number.

4. Check the applicable return policy, warranty, and terms of sale. The remedies available depend on the circumstances and applicable law.

5. If unresolved, consider contacting the National Consumer Helpline through its official website: https://consumerhelpline.gov.in/public/

The published telephone numbers are 1915 and 1800-11-4000. Published telephone hours are 8 AM to 8 PM, excluding national holidays. The helpline is a pre-litigation grievance mechanism and does not guarantee a refund.

6. If the dispute remains unresolved, consider the appropriate Consumer Disputes Redressal Commission. Check the current filing process and the forum applicable to your case before proceeding.

Keep your complaint factual. Do not share passwords, OTPs, or banking credentials.

This is general legal information, not case-specific legal advice. Consult a qualified Indian advocate for advice about your particular dispute.`;
}

function getNCHAnswer() {
  return `The National Consumer Helpline (NCH) is a Government of India service through which consumers can raise grievances at the pre-litigation stage.

Official website:
https://consumerhelpline.gov.in/public/

Published telephone numbers:
1915
1800-11-4000

The official contact page lists telephone service from 8 AM to 8 PM, daily except national holidays. It also lists online grievance registration and other contact options.

Steps to consider:

1. Gather your invoice, order details, payment proof, and correspondence.
2. Visit the official NCH website.
3. Follow the current registration and grievance-submission instructions.
4. Save your complaint reference number and any replies.

NCH does not guarantee that a seller will issue a refund or that every grievance will be resolved. If the matter remains unresolved, you may need to consider the appropriate legal remedy.

Official contact details:
https://consumerhelpline.gov.in/public/contact

This is general legal information, not case-specific legal advice. Check the official website for current service details.`;
}

function getMaharashtraRentalAnswer() {
  return `Before signing a rental or leave-and-licence agreement in Maharashtra, consider these checks:

1. Verify the landlord's identity and authority to rent or license the property.

2. Confirm the property address, premises included, parking arrangements, and any shared facilities.

3. Read the financial terms carefully, including rent, deposit, payment dates, maintenance charges, utility bills, and other fees. Obtain receipts for payments.

4. Review the agreement duration, renewal terms, notice period, termination conditions, and any agreed charges.

5. Record the property's condition with dated photographs. Clarify responsibility for repairs and maintenance in writing.

6. Read every clause before signing. Make sure important promises and conditions are recorded in the agreement.

7. Check the legal requirements for your particular arrangement. Section 55 of the Maharashtra Rent Control Act, 1999 addresses written and registered agreements for letting premises or leave-and-licence arrangements covered by that section. Do not assume the same requirements apply identically to every arrangement; verify the applicable law and current amendments.

8. Keep a signed copy of the agreement, payment receipts, registration details where applicable, and related communications.

Official Maharashtra government reference:
https://lj.maharashtra.gov.in/en/document/the-maharashtra-rent-control-act-1999-text-as-on-7th-march-2025-2/

If there is a dispute, an unusual clause, or uncertainty about registration requirements, consult a qualified Maharashtra advocate.

This is general legal information, not case-specific legal advice.`;
}

function getReferenceSources(message) {
  if (isMaharashtraRentalQuestion(message)) {
    return [SOURCES.maharashtraRent];
  }

  if (isNCHQuestion(message)) {
    return [
      SOURCES.consumerHelpline,
      SOURCES.consumerContact
    ];
  }

  if (isConsumerQuestion(message)) {
    return [
      SOURCES.consumerAct,
      SOURCES.consumerHelpline,
      SOURCES.consumerContact
    ];
  }

  return [];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return jsonResponse(
          { error: "Use POST to send a chat message." },
          405
        );
      }

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
        let answerType = "ai_generated";

        if (isMaharashtraRentalQuestion(message)) {
          answer = getMaharashtraRentalAnswer();
          answerType = "predefined_general_information";
        } else if (isNCHQuestion(message)) {
          answer = getNCHAnswer();
          answerType = "predefined_general_information";
        } else if (isDefectiveRefundQuestion(message)) {
          answer = getDefectiveRefundAnswer();
          answerType = "predefined_general_information";
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

        const referenceSources = getReferenceSources(message);

        return jsonResponse({
          answer,
          answerType,
          disclaimer:
            "General legal information only; not verified legal advice. The listed links are official reference resources selected by topic. They were not necessarily opened or consulted to generate this answer. Check current law and consult a qualified lawyer for advice about your specific situation.",
          sources: referenceSources
        });
      } catch (error) {
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

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405
      });
    }

    if (!env.ASSETS) {
      return new Response(
        "Website assets are not configured.",
        { status: 503 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
