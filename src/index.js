const MODEL = "@cf/meta/llama-3.2-1b-instruct";

const SYSTEM_PROMPT = `
You are KANOON AI, an Indian legal information assistant.

Provide cautious, practical general legal information in plain English.

LEGAL ACCURACY RULES
1. Never invent statutes, section numbers, judgments, authorities,
   websites, phone numbers, deadlines, or legal procedures.
2. Explain when facts depend on location, dates, documents, or circumstances.
3. Never guarantee a legal outcome, refund, or court decision.
4. Never claim to have browsed or verified current law unless that happened.
5. Do not invent legal organisations, citations, deadlines, or procedures.
6. Never request passwords, OTPs, bank PINs, or other credentials.
7. If uncertain, say so instead of guessing.

RESPONSE STYLE
- Answer directly in plain English.
- Use numbered steps where helpful.
- Ask short clarifying questions when essential facts are missing.
- Distinguish general information from case-specific legal advice.
- Recommend a qualified Indian advocate or legal-aid service when appropriate.
- End with a brief legal information disclaimer.
`;

const ANALYZER_PROMPT = `
You are the KANOON AI Legal Issue Analyzer, an Indian legal
information assistant.

Use these exact headings:

LIKELY LEGAL ISSUE
WHAT WE KNOW
IMPORTANT QUESTIONS
PRACTICAL NEXT STEPS
DOCUMENTS AND EVIDENCE
OFFICIAL RESOURCES TO CHECK
WHEN TO SEEK PROFESSIONAL HELP

Identify the likely issue cautiously. Summarize only facts supplied
by the user. List up to five relevant questions. Give useful initial
steps even when facts are missing.

For rental deposit disputes, consider the agreement, deposit amount,
move-out date, property condition, communications, and reasons for
withholding the deposit. Do not assume every deduction is unlawful.

Never invent laws, section numbers, deadlines, judgments, or procedures.
Never guarantee an outcome. Never request passwords, OTPs, bank PINs,
or other credentials.

Use simple English and keep the response reasonably concise.
This is general legal information, not case-specific legal advice.
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
    /\b(rental agreement|rent agreement|lease agreement|tenancy agreement|landlord|tenant|leave and licence|leave and license|leave-and-licence|leave-and-license|security deposit|rental deposit|rent deposit)\b/i.test(message);

  const mentionsMaharashtra =
    /\b(maharashtra|mumbai|pune|thane|nagpur|nashik)\b/i.test(message);

  return mentionsRental && mentionsMaharashtra;
}

function isRentalDepositDispute(message) {
  const mentionsDeposit =
    /\b(security deposit|rental deposit|rent deposit|deposit money|deposit back|return (?:my|the|our) deposit|advance deposit)\b/i.test(message);

  const mentionsRentalContext =
    /\b(landlord|tenant|rent|rental|lease|tenancy|leave and licence|leave and license|apartment|flat|rented property)\b/i.test(message);

  const mentionsDispute =
    /\b(refus(?:e|es|ed|ing)|withhold(?:s|ing)?|not return(?:ing)?|won't return|will not return|cannot return|can't return|not giving back|deduct(?:ed|ing|ions)?|dispute|refusing to pay|refusing to return)\b/i.test(message);

  return mentionsDeposit && mentionsRentalContext && mentionsDispute;
}

function isCyberCrimeQuestion(message) {
  return /\b(cybercrime|cyber crime|online fraud|online scam|phishing|digital arrest|sextortion|hacked account|upi fraud|payment scam|identity theft)\b/i.test(message);
}

function getRentalDepositAnalyzerAnswer(message) {
  const isMaharashtra = isMaharashtraRentalQuestion(message);

  const locationGuidance = isMaharashtra
    ? `Because this appears to concern Maharashtra, consult the Maharashtra Government's published Rent Control Act reference. Whether specific provisions apply depends on the type of arrangement, agreement, and facts.`
    : `Applicable rules may depend on the state or territory where the property is located. Check the relevant local law and agreement before relying on a particular remedy.`;

  return `LIKELY LEGAL ISSUE

This appears to be a rental security-deposit dispute. The main questions are what the agreement says about returning the deposit, whether deductions are claimed, and whether the landlord has explained why the money is being withheld.

WHAT WE KNOW

- You describe a landlord refusing to return a security deposit.
- The amount, move-out date, agreement terms, and stated reason for withholding the money are not yet known.

IMPORTANT QUESTIONS

1. What was the deposit amount, and when did you move out or return possession?
2. Was there a written rental or leave-and-licence agreement? What does it say about the deposit and deductions?
3. Has the landlord given a reason, such as repairs, unpaid bills, or a notice-period issue?
4. Do you have proof of the deposit payment and messages about repayment?
5. Where is the property located, and have you already requested repayment in writing?

PRACTICAL NEXT STEPS

1. Review the agreement for deposit-return terms, permitted deductions, notice requirements, and move-out conditions.
2. Ask the landlord in writing to return the deposit. If deductions are claimed, request an itemised explanation and supporting bills or records.
3. Keep your communications factual and save messages, emails, letters, and delivery confirmations.
4. Preserve evidence of the property's condition when you left, including dated photographs or videos if available.
5. If the dispute remains unresolved, consider a written demand and seek advice from a qualified local advocate or legal-aid service about suitable options.

Do not assume every deduction is unlawful. The agreement, property condition, unpaid charges, and other circumstances may affect the position.

DOCUMENTS AND EVIDENCE

- Rental or leave-and-licence agreement and any renewal.
- Bank transfer record, receipt, or other proof of deposit payment.
- Proof of rent and utility payments, where relevant.
- Move-in and move-out photographs, videos, inspection reports, and handover records.
- Messages, emails, and letters about the deposit or deductions.
- Any deduction statement, repair bills, or explanation from the landlord.

Share documents only with trusted professionals when necessary, and redact unrelated sensitive personal or financial information.

OFFICIAL RESOURCES TO CHECK

- Check the applicable state law and your agreement.
- Check whether a government legal-aid service can assist if you qualify.
- ${locationGuidance}

WHEN TO SEEK PROFESSIONAL HELP

Consider consulting a local advocate if the amount is substantial, the landlord continues to refuse repayment, the agreement is unclear, or a formal legal notice or proceeding is being considered. Ask promptly if you suspect a time limit may apply. If there are threats or an immediate safety concern, seek appropriate local assistance.

This is general legal information, not case-specific legal advice.`;
}

