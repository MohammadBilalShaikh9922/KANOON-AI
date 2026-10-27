# 🔗 Live Website: https://kanoon-ai.bilalshaikh1339.workers.dev/

# KANOON AI — AI-Powered Indian Legal Information Assistant

KANOON AI is a web-based legal information assistant designed to help people understand common legal issues in India, explore official legal resources, organize relevant documents, and prepare basic legal drafts using an AI-powered interface.

The project aims to make legal information more accessible through a simple, responsive website with a clean white-and-gold design.

> **Disclaimer:** KANOON AI provides general legal information for educational and informational purposes only. It does not replace a qualified lawyer, provide guaranteed legal outcomes, or establish an advocate-client relationship.

## ✨ Features

- **AI Legal Assistant:** Ask questions about common legal topics and receive general information.
- **Legal Issue Analyzer:** Organize a legal query into the likely issue, known facts, important questions, practical next steps, and relevant evidence.
- **Legal Resource Library:** Explore legal resources and official reference links.
- **Official Legal Sources:** Access relevant government portals and legal-aid resources.
- **Legal Draft Generator:** Prepare basic legal drafts for review and editing.
- **Document Checklist:** Identify documents and evidence that may be relevant to a legal issue.
- **Suggested Questions:** Explore common legal topics using predefined shortcuts.
- **Responsive Interface:** Use the website on desktop and mobile devices.
- **White-and-Gold UI:** A clean interface designed for readability.
- **Public Access:** The website is currently designed to be accessible without creating an account.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML, CSS and JavaScript | Frontend interface and interactions |
| Cloudflare Workers | Website delivery and backend API |
| Cloudflare Workers AI | AI-powered legal information responses |
| Supabase | Legal resource data storage and retrieval |
| GitHub | Source code management and version control |

## 🧠 How It Works

1. The user opens the website and enters a legal question.
2. The frontend sends the question to the backend API.
3. The backend identifies applicable response logic and, where appropriate, requests a response from the AI model.
4. Relevant legal resources are selected for reference.
5. The website displays the response with appropriate disclaimers and available source links.

The Legal Issue Analyzer uses a structured response format to help users identify relevant facts, evidence, questions, and possible next steps. Its output is informational and should be independently verified.

## ⚖️ Areas of Legal Information

The application can help users explore topics such as:

- Consumer complaints and defective products
- Refund disputes
- Rental and landlord-tenant issues
- Cybercrime reporting
- General Indian legal information
- Legal aid and court-related resources

Coverage depends on the question, available resources, and the application's current implementation. The website should not be treated as a comprehensive legal database.

## 🏛️ Official Resources

The application may refer users to official resources such as:

- [India Code](https://www.indiacode.nic.in/) — Indian legislation and legal materials
- [National Consumer Helpline](https://consumerhelpline.gov.in/) — Consumer grievance assistance
- [National Cyber Crime Reporting Portal](https://cybercrime.gov.in/) — Cybercrime reporting
- [National Legal Services Authority (NALSA)](https://nalsa.gov.in/) — Legal services and legal aid
- [eCourts Services](https://ecourts.gov.in/) — Court-related information

Always verify the applicable law, current procedures, and deadlines using authoritative sources or a qualified legal professional.

## 🚀 Running the Project

### Prerequisites

- A GitHub account
- A Cloudflare account with Workers support
- A Supabase project
- The required Cloudflare Workers AI access and configuration

### 1. Clone the repository

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` with your actual GitHub repository details.

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Configure Supabase

1. Create or open your Supabase project.
2. Configure the `legal_resources` table and its required columns.
3. Add the legal resource records used by the application.
4. Configure Row Level Security (RLS) and policies so only intended operations are permitted.

Never expose a Supabase service-role key in frontend code or a public repository.

### 3. Configure Cloudflare

Configure the required Workers bindings and environment settings, including:

- The Supabase project URL
- The appropriate Supabase publishable key
- The Workers AI binding
- The static asset binding used to serve the frontend

Keep secrets in Cloudflare's environment or secret settings rather than committing them to GitHub.

### 4. Deploy

Deploy the project using the configuration and deployment workflow defined in the repository. After deployment, open the live website and test the assistant, analyzer, resource library, document checklist, and draft generator.

> **Note:** Exact installation and deployment commands depend on the repository's package files and Cloudflare configuration.

## 🔌 API Overview

### `POST /api/chat`

The backend accepts a legal question and returns a response with relevant metadata.

**Standard legal chat request:**

```json
{
  "message": "What can I do if a seller refuses to refund me?",
  "mode": "chat"
}
```

**Legal Issue Analyzer request:**

```json
{
  "message": "My landlord is refusing to return my security deposit.",
  "mode": "analyze"
}
```

The response structure includes fields such as:

- `answer` — the generated or predefined response
- `answerType` — the response category
- `disclaimer` — a legal information disclaimer
- `sources` — relevant reference resources

The actual response depends on the backend implementation and the question submitted.

## 🔐 Security and Responsible Use

- Do not submit passwords, banking details, identity documents, or other unnecessary sensitive personal information.
- Never place private API keys or service-role credentials in frontend JavaScript.
- Use restrictive database access policies and validate incoming API requests.
- Treat
