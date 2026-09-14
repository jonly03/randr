window.RR_BLUEPRINT = {
  version: "0.2",
  lastUpdated: "2026-09-14",
  stages: {
    acquire: {
      number: "Stage 01", title: "Acquire", status: "Confirmed process", state: "known", color: "#36a878",
      purpose: "Create awareness and preference before a customer enters the operational workflow.",
      steps: [
        { id: "acquire-visibility", text: "Build digital visibility and trust" },
        { id: "acquire-choice", text: "Educate insured customers about shop choice" },
        { id: "acquire-referrals", text: "Generate direct inquiries and referrals" }
      ],
      rule: "Digital strategy serves two paths: direct demand and preference that returns through Safelite."
    },
    intake: {
      number: "Stage 02", title: "Intake", status: "Confirmed process", state: "known", color: "#36a878",
      purpose: "Capture the minimum information needed to begin identifying the required glass.",
      steps: [
        { id: "intake-contact", text: "Receive a phone call or text" },
        { id: "intake-vin", text: "Capture a typed VIN or VIN image" },
        { id: "intake-glass", text: "Capture requested glass type" },
        { id: "intake-source", text: "Identify the originating client channel" }
      ],
      rule: "For direct intake, request the VIN—not year, make, and model. Those are derived from the lookup."
    },
    identify: {
      number: "Stage 03", title: "Identify & Quote", status: "Confirmed through part identification", state: "known", color: "#36a878",
      purpose: "Determine the correct vehicle and glass parts, then prepare a price for customer approval.",
      steps: [
        { id: "identify-validate", text: "Validate the 17-character VIN" },
        { id: "identify-type", text: "Select Windshield or Back Glass" },
        { id: "identify-mygrant", text: "Run MyGrant VIN lookup" },
        { id: "identify-vehicle", text: "Capture year, make, and model" },
        { id: "identify-parts", text: "Capture primary, interchangeable, and OEM part numbers" },
        { id: "identify-notes", text: "Review features and molding notes" },
        { id: "identify-quote", text: "Calculate quote and issue invoice" }
      ],
      rule: "MyGrant lookup is mapped. Quote calculation and invoice-generation rules still require discovery."
    },
    approve: {
      number: "Stage 04", title: "Approve & Schedule", status: "Partially understood", state: "partial", color: "#e8a04c",
      purpose: "Turn an accepted price into a service-ready appointment.",
      steps: [
        { id: "approve-send", text: "Send invoice or quote" },
        { id: "approve-receive", text: "Receive customer approval" },
        { id: "approve-address", text: "Collect the vehicle service address" },
        { id: "approve-time", text: "Select service date and time" }
      ],
      rule: "Do not collect the service address until after the customer approves the invoice."
    },
    source: {
      number: "Stage 05", title: "Source & Prepare", status: "Discovery required", state: "discovery", color: "#b7c0bb",
      purpose: "Ensure the correct glass and supporting materials are ready before dispatch.",
      steps: [
        { id: "source-inventory", text: "Confirm inventory availability" },
        { id: "source-reserve", text: "Order or reserve the glass" },
        { id: "source-materials", text: "Confirm molding and related materials" },
        { id: "source-prepare", text: "Prepare job for technician" }
      ],
      rule: "These are candidate steps. The actual sourcing workflow has not yet been documented."
    },
    service: {
      number: "Stage 06", title: "Perform Service", status: "Discovery required", state: "discovery", color: "#b7c0bb",
      purpose: "Complete the installation safely and capture evidence of completion.",
      steps: [
        { id: "service-assign", text: "Assign technician" },
        { id: "service-travel", text: "Travel to service location" },
        { id: "service-verify", text: "Verify vehicle and part" },
        { id: "service-install", text: "Install glass" },
        { id: "service-document", text: "Document completion and exceptions" }
      ],
      rule: "Technician workflow, proof requirements, and exception paths still need to be observed."
    },
    collect: {
      number: "Stage 07", title: "Invoice & Collect", status: "Discovery required", state: "discovery", color: "#b7c0bb",
      purpose: "Close the financial loop accurately for each client channel.",
      steps: [
        { id: "collect-finalize", text: "Finalize invoice" },
        { id: "collect-submit", text: "Submit channel-specific documentation" },
        { id: "collect-payment", text: "Receive payment" },
        { id: "collect-reconcile", text: "Reconcile job and payment" },
        { id: "collect-followup", text: "Follow up on exceptions" }
      ],
      rule: "Direct, auction, and insurance payment paths may differ and must be mapped separately."
    },
    grow: {
      number: "Stage 08", title: "Retain & Grow", status: "Partially understood", state: "partial", color: "#e8a04c",
      purpose: "Turn completed work into trust, referrals, reviews, and future preferred-shop demand.",
      steps: [
        { id: "grow-satisfaction", text: "Confirm customer satisfaction" },
        { id: "grow-review", text: "Request review" },
        { id: "grow-referral", text: "Invite referral" },
        { id: "grow-attribution", text: "Attribute source and campaign" },
        { id: "grow-preference", text: "Measure preferred-shop requests" }
      ],
      rule: "A key strategic KPI is how often digital exposure leads insured customers to request R&R through Safelite."
    }
  }
};