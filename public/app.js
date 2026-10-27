
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let toastTimer;

function toast(message) {
  const el = $("#toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

// --------------------------------------------------
// OFFICIAL LEGAL RESOURCE DIRECTORY
// --------------------------------------------------

const lawResources = [
  {
    tag: "OFFICIAL LEGISLATION",
    title: "India Code",
    desc: "Central Acts, subordinate legislation and legal materials published through the Government of India's legislative portal.",
    url: "https://www.indiacode.nic.in/",
    link: "Browse India Code"
  },
  {
    tag: "COURTS & JUDGMENTS",
    title: "Supreme Court of India",
    desc: "Official court website with judgments, cause lists, notices and institutional information.",
    url: "https://www.sci.gov.in/",
    link: "Visit Supreme Court"
  },
  {
    tag: "LEGAL AID",
    title: "National Legal Services Authority",
    desc: "Information about legal services, legal aid and access-to-justice programmes in India.",
    url: "https://nalsa.gov.in/legal-aid/",
    link: "Explore legal aid"
  },
  {
    tag: "CYBER SAFETY",
    title: "National Cyber Crime Portal",
    desc: "Official portal for reporting cybercrime and finding related reporting information.",
    url: "https://cybercrime.gov.in/",
    link: "Visit cybercrime portal"
  },
  {
    tag: "CONSUMER RIGHTS",
    title: "National Consumer Helpline",
    desc: "Government consumer grievance support and guidance for consumer-related complaints.",
    url: "https://consumerhelpline.gov.in/",
    link: "Visit consumer helpline"
  },
  {
    tag: "GOVERNMENT SERVICES",
    title: "eCourts Services",
    desc: "Court case information and services provided through the Indian eCourts system.",
    url: "https://ecourts.gov.in/",
    link: "Visit eCourts"
  }
];

function renderLaws(filter = "") {
  const grid = $("#lawGrid");
  if (!grid) return;

  const query = filter.trim().toLowerCase();

  const matches = lawResources.filter(resource =>
    `${resource.tag} ${resource.title} ${resource.desc}`
      .toLowerCase()
      .includes(query)
  );

  const count = $("#lawCount");

  if (count) {
    count.textContent =
      `${matches.length} resource${matches.length === 1 ? "" : "s"}`;
  }

  if (!matches.length) {
    grid.innerHTML =
      '<div class="notice">No matching resources found. Try a broader search term.</div>';
    return;
  }

  grid.innerHTML = matches.map(resource => `
    <article class="law-card">
      <span class="law-tag">${resource.tag}</span>
      <h3>${resource.title}</h3>
      <p>${resource.desc}</p>
      <a href="${resource.url}" target="_blank" rel="noopener noreferrer">
        ${resource.link} ↗
      </a>
    </article>
  `).join("");
}

renderLaws();

const yearElement = $("#year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// --------------------------------------------------
// PUBLIC PAGE NAVIGATION — NO SIGN-IN REQUIRED
// --------------------------------------------------

const pageNames = [
  "home",
  "assistant",
  "laws",
  "documents",
  "drafts",
  "about",
  "disclaimer",
  "privacy"
];

function navigate() {
  const requested = (window.location.hash || "#home")
    .slice(1)
    .split("?")[0];

  const pageName = pageNames.includes(requested)
    ? requested
    : "home";

  $$(".page").forEach(page => {
    page.classList.toggle("active", page.dataset.page === pageName);
  });

  $$("#nav a[data-nav]").forEach(link => {
    link.classList.toggle(
      "current",
      link.dataset.nav === pageName
    );
  });

  const nav = $("#nav");
  const menuButton = $("#mobileMenu");

  if (nav) nav.classList.remove("open");
  if (menuButton) menuButton.setAttribute("aria-expanded", "false");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("hashchange", navigate);

const mobileMenu = $("#mobileMenu");

if (mobileMenu) {
  mobileMenu.addEventListener("click", () => {
    const nav = $("#nav");
    if (!nav) return;

    const isOpen = nav.classList.toggle("open");
    mobileMenu.setAttribute("aria-expanded", String(isOpen));
  });
}

navigate();

// --------------------------------------------------
// HOME PAGE QUESTION SHORTCUTS
// --------------------------------------------------

$$("[data-prompt]").forEach(link => {
  link.addEventListener("click", () => {
    const chatInput = $("#chatInput");

    if (chatInput) {
      chatInput.value = link.dataset.prompt || "";
    }
  });
});

const homeQuestion = $("#homeQuestion");

if (homeQuestion) {
  homeQuestion.addEventListener("submit", event => {
    event.preventDefault();

    const input = $("#homeQuestionInput");
    const question = input ? input.value.trim() : "";

    if (!question) {
      toast("Please enter a question first.");
      return;
    }

    window.location.hash = "assistant";

    setTimeout(() => {
      const chatInput = $("#chatInput");

      if (chatInput) {
        chatInput.value = question;
        chatInput.focus();
      }
    }, 100);
  });
}

// --------------------------------------------------
// LAW LIBRARY SEARCH
// --------------------------------------------------

const lawSearch = $("#lawSearch");

if (lawSearch) {
  lawSearch.addEventListener("input", event => {
    renderLaws(event.target.value);
  });
}

// --------------------------------------------------
// SAFE TEXT OUTPUT
// --------------------------------------------------

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// --------------------------------------------------
// DEMONSTRATION LEGAL ASSISTANT
// --------------------------------------------------

function addMessage(text, sender, label = "") {
  const messages = $("#chatMessages");
  if (!messages) return;

  const item = document.createElement("div");

  item.className =
    "message " +
    (sender === "user" ? "user-message" : "assistant-message");

  const avatar = sender === "user" ? "You" : "K";

  const avatarHtml = sender === "user"
    ? ""
    : `<span class="message-avatar">${avatar}</span>`;

  item.innerHTML = `
    ${avatarHtml}
    <div class="bubble">
      <p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>
      ${label ? `<small>${escapeHtml(label)}</small>` : ""}
    </div>
  `;

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

function demoReply(question) {
  const query = question.toLowerCase();

  let topic = "General legal information";

  let guidance =
    "Start by writing down the key facts, dates, people or organisations involved, and the outcome you want. Keep copies of relevant communications and documents. Check the applicable law and official procedure for your location before taking action.";

  if (
    query.includes("tenant") ||
    query.includes("rent") ||
    query.includes("landlord") ||
    query.includes("deposit")
  ) {
    topic = "Housing and rental issues";

    guidance =
      "Review your rental agreement and any written record of the deposit, notice period, property condition and communications. Send a clear written request and keep proof of delivery. Rental rules can vary by state and the facts of your agreement, so check the relevant state law and seek local legal help if the dispute continues.";
  } else if (
    query.includes("consumer") ||
    query.includes("refund") ||
    query.includes("product") ||
    query.includes("seller")
  ) {
    topic = "Consumer rights";

    guidance =
      "Keep the invoice, order details, warranty, screenshots and messages with the seller or service provider. First make a dated written complaint and clearly state the resolution you seek. You can explore the National Consumer Helpline and official consumer commission resources. The correct forum and process depend on the facts and current rules.";
  } else if (
    query.includes("cyber") ||
    query.includes("fraud") ||
    query.includes("online") ||
    query.includes("scam")
  ) {
    topic = "Cyber safety";

    guidance =
      "If money has been lost, contact your bank or payment provider immediately and use India's official cybercrime reporting portal or helpline as appropriate. Preserve transaction IDs, messages, phone numbers and screenshots. Do not share OTPs or passwords. The national cybercrime helpline commonly used for financial cyber fraud in India is 1930; verify current official instructions promptly.";
  } else if (
    query.includes("employment") ||
    query.includes("salary") ||
    query.includes("job") ||
    query.includes("employer")
  ) {
    topic = "Employment issues";

    guidance =
      "Keep your appointment letter, contract, payslips, attendance records and written communications. Identify the state, type of employment and exact issue, because applicable rules and forums can differ. Consider a written request to HR or the employer and consult a qualified professional or relevant labour authority for case-specific advice.";
  }

  return { topic, guidance };
}

const chatForm = $("#chatForm");

if (chatForm) {
  chatForm.addEventListener("submit", event => {
    event.preventDefault();

    const input = $("#chatInput");
    if (!input) return;

    const question = input.value.trim();

    if (!question) {
      toast("Please type your legal question first.");
      return;
    }

    addMessage(question, "user");
    input.value = "";

    const { topic, guidance } = demoReply(question);

    setTimeout(() => {
      addMessage(
        `Demo topic: ${topic}\n\n` +
        `A possible starting point:\n${guidance}\n\n` +
        "Suggested next step: check the relevant official source and consider speaking with a qualified advocate if your situation is urgent or fact-specific.",
        "assistant",
        "DEMO RESPONSE · NOT VERIFIED LEGAL ADVICE"
      );
    }, 220);
  });
}

// Suggested topic buttons in the assistant sidebar
$$("[data-chat]").forEach(button => {
  button.addEventListener("click", () => {
    const input = $("#chatInput");
    if (!input) return;

    input.value = button.dataset.chat || "";
    input.focus();
  });
});

// --------------------------------------------------
// DOCUMENT EXPLAINER — LOCAL DEMO CHECKLIST
// --------------------------------------------------

const documentText = $("#documentText");
const documentLength = $("#documentLength");

if (documentText && documentLength) {
  documentText.addEventListener("input", event => {
    documentLength.textContent =
      `${event.target.value.length.toLocaleString()} characters`;
  });
}

const reviewDocument = $("#reviewDocument");

if (reviewDocument) {
  reviewDocument.addEventListener("click", () => {
    const input = $("#documentText");
    const output = $("#documentResult");

    if (!input || !output) return;

    const text = input.value.trim();

    if (text.length < 40) {
      toast("Please paste a little more text to prepare a checklist.");
      return;
    }

    output.classList.remove("hidden");

    output.innerHTML = `
      <h3>Review checklist</h3>
      <p>
        This demo has not interpreted the legal effect of your document.
        Use this checklist to guide a careful review:
      </p>
      <ul>
        <li>Identify the parties, dates, purpose and duration.</li>
        <li>Locate payment amounts, due dates, fees and refund terms.</li>
        <li>Look for termination, notice and renewal clauses.</li>
        <li>Check obligations, exceptions, penalties and dispute-resolution language.</li>
        <li>Confirm whether any referenced annexures or schedules are missing.</li>
        <li>Note unclear terms and questions to ask a qualified advocate.</li>
      </ul>
      <p>
        <strong>Important:</strong> verify every clause in context and check
        applicable current law. This is a generic checklist, not document
        analysis or legal advice.
      </p>
    `;
  });
}

// --------------------------------------------------
// DRAFT GENERATOR
// --------------------------------------------------

const draftForm = $("#draftForm");

if (draftForm) {
  draftForm.addEventListener("submit", event => {
    event.preventDefault();

    const issueInput = $("#issue");
    const output = $("#draftOutput");

    if (!issueInput || !output) return;

    const issue = issueInput.value.trim();

    if (!issue) {
      toast("Describe the issue before generating a draft.");
      return;
    }

    const type = $("#draftType")?.value || "consumer";
    const recipient =
      $("#recipient")?.value.trim() || "[Recipient name / department]";

    const resolution =
      $("#resolution")?.value.trim() ||
      "[State the resolution you are requesting]";

    const tone = $("#tone")?.value || "Polite and professional";

    const subjectMap = {
      consumer: "Consumer grievance and request for resolution",
      deposit: "Request for return of rental security deposit",
      records: "Request for copies of relevant documents or records",
      service: "Service concern and request for resolution"
    };

    const opening =
      tone === "Firm and formal"
        ? "I am writing to formally raise the following concern and request a timely written response."
        : "I am writing to seek your assistance in resolving the concern described below.";

    const draft = [
      "To,",
      recipient,
      "",
      "Date: [Insert date]",
      "",
      `Subject: ${subjectMap[type] || subjectMap.consumer}`,
      "",
      "Dear Sir/Madam,",
      "",
      opening,
      "",
      "Details of the issue:",
      issue,
      "",
      "Requested resolution:",
      resolution,
      "",
      "Please acknowledge receipt of this letter and let me know the next steps within a reasonable time. I have retained relevant records and can provide appropriate supporting information if required.",
      "",
      "I hope this matter can be resolved fairly and promptly.",
      "",
      "Yours faithfully,",
      "[Your name]",
      "[Your contact details, if appropriate]",
      "",
      "---",
      "Review this template before use. Confirm facts, recipient, deadlines and applicable procedure. This is a general draft, not a lawyer-reviewed legal notice."
    ].join("\n");

    output.classList.remove("hidden");

    output.innerHTML = `
      <h3>Your editable sample draft</h3>
      <div style="white-space: pre-wrap; overflow-wrap: anywhere;">${escapeHtml(draft)}</div>
      <button id="copyDraft" type="button" class="button button-outline" style="margin-top:14px">
        Copy draft
      </button>
    `;

    const copyButton = $("#copyDraft");

    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(draft);
          toast("Draft copied to clipboard.");
        } catch {
          toast("Copy was blocked by the browser. Select and copy the text manually.");
        }
      });
    }
  });
}

// Authentication has intentionally been removed.
// KANOON AI currently works without user accounts.
