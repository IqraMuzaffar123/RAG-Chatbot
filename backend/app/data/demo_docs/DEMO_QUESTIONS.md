# Demo Questions for DocMind RAG Knowledge Base

Use these prepared questions to demonstrate DocMind's retrieval and generation capabilities.

---

## Single-Document Questions (Easy Retrieval)

These questions can be answered from a single source file.

### Q1: "What are the steps to form an LLC in Texas?"

**Expected source:** `llc-formation-guide.txt`
**Expected answer:** Should mention filing a Certificate of Formation with the Texas Secretary of State, the $300 filing fee, choosing a name, appointing a registered agent, obtaining an EIN, and registering for state taxes. Should note that Texas has no state income tax.

### Q2: "How do I apply for an EIN online?"

**Expected source:** `ein-application-guide.txt`
**Expected answer:** Should explain that you apply at IRS.gov, available Monday-Friday 7am-10pm ET, it is free, you receive the EIN immediately at the end of the session, and the responsible party must have a valid SSN/ITIN. Should mention that only one EIN can be obtained per responsible party per day.

### Q3: "What is included in an LLC operating agreement?"

**Expected source:** `operating-agreement-guide.txt`
**Expected answer:** Should list key provisions including organization details, membership/ownership, management structure (member-managed vs manager-managed), profit/loss distribution, voting rights, transfer of interests, dissolution procedures, and dispute resolution.

---

## Multi-Document Questions (Cross-Document Retrieval)

These questions require information from 2-3 source files.

### Q4: "What are all the costs involved in forming and maintaining an LLC in California?"

**Expected sources:** `state-filing-fees.txt`, `llc-formation-guide.txt`, `annual-report-requirements.txt`
**Expected answer:** Should combine: $70 formation filing fee, $800 annual minimum franchise tax, $20 biennial Statement of Information fee, registered agent costs ($100-$300/year if using a service), and mention the $250 penalty for late Statement of Information filing.

### Q5: "If I form my LLC in Delaware but operate in Florida, what do I need to do and how much will it cost?"

**Expected sources:** `foreign-qualification.txt`, `state-filing-fees.txt`, `registered-agent-faq.txt`
**Expected answer:** Should explain foreign qualification requirement, the $125 Florida foreign qualification filing fee, need for a registered agent in both states, Delaware $300 annual tax, Florida $138.75 annual report fee, and the ongoing compliance obligations in both states.

### Q6: "What happens if I don't file my annual report and don't maintain a registered agent?"

**Expected sources:** `annual-report-requirements.txt`, `registered-agent-faq.txt`
**Expected answer:** Should describe consequences including late fees ($25-$400 depending on state), loss of good standing, administrative dissolution, potential default judgments if served with process, loss of name protection, and personal liability exposure.

---

## Out-of-Scope Questions (Hallucination Guardrail Test)

These questions are NOT covered by the demo documents. The system should respond with "I don't have enough information" or equivalent — NOT fabricate an answer.

### Q7: "What is the current federal capital gains tax rate for long-term investments?"

**Expected behavior:** The system should indicate that the provided documents do not contain information about capital gains tax rates. The demo documents cover business formation and compliance, not personal investment taxation.

### Q8: "How do I file a patent application with the USPTO?"

**Expected behavior:** The system should indicate that the provided documents do not contain information about patent applications or intellectual property filings. None of the demo documents cover USPTO processes.
