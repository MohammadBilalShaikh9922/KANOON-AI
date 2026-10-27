const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const toast = (message) => { const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove("show"),3200); };

const lawResources = [
 {tag:"OFFICIAL LEGISLATION",title:"India Code",desc:"Central Acts, subordinate legislation and legal materials published through the Government of India's legislative portal.",url:"https://www.indiacode.nic.in/",link:"Browse India Code"},
 {tag:"COURTS & JUDGMENTS",title:"Supreme Court of India",desc:"Official court website with judgments, cause lists, notices and institutional information.",url:"https://www.sci.gov.in/",link:"Visit Supreme Court"},
 {tag:"LEGAL AID",title:"National Legal Services Authority",desc:"Information about legal services, legal aid and access-to-justice programmes in India.",url:"https://nalsa.gov.in/legal-aid/",link:"Explore legal aid"},
 {tag:"CYBER SAFETY",title:"National Cyber Crime Portal",desc:"Official portal for reporting cybercrime and finding related reporting information.",url:"https://cybercrime.gov.in/",link:"Visit cybercrime portal"},
 {tag:"CONSUMER RIGHTS",title:"National Consumer Helpline",desc:"Government consumer grievance support and guidance for consumer-related complaints.",url:"https://consumerhelpline.gov.in/",link:"Visit consumer helpline"},
 {tag:"GOVERNMENT SERVICES",title:"eCourts Services",desc:"Court case information and services provided through the Indian eCourts system.",url:"https://ecourts.gov.in/",link:"Visit eCourts"}
];

function renderLaws(filter="") {
 const grid=$("#lawGrid"); if(!grid) return;
 const q=filter.trim().toLowerCase();
 const matches=lawResources.filter(x=>(x.tag+" "+x.title+" "+x.desc).toLowerCase().includes(q));
 $("#lawCount").textContent=`${matches.length} resource${matches.length===1?"":"s"}`;
 grid.innerHTML=matches.length?matches.map(x=>`<article class="law-card"><span class="law-tag">${x.tag}</span><h3>${x.title}</h3><p>${x.desc}</p><a href="${x.url}" target="_blank" rel="noopener noreferrer">${x.link} ↗</a></article>`).join(""):`<div class="notice">No matching resources found. Try a broader search term.</div>`;
}
renderLaws();
$("#year").textContent=new Date().getFullYear();

const pageNames=["home","assistant","laws","documents","drafts","signin","about","disclaimer","privacy"];
function navigate() {
 const requested=(location.hash||"#home").slice(1).split("?")[0];
 const name=pageNames.includes(requested)?requested:"home";
 $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===name));
 $$("#nav a[data-nav]").forEach(a=>a.classList.toggle("current",a.dataset.nav===name));
 $("#nav").classList.remove("open");
 window.scrollTo({top:0,behavior:"smooth"});
}
window.addEventListener("hashchange",navigate);
$("#mobileMenu").addEventListener("click",()=>$("#nav").classList.toggle("open"));
navigate();

$$("[data-prompt]").forEach(a=>a.addEventListener("click",()=>{ $("#chatInput").value=a.dataset.prompt; }));
$("#homeQuestion").addEventListener("submit",e=>{e.preventDefault();const q=$("#homeQuestionInput").value.trim();if(!q){toast("Please enter a question first.");return;}location.hash="assistant";setTimeout(()=>{ $("#chatInput").value=q; $("#chatInput").focus(); },80);});
$("#lawSearch").addEventListener("input",e=>renderLaws(e.target.value));

