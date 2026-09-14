const stages = {
  acquire: {
    number: "Stage 01", title: "Acquire", status: "Confirmed process", color: "#36a878",
    purpose: "Create awareness and preference before a customer enters the operational workflow.",
    steps: ["Build digital visibility and trust", "Educate insured customers about shop choice", "Generate direct inquiries and referrals"],
    rule: "Digital strategy serves two paths: direct demand and preference that returns through Safelite."
  },
  intake: {
    number: "Stage 02", title: "Intake", status: "Confirmed process", color: "#36a878",
    purpose: "Capture the minimum information needed to begin identifying the required glass.",
    steps: ["Receive a phone call or text", "Capture a typed VIN or VIN image", "Capture requested glass type", "Identify the originating client channel"],
    rule: "For direct intake, request the VIN—not year, make, and model. Those are derived from the lookup."
  },
  identify: {
    number: "Stage 03", title: "Identify & Quote", status: "Confirmed through part identification", color: "#36a878",
    purpose: "Determine the correct vehicle and glass parts, then prepare a price for customer approval.",
    steps: ["Validate the 17-character VIN", "Select Windshield or Back Glass", "Run MyGrant VIN lookup", "Capture year, make, and model", "Capture primary, interchangeable, and OEM part numbers", "Review features and molding notes", "Calculate quote and issue invoice"],
    rule: "MyGrant lookup is mapped. Quote calculation and invoice-generation rules still require discovery."
  },
  approve: {
    number: "Stage 04", title: "Approve & Schedule", status: "Partially understood", color: "#e8a04c",
    purpose: "Turn an accepted price into a service-ready appointment.",
    steps: ["Send invoice or quote", "Receive customer approval", "Collect the vehicle service address", "Select service date and time"],
    rule: "Do not collect the service address until after the customer approves the invoice."
  },
  source: {
    number: "Stage 05", title: "Source & Prepare", status: "Discovery required", color: "#b7c0bb",
    purpose: "Ensure the correct glass and supporting materials are ready before dispatch.",
    steps: ["Confirm inventory availability", "Order or reserve the glass", "Confirm molding and related materials", "Prepare job for technician"],
    rule: "These are candidate steps. The actual sourcing workflow has not yet been documented."
  },
  service: {
    number: "Stage 06", title: "Perform Service", status: "Discovery required", color: "#b7c0bb",
    purpose: "Complete the installation safely and capture evidence of completion.",
    steps: ["Assign technician", "Travel to service location", "Verify vehicle and part", "Install glass", "Document completion and exceptions"],
    rule: "Technician workflow, proof requirements, and exception paths still need to be observed."
  },
  collect: {
    number: "Stage 07", title: "Invoice & Collect", status: "Discovery required", color: "#b7c0bb",
    purpose: "Close the financial loop accurately for each client channel.",
    steps: ["Finalize invoice", "Submit channel-specific documentation", "Receive payment", "Reconcile job and payment", "Follow up on exceptions"],
    rule: "Direct, auction, and insurance payment paths may differ and must be mapped separately."
  },
  grow: {
    number: "Stage 08", title: "Retain & Grow", status: "Partially understood", color: "#e8a04c",
    purpose: "Turn completed work into trust, referrals, reviews, and future preferred-shop demand.",
    steps: ["Confirm customer satisfaction", "Request review", "Invite referral", "Attribute source and campaign", "Measure preferred-shop requests"],
    rule: "A key strategic KPI is how often digital exposure leads insured customers to request R&R through Safelite."
  }
};

const detail = document.querySelector("#stage-detail");
const buttons = [...document.querySelectorAll(".stage")];

function renderStage(key) {
  const stage = stages[key];
  detail.innerHTML = `
    <div class="detail-intro">
      <div class="detail-status"><i style="background:${stage.color}"></i>${stage.status}</div>
      <h3>${stage.number} · ${stage.title}</h3>
      <p>${stage.purpose}</p>
    </div>
    <div class="detail-block">
      <h4>Known or candidate steps</h4>
      <ul>${stage.steps.map(step => `<li>${step}</li>`).join("")}</ul>
    </div>
    <div class="detail-block">
      <h4>Business rule / boundary</h4>
      <div class="rule"><strong>IMPORTANT</strong>${stage.rule}</div>
    </div>`;
}

buttons.forEach(button => {
  button.addEventListener("click", () => {
    buttons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    renderStage(button.dataset.stage);
  });
});

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll("nav a")];
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === "#" + visible.target.id));
}, {rootMargin: "-20% 0px -65% 0px", threshold: [0, .2, .5]});
sections.forEach(section => observer.observe(section));

const dialog = document.querySelector("#outcome-dialog");
document.querySelector("[data-open='outcome']").addEventListener("click", () => dialog.showModal());
dialog.querySelector(".close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

renderStage("acquire");