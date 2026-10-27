
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
4. Never claim to have browsed, verified current law, or read a
   document unless that actually happened during this request.
5. The Consumer Protection Act, 2019 is an important central
   consumer-protection statute. Applicable rules and amendments
   may also matter.
6. The National Consumer Helpline is a pre-litigation grievance
   mechanism. It does not guarantee a particular outcome.
7. Do not invent legal organisations, citations, phone numbers,
   deadlines, or procedures.
8. Do not recommend the Competition Commission of India for an
   ordinary refund dispute without facts suggesting a competition
   law issue.
9. Never request passwords, OTPs, bank PINs, or other credentials.
10. If uncertain, say so instead of guessing.

RESPONSE STYLE

- Answer the user's question directly.
- Use plain English and numbered steps where helpful.
- Ask a short clarifying question when essential facts are missing.
- Distinguish general information from case-specific legal advice.
- Explain when a qualified Indian advocate or legal-aid service
  may be appropriate.
- End with a brief reminder that this is general legal information,
  not case-specific legal advice.
`;

const ANALYZER_PROMPT = `
You are the KANOON AI Legal Issue Analyzer, an Indian legal
information assistant. The user wants a structured analysis of
a legal problem, not a guaranteed legal opinion.

Analyze the user's description using the following headings:

LIKELY LEGAL ISSUE
Identify the likely topic in cautious language. Do not declare
that a legal violation definitely occurred unless the facts and
law clearly establish it.

WHAT WE KNOW
Summarize only facts actually supplied by the user. Do not invent
missing details.

IMPORTANT QUESTIONS
List up to five short questions that could materially affect the
next steps. Ask about relevant location, dates, agreements,
communications, or other facts only when appropriate.
Do not block all useful guidance while waiting for answers.

PRACTICAL NEXT STEPS
Give a prioritized, realistic list of actions. Prefer preserving
evidence, communicating in writing, checking the applicable
process, and using appropriate official channels.

DOCUMENTS AND EVIDENCE
List relevant records the user should consider preserving.
Do not ask the user to upload sensitive documents or credentials.

OFFICIAL RESOURCES TO CHECK
Name relevant official resources only when reasonably relevant.
Do not invent URLs, section numbers, court decisions, deadlines,
or claims that a resource was opened or verified. Official links
may be supplied separately by the application.

WHEN TO SEEK PROFESSIONAL HELP
Explain when the user should consider a qualified Indian advocate
or legal-aid service. If there may be an urgent deadline, safety
risk, criminal issue, or immediate threat, say to seek appropriate
urgent assistance.

RULES
- Use simple, neutral English.
- Tailor the response to the facts actually provided.
- State which important facts are unknown.
- Never guarantee a refund, legal remedy, or court outcome.
- Do not present guesses as established law.
- Do not request passwords, OTPs, bank PINs, or credentials.
- Do not repeat the user's entire message unnecessarily.
- This is general legal information, not case-specific advice.
- Keep the response useful and reasonably concise.
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
  },
  cyberCrime: {
    title: "National Cyber Crime Reporting Portal",
    url: "https://cybercrime.gov.in/"
  },
  nalsa: {
    title: "National Legal Services Authority",
    url: "https://nalsa.gov.in/legal-aid/"
  },
  eCourts: {
    title: "eCourts Services",
    url: "https://ecourts.gov.in/"
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
    .replace(/\r\n?/g, "\n")
    .replace(/\\+n/g, "\n")
    .replace(/\\+[ \t]*(?=\n|$)/g, "")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>:])/g, "$1")
    .replace(/\\/g, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/^[ \t]*\*[ \t]+/gm, "- ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isConsumerQuestion(message) {
  return /\b(consumer|refund|defective|damaged|faulty|seller|product|marketplace|e-commerce|ecommerce|consumer protection|consumer commission|return policy|online shopping)\b/i.test(message);
}

function isDefectiveRefundQuestion(message) {
  const mentionsProductOrSeller =
    /\b(defective|damaged|faulty|broken|refund|return|seller|merchant|product|order|purchase|marketplace|online shopping)\b/i.test(message);

  const mentionsRefundProblem =
    /\b(refund|return|defective|damaged|faulty|broken|refuses?|refused|denied|rejects?|rejected|not responding|not refunding|won't refund|cannot refund|can't refund)\b/i.test(message);

  return mentionsProductOrSeller && mentionsRefundProblem;
}

function isNCHQuestion(message) {
  return /\b(national consumer helpline|consumer helpline|1915|1800[\s-]*11[\s-]*4000)\b/i.test(message);
}

function isMaharashtraRentalQuestion(message) {
  const mentionsRental =
    /\b(rental agreement|rent agreement|lease agreement|tenancy agreement|landlord|tenant|leave and licence|leave and license|leave-and-licence|leave-and-license)\b/i.test(message);

  const mentionsMaharashtra =
    /\b(maharashtra|mumbai|pune|thane|nagpur|nashik)\b/i.test(message);

  return mentionsRental && mentionsMaharashtra;
}

function isCyberCrimeQuestion(message) {
  return /\b(cybercrime|cyber crime|online fraud|online scam|phishing|digital arrest|sextortion|hacked account|upi fraud|payment scam|identity theft)\b/i.test(message);
}

function getDefectiveRefundAnswer() {
  return `If an online seller refuses to refund a defective product in India, consider these steps:

1. Preserve your evidence. Keep the invoice, order confirmation, payment receipt, photographs or videos showing the defect, warranty details, return policy, and messages with the seller.

2. Contact the seller in writing. Describe the defect, when you received the product, and the resolution you want. Keep copies of your complaint and the response.

3. If you purchased through an online marketplace, use its official customer-support or grievance process. Save the complaint reference number.

4. Check the applicable return policy, warranty, and terms of sale. The remedies available depend on the circumstances and applicable law.

5. If unresolved, consider contacting the National Consumer Helpline through its official website:
https://consumerhelpline.gov.in/public/

The published telephone numbers are 1915 and 1800-11-4000. Check the official website for current service details. The helpline is a pre-litigation grievance mechanism and does not guarantee a refund.

6. If the dispute remains unresolved, consider the appropriate Consumer Disputes Redressal Commission. Check the current filing process and the forum applicable to your case before proceeding.

Keep your complaint factual. Do not share passwords, OTPs, or banking credentials.

This is general legal information, not case-specific legal advice.`;
}

function getNCHAnswer() {
  return `The National Consumer Helpline (NCH) is a Government of India service through which consumers can raise grievances at the pre-litigation stage.

Official website:
https://consumerhelpline.gov.in/public/

Published telephone numbers:
1915
1800-11-4000

Check the official contact page for current service hours and contact options.

Steps to consider:

1. Gather your invoice, order details, payment proof, and correspondence.
2. Visit the official NCH website.
3. Follow the current registration and grievance-submission instructions.
4. Save your complaint reference number and any replies.

NCH does not guarantee that a seller will issue a refund or that every grievance will be resolved. If the matter remains unresolved, you may need to consider the appropriate legal remedy.

Official contact details:
https://consumerhelpline.gov.in/public/contact

This is general legal information, not case-specific legal advice.`;
}

function getMaharashtraRentalAnswer() {
  return `Before signing a rental or leave-and-licence agreement in Maharashtra, consider these checks:

1. Verify the landlord's identity and authority to rent or license the property.

2. Confirm the property address, premises included, parking arrangements, and any shared facilities.

3. Read the financial terms carefully, including rent, deposit, payment dates, maintenance charges, utility bills, and other fees. Obtain receipts for payments.

4. Review the agreement duration, renewal terms, notice period, termination conditions, and any agreed charges.

5. Record the property's condition with dated photographs. Clarify responsibility for repairs and maintenance in writing.

6. Read every clause before signing. Make sure important promises and conditions are recorded in the agreement.

7. Check the legal requirements for your particular arrangement. Section 55 of the Maharashtra Rent Control Act, 1999 addresses written and registered agreements for arrangements covered by that section. Verify the applicable law and current amendments for your circumstances.

8. Keep a signed copy of the agreement, payment receipts, registration details where applicable, and related communications.

Official Maharashtra government reference:
https://lj.maharashtra.gov.in/en/document/the-maharashtra-rent-control-act-1999-text-as-on-7th-march-2025-2/

If there is a dispute or uncertainty about registration requirements, consult a qualified Maharashtra advocate.

This is general legal information, not case-specific legal advice.`;
}

function getReferenceSources(message) {
  const sources = [];

  if (isMaharashtraRentalQuestion(message)) {
    sources.push(SOURCES.maharashtraRent);
  }

  if (isNCHQuestion(message)) {
    sources.push(SOURCES.consumerHelpline, SOURCES.consumerContact);
  } else if (isConsumerQuestion(message)) {
    sources.push(
      SOURCES.consumerAct,
      SOURCES.consumerHelpline,
      SOURCES.consumerContact
    );
  }

  if (isCyberCrimeQuestion(message)) {
    sources.push(SOURCES.cyberCrime);
  }

  if (/\b(legal aid|free lawyer|legal services authority|cannot afford a lawyer)\b/i.test(message)) {
    sources.push(SOURCES.nalsa);
  }

  if (/\b(court case|case status|court hearing|eCourts)\b/i.test(message)) {
    sources.push(SOURCES.eCourts);
  }

  const seen = new Set();

  return sources.filter(source => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function getCorsHeaders(request, url) {
  const origin = request.headers.get("Origin");

  if (!origin || origin === url.origin) {
    return null;
  }

  return {
    error: "Request origin not allowed."
  };
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

      if (getCorsHeaders(request, url)) {
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

      const mode =
        body.mode === "analyze" ? "analyze" : "chat";

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

        // The analyzer uses a dedicated prompt and always returns
        // a structured issue analysis rather than a normal chat reply.
        if (mode === "analyze") {
          const result = await env.AI.run(MODEL, {
            messages: [
              {
                role: "system",
                content: ANALYZER_PROMPT
              },
              {
                role: "user",
                content: message
              }
            ],
            max_tokens: 750,
            temperature: 0.2
          });

          answer =
            result && typeof result.response === "string"
              ? cleanModelAnswer(result.response)
              : "";

          answerType = "legal_issue_analysis";
        } else if (isMaharashtraRentalQuestion(message)) {
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
              error: "The AI did not return a usable answer. Please try again."
            },
            502
          );
        }

        return jsonResponse({
          answer,
          answerType,
          disclaimer:
            "General legal information only; not verified legal advice. The listed links are official reference resources selected by topic. They were not necessarily opened or consulted to generate this answer. Check current law and consult a qualified lawyer for advice about your specific situation.",
          sources: getReferenceSources(message)
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