function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function addMessage(text,who,label){const item=document.createElement("div");item.className="message "+(who==="user"?"user-message":"assistant-message");const avatar=who==="user"?"You":"K";item.innerHTML=`${who==="user"?"":`<span class="message-avatar">${avatar}</span>`}<div class="bubble"><p>${escapeHtml(text).replace(/\n/g,"<br>")}</p>${label?`<small>${label}</small>`:""}</div>`;$("#chatMessages").appendChild(item);$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;}
function demoReply(question){
 const q=question.toLowerCase();
 let topic="General legal information";
 let guidance="Start by writing down the key facts, dates, people or organisations involved, and the outcome you want. Keep copies of relevant communications and documents. Check the applicable law and official procedure for your location before taking action.";
 if(q.includes("tenant")||q.includes("rent")||q.includes("landlord")||q.includes("deposit")){topic="Housing and rental issues";guidance="Review your rental agreement and any written record of the deposit, notice period, property condition and communications. Send a clear written request and keep proof of delivery. Rental rules can vary by state and the facts of your agreement, so check the relevant state law and seek local legal help if the dispute continues.";}
 else if(q.includes("consumer")||q.includes("refund")||q.includes("product")||q.includes("seller")){topic="Consumer rights";guidance="Keep the invoice, order details, warranty, screenshots and messages with the seller or service provider. First make a dated written complaint and clearly state the resolution you seek. You can explore the National Consumer Helpline and official consumer commission resources. The correct forum and process depend on the facts and current rules.";}
 else if(q.includes("cyber")||q.includes("fraud")||q.includes("online")||q.includes("scam")){topic="Cyber safety";guidance="If money has been lost, contact your bank or payment provider immediately and use India's official cybercrime reporting portal or helpline as appropriate. Preserve transaction IDs, messages, phone numbers and screenshots. Do not share OTPs or passwords. For immediate financial cyber fraud in India, the national helpline commonly used is 1930; verify current official instructions promptly.";}
 else if(q.includes("employment")||q.includes("salary")||q.includes("job")||q.includes("employer")){topic="Employment issues";guidance="Keep your appointment letter, contract, payslips, attendance records and written communications. Identify the state, type of employment and exact issue, because applicable rules and forums can differ. Consider a written request to HR or the employer and consult a qualified professional or relevant labour authority for case-specific advice.";}
 return {topic,guidance};
}
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();const input=$("#chatInput");const q=input.value.trim();if(!q)return;addMessage(q,"user");input.value="";const {topic,guidance}=demoReply(q);setTimeout(()=>addMessage(`Demo topic: ${topic}\n\nA possible starting point:\n${guidance}\n\nSuggested next step: check the relevant official source and consider speaking with a qualified advocate if your situation is urgent or fact-specific.`,"assistant","DEMO RESPONSE · NOT VERIFIED LEGAL ADVICE"),220);});

$("#documentText").addEventListener("input",e=>$("#documentLength").textContent=`${e.target.value.length.toLocaleString()} characters`);
$("#reviewDocument").addEventListener("click",()=>{
 const text=$("#documentText").value.trim();const out=$("#documentResult");
 if(text.length<40){toast("Please paste a little more text to prepare a checklist.");return;}
 out.classList.remove("hidden");
 out.innerHTML="<h3>Review checklist</h3><p>This demo has not interpreted the legal effect of your document. Use this checklist to guide a careful review:</p><ul><li>Identify the parties, dates, purpose and duration.</li><li>Locate payment amounts, due dates, fees and refund terms.</li><li>Look for termination, notice and renewal clauses.</li><li>Check obligations, exceptions, penalties and dispute-resolution language.</li><li>Confirm whether any referenced annexures or schedules are missing.</li><li>Note unclear terms and questions to ask a qualified advocate.</li></ul><p><strong>Important:</strong> verify every clause in context and check applicable current law. This is a generic checklist, not document analysis or legal advice.</p>";
});

$("#draftForm").addEventListener("submit",e=>{
 e.preventDefault();const issue=$("#issue").value.trim();if(!issue){toast("Describe the issue before generating a draft.");return;}
 const type=$("#draftType").value;const recipient=$("#recipient").value.trim()||"[Recipient name / department]";const resolution=$("#resolution").value.trim()||"[State the resolution you are requesting]";const tone=$("#tone").value;
 const subjectMap={consumer:"Consumer grievance and request for resolution",deposit:"Request for return of rental security deposit",records:"Request for copies of relevant documents or records",service:"Service concern and request for resolution"};
 const opening=tone==="Firm and formal"?"I am writing to formally raise the following concern and request a timely written response.":"I am writing to seek your assistance in resolving the concern described below.";
 const draft=`To,\n${recipient}\n\nDate: [Insert date]\n\nSubject: ${subjectMap[type]}\n\nDear Sir/Madam,\n\n${opening}\n\nDetails of the issue:\n${issue}\n\nRequested resolution:\n${resolution}\n\nPlease acknowledge receipt of this letter and let me know the next steps within a reasonable time. I have retained relevant records and can provide appropriate supporting information if required.\n\nI hope this matter can be resolved fairly and promptly.\n\nYours faithfully,\n[Your name]\n[Your contact details, if appropriate]\n\n---\nReview this template before use. Confirm facts, recipient, deadlines and applicable procedure. This is a general draft, not a lawyer-reviewed legal notice.`;
 const out=$("#draftOutput");out.classList.remove("hidden");out.innerHTML=`<h3>Your editable sample draft</h3><div>${escapeHtml(draft)}</div><button id="copyDraft" class="button button-outline" style="margin-top:14px">Copy draft</button>`;
 $("#copyDraft").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(draft);toast("Draft copied to clipboard.");}catch{toast("Copy was blocked by the browser. Select and copy the text manually.");}});
});
$("#authForm").addEventListener("submit",e=>{e.preventDefault();$("#authMessage").textContent="Preview only: sign-in is not connected. No credentials were sent or saved. Please do not use a real password here.";});
