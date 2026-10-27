
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
// SAFE HTML, URL AND ANSWER HELPERS
// --------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

// Normalize real and escaped newlines, escaped Markdown punctuation,
// and common formatting artifacts from AI-generated answers.
function normalizeAnswerText(value) {
  let text = String(value ?? "").replace(/\r\n?/g, "\n");

  // Convert backslash + real newline and literal escaped "\n"
  // into normal line breaks.
  text = text.replace(/\\+(?:[ \t]*\n|n)/g, "\n");

  // Remove Markdown escaping, including escaped list punctuation.
  text = text.replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1");

  // Fix numbered lists such as "1\." and "2\.".
  text = text.replace(/(^|\n)([ \t]*\d+)\\\./g, "$1$2.");

  // Remove any remaining stray backslashes from formatted answers.
  text = text.replace(/\\/g, "");

  // Make common Markdown formatting readable as plain text.
  text = text
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/(^|\n)[ \t]*\*[ \t]+/g, "$1- ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

// Remove known closing disclaimers so the interface can display
// one consistent disclaimer without duplicating the answer's ending.
function removeTrailingDisclaimer(value) {
  let answer = normalizeAnswerText(value);

  const disclaimerPatterns = [
    /(?:\s*This is general legal information, not case-specific legal advice\.?)(?:\s*Consult a qualified Indian advocate for advice about your particular dispute\.?)?\s*$/i,

    /(?:\s*This is general legal information\.?)(?:\s*Check the official website for current service details\.?)?\s*$/i,

    /(?:\s*This is general legal information, not case-specific legal advice\.?)(?:\s*Consult a qualified Maharashtra advocate for advice about your particular situation\.?)?\s*$/i,

    /(?:\s*General legal information only; not verified legal advice\.?)(?:\s*The listed links are official reference resources selected by topic\.?)?(?:\s*They were not necessarily opened or consulted to generate this answer\.?)?(?:\s*Check current law and consult a qualified lawyer for advice about your specific situation\.?)?\s*$/i,

    /(?:\s*General legal information only; not case-specific legal advice\.?)\s*$/i
  ];

  // Repeat because an answer may end with more than one disclaimer.
  let previousAnswer;

  do {
    previousAnswer = answer;

    for (const pattern of disclaimerPatterns) {
      answer = answer.replace(pattern, "").trim();
    }
  } while (answer !== previousAnswer);

  return answer;
}

// --------------------------------------------------
// SUPABASE CONFIGURATION
// Only a publishable key belongs in frontend JavaScript.
// Never put a service_role or secret key here.
// --------------------------------------------------

const SUPABASE_URL = "https://kjyeplfpthoqwxzkgzzb.supabase.co";
const SUPABASE_KEY = "sb_publishable_ciKRaCwZ8FCsE8shneFcjA_LBW6fmwR";

// --------------------------------------------------
// OFFICIAL FALLBACK LEGAL RESOURCE DIRECTORY
// --------------------------------------------------

const fallbackLawResources = [
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

let lawResources = [...fallbackLawResources];
let lawsLoadedFromSupabase = false;

// --------------------------------------------------
// LAW LIBRARY RENDERING
// --------------------------------------------------

function renderLaws(filter = "") {
  const grid = $("#lawGrid");
  if (!grid) return;

  const query = String(filter).trim().toLowerCase();

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

  grid.innerHTML = matches.map(resource => {
    const url = safeHttpsUrl(resource.url);

    return `
      <article class="law-card">
        <span class="law-tag">${escapeHtml(resource.tag)}</span>
        <h3>${escapeHtml(resource.title)}</h3>
        <p>${escapeHtml(resource.desc)}</p>
        ${
          url
            ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                 ${escapeHtml(resource.link || "Open source")} ↗
               </a>`
            : ""
        }
      </article>
    `;
  }).join("");
}

// --------------------------------------------------
// LOAD LEGAL RESOURCES FROM SUPABASE
// Table: public.legal_resources
// --------------------------------------------------

async function loadLawResources() {
  const grid = $("#lawGrid");
  const status = $("#lawStatus");
  const searchInput = $("#lawSearch");

  if (grid) {
    grid.innerHTML =
      '<div class="notice">Loading legal resources...</div>';
  }

  if (status) {
    status.textContent = "Connecting to the legal resource database...";
  }

  try {
    const endpoint =
      `${SUPABASE_URL}/rest/v1/legal_resources` +
      "?select=id,title,description,category,source_url" +
      "&order=title.asc";

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No records were returned by the legal resource table.");
    }

    const databaseResources = data
      .filter(item =>
        item &&
        typeof item.title === "string" &&
        item.title.trim() !== "" &&
        typeof item.source_url === "string" &&
        safeHttpsUrl(item.source_url) !== ""
      )
      .map(item => ({
        tag: item.category || "LEGAL RESOURCE",
        title: item.title,
        desc: item.description || "Visit the source for more information.",
        url: item.source_url,
        link: "Open official source"
      }));

    if (databaseResources.length === 0) {
      throw new Error("No usable legal resource records were found.");
    }

    lawResources = databaseResources;
    lawsLoadedFromSupabase = true;

    console.info(
      `KANOON AI: Loaded ${lawResources.length} resources from Supabase.`
    );

    if (status) {
      status.textContent =
        `Loaded ${lawResources.length} resources from the database.`;
    }
  } catch (error) {
    lawsLoadedFromSupabase = false;
    lawResources = [...fallbackLawResources];

    console.warn(
      "KANOON AI: Could not load database resources. Showing fallback links.",
      error
    );

    if (status) {
      status.textContent =
        "The database is unavailable. Showing the built-in official resource links instead.";
    }
  }

  renderLaws(searchInput ? searchInput.value : "");
}

renderLaws();
loadLawResources();

// --------------------------------------------------
// FOOTER YEAR
// --------------------------------------------------

const yearElement = $("#year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// --------------------------------------------------
// PUBLIC PAGE NAVIGATION
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

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", "false");
  }

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
// CHAT MESSAGE RENDERING
// --------------------------------------------------

function addMessage(text, sender, label = "") {
  const messages = $("#chatMessages");
  if (!messages) return null;

  const item = document.createElement("div");

  item.className =
    "message " +
    (sender === "user" ? "user-message" : "assistant-message");

  const avatarHtml = sender === "user"
    ? ""
    : '<span class="message-avatar">K</span>';

  // Escape content before inserting it into the page.
  // Newlines are converted to <br> only after HTML escaping.
  const displayText = normalizeAnswerText(text);

  item.innerHTML = `
    ${avatarHtml}
    <div class="bubble">
      <p>${escapeHtml(displayText).replace(/\n/g, "<br>")}</p>
      ${label ? `<small>${escapeHtml(label)}</small>` : ""}
    </div>
  `;

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;

  return item;
}

// --------------------------------------------------
// OFFICIAL LEGAL RESOURCE LINKS
// --------------------------------------------------

function addOfficialSources(sources) {
  const messages = $("#chatMessages");

  if (!messages || !Array.isArray(sources) || sources.length === 0) {
    return;
  }

  const safeSources = sources
    .filter(source =>
      source &&
      typeof source.title === "string" &&
      typeof source.url === "string"
    )
    .map(source => ({
      title: source.title.trim(),
      url: safeHttpsUrl(source.url)
    }))
    .filter(source => source.title && source.url);

  if (safeSources.length === 0) return;

  const sourceBox = document.createElement("div");
  sourceBox.className = "message assistant-message";

  const linksHtml = safeSources.map(source => `
    <li>
      <a
        href="${escapeHtml(source.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >${escapeHtml(source.title)} ↗</a>
    </li>
  `).join("");

  sourceBox.innerHTML = `
    <span class="message-avatar">K</span>
    <div class="bubble">
      <strong>Official legal resources</strong>
      <ul>${linksHtml}</ul>
      <small>
        These are relevant reference links. Their appearance here
        does not mean the AI opened or relied on them for this answer.
      </small>
    </div>
  `;

  messages.appendChild(sourceBox);
  messages.scrollTop = messages.scrollHeight;
}

function addLoadingMessage() {
  const messages = $("#chatMessages");
  if (!messages) return null;

  const item = document.createElement("div");
  item.className = "message assistant-message";

  item.innerHTML = `
    <span class="message-avatar">K</span>
    <div class="bubble">
      <p>Preparing your response...</p>
      <small>Connecting to KANOON AI</small>
    </div>
  `;

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;

  return item;
}

// --------------------------------------------------
// LIVE AI LEGAL ASSISTANT
// Calls the same-origin Cloudflare Worker API.
// --------------------------------------------------

const chatForm = $("#chatForm");

if (chatForm) {
  chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const input = $("#chatInput");
    if (!input) return;

    const question = input.value.trim();

    if (!question) {
      toast("Please type your legal question first.");
      return;
    }

    if (question.length > 3000) {
      toast("Please keep your question within 3000 characters.");
      return;
    }

    if (chatForm.dataset.requestPending === "true") {
      return;
    }

    const submitButton = chatForm.querySelector(
      'button[type="submit"], button:not([type])'
    );

    chatForm.dataset.requestPending = "true";

    if (submitButton) {
      submitButton.disabled = true;
    }

    addMessage(question, "user");
    input.value = "";

    const loadingMessage = addLoadingMessage();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: question
        })
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an unexpected response. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "The AI service is temporarily unavailable."
        );
      }

      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The AI returned an empty answer. Please try again.");
      }

      if (loadingMessage) {
        loadingMessage.remove();
      }

      // Strip formatting artifacts and known trailing disclaimers.
      const answer = removeTrailingDisclaimer(data.answer);

      if (!answer) {
        throw new Error("The AI returned an empty answer after formatting.");
      }

      // Display one concise disclaimer in the answer.
      // Do not append the backend disclaimer a second time.
      const singleDisclaimer =
        "General legal information only; not case-specific legal advice.";

      addMessage(
        `${answer}\n\n${singleDisclaimer}`,
        "assistant",
        "GENERAL LEGAL INFORMATION"
      );

      addOfficialSources(data.sources);

    } catch (error) {
      if (loadingMessage) {
        loadingMessage.remove();
      }

      addMessage(
        error instanceof TypeError
          ? "I could not connect to the AI service. Please check your internet connection and try again."
          : error.message || "Something went wrong. Please try again later.",
        "assistant",
        "CONNECTION OR SERVICE NOTICE"
      );

    } finally {
      chatForm.dataset.requestPending = "false";

      if (submitButton) {
        submitButton.disabled = false;
      }

      input.focus();
    }
  });
}

// --------------------------------------------------
// SUGGESTED TOPIC BUTTONS
// --------------------------------------------------

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

// --------------------------------------------------
// AUTHENTICATION
// Intentionally disabled. KANOON AI is public for now.
// --------------------------------------------------