function getDefectiveRefundAnswer() {
  return `If an online seller refuses to refund a defective product in India, consider these steps:

1. Preserve your evidence. Keep the invoice, order confirmation, payment receipt, photographs or videos showing the defect, warranty details, return policy, and messages with the seller.

2. Contact the seller in writing. Describe the defect, when you received the product, and the resolution you want. Keep copies of your complaint and the response.

3. If you purchased through an online marketplace, use its official customer-support or grievance process. Save the complaint reference number.

4. Check the applicable return policy, warranty, and terms of sale. Available remedies depend on the circumstances and applicable law.

5. If unresolved, consider contacting the National Consumer Helpline:
https://consumerhelpline.gov.in/public/

The published telephone numbers are 1915 and 1800-11-4000. Check the official website for current service details. The helpline is a pre-litigation grievance mechanism and does not guarantee a refund.

6. If the dispute remains unresolved, consider the appropriate Consumer Disputes Redressal Commission. Check the current filing process and applicable forum before proceeding.

Do not share passwords, OTPs, or banking credentials.

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
4. Save your complaint reference number and replies.

NCH does not guarantee that a seller will issue a refund or that every grievance will be resolved. If the matter remains unresolved, you may need to consider the appropriate legal remedy.

Official contact details:
https://consumerhelpline.gov.in/public/contact

This is general legal information, not case-specific legal advice.`;
}

function getMaharashtraRentalAnswer() {
  return `Before signing a rental or leave-and-licence agreement in Maharashtra, consider these checks:

1. Verify the landlord's identity and authority to rent or license the property.
2. Confirm the property address, premises included, parking arrangements, and shared facilities.
3. Read the financial terms carefully, including rent, deposit, payment dates, maintenance charges, utility bills, and other fees. Obtain receipts.
4. Review the agreement duration, renewal terms, notice period, termination conditions, and agreed charges.
5. Record the property's condition with dated photographs. Clarify responsibility for repairs and maintenance in writing.
6. Read every clause before signing and record important promises in the agreement.
7. Check the legal requirements for your particular arrangement. Section 55 of the Maharashtra Rent Control Act, 1999 addresses written and registered agreements for arrangements covered by that section. Verify the applicable law and current amendments.
8. Keep a signed copy of the agreement, payment receipts, registration details where applicable, and related communications.

Official Maharashtra government reference:
https://lj.maharashtra.gov.in/en/document/the-maharashtra-rent-control-act-1999-text-as-on-7th-march-2025-2/

For uncertainty about registration requirements, consult a qualified Maharashtra advocate.

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

        if (mode === "analyze" && isRentalDepositDispute(message)) {
          answer = getRentalDepositAnalyzerAnswer(message);
          answerType = "predefined_legal_issue_analysis";
        } else if (mode === "analyze") {
          if (!env.AI) {
            return jsonResponse(
              { error: "The AI service is not configured yet." },
              503
            );
          }

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
          if (!env.AI) {
            return jsonResponse(
              { error: "The AI service is not configured yet." },
              503
            );
          }

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
