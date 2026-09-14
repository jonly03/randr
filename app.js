const stages = window.RR_BLUEPRINT.stages;
const STORAGE_KEY = "rr-blueprint-feedback-v1";
const detail = document.querySelector("#stage-detail");
const stageButtons = [...document.querySelectorAll(".stage")];
const feedbackDialog = document.querySelector("#feedback-dialog");
const feedbackForm = document.querySelector("#feedback-form");
const toast = document.querySelector("#toast");
let activeStage = "acquire";

function getFeedback() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveFeedback(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  updateFeedbackCounts();
}

function feedbackFor(stageId, stepId) {
  return getFeedback().filter(item =>
    item.stageId === stageId && (stepId === undefined || item.stepId === stepId)
  );
}

function addStageControls() {
  stageButtons.forEach(button => {
    const plus = document.createElement("span");
    plus.className = "feedback-plus stage-plus";
    plus.setAttribute("role", "button");
    plus.setAttribute("tabindex", "0");
    plus.setAttribute("aria-label", "Add feedback for " + stages[button.dataset.stage].title);
    plus.textContent = "+";
    plus.addEventListener("click", event => {
      event.stopPropagation();
      openFeedback("stage", button.dataset.stage);
    });
    plus.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openFeedback("stage", button.dataset.stage);
      }
    });
    const count = document.createElement("span");
    count.className = "feedback-badge stage-feedback-count";
    button.append(plus, count);
  });
}

function renderStage(key) {
  activeStage = key;
  const stage = stages[key];
  const stepItems = stage.steps.map(step => {
    const count = feedbackFor(key, step.id).length;
    return `<li>
      <span>${step.text}</span>
      <button class="feedback-plus step-plus" type="button" data-step-id="${step.id}" aria-label="Add feedback for ${step.text}">+</button>
      <em class="feedback-badge ${count ? "visible" : ""}">${count || ""}</em>
    </li>`;
  }).join("");
  const stageCount = feedbackFor(key).length;
  detail.innerHTML = `
    <div class="detail-intro">
      <div class="detail-status"><i style="background:${stage.color}"></i>${stage.status}</div>
      <div class="detail-title-row">
        <h3>${stage.number} · ${stage.title}</h3>
        <button class="feedback-plus detail-plus" type="button" aria-label="Add feedback for ${stage.title}">+</button>
      </div>
      <p>${stage.purpose}</p>
      <small class="detail-feedback-summary">${stageCount ? stageCount + " saved feedback item" + (stageCount === 1 ? "" : "s") : "No feedback yet"}</small>
    </div>
    <div class="detail-block">
      <h4>Known or candidate steps</h4>
      <ul class="editable-steps">${stepItems}</ul>
    </div>
    <div class="detail-block">
      <h4>Business rule / boundary</h4>
      <div class="rule"><strong>IMPORTANT</strong>${stage.rule}</div>
    </div>`;

  detail.querySelector(".detail-plus").addEventListener("click", () => openFeedback("stage", key));
  detail.querySelectorAll(".step-plus").forEach(button => {
    button.addEventListener("click", () => openFeedback("step", key, button.dataset.stepId));
  });
}

function openFeedback(type, stageId, stepId = "") {
  const stage = stages[stageId];
  const step = stepId ? stage.steps.find(item => item.id === stepId) : null;
  document.querySelector("#feedback-target-type").value = type;
  document.querySelector("#feedback-stage-id").value = stageId;
  document.querySelector("#feedback-step-id").value = stepId;
  document.querySelector("#feedback-title").textContent = type === "stage" ? "Comment on " + stage.title : "Comment on this step";
  document.querySelector("#feedback-context").textContent = step ? stage.title + " → " + step.text : stage.number + " · " + stage.purpose;
  document.querySelector("#feedback-action").value = "comment";
  document.querySelector("#feedback-text").value = "";
  feedbackDialog.showModal();
  setTimeout(() => document.querySelector("#feedback-text").focus(), 50);
}

function closeFeedback() {
  feedbackDialog.close();
  feedbackForm.reset();
}

feedbackForm.addEventListener("submit", event => {
  event.preventDefault();
  const items = getFeedback();
  const stageId = document.querySelector("#feedback-stage-id").value;
  const stepId = document.querySelector("#feedback-step-id").value || null;
  items.push({
    id: crypto.randomUUID ? crypto.randomUUID() : "feedback-" + Date.now(),
    targetType: document.querySelector("#feedback-target-type").value,
    stageId,
    stepId,
    action: document.querySelector("#feedback-action").value,
    author: document.querySelector("#feedback-author").value.trim() || null,
    text: document.querySelector("#feedback-text").value.trim(),
    createdAt: new Date().toISOString(),
    status: "proposed"
  });
  saveFeedback(items);
  closeFeedback();
  renderStage(activeStage);
  showToast("Feedback saved on this device");
});

function updateFeedbackCounts() {
  const all = getFeedback();
  document.querySelector("#feedback-count").textContent = all.length;
  stageButtons.forEach(button => {
    const count = all.filter(item => item.stageId === button.dataset.stage).length;
    const badge = button.querySelector(".stage-feedback-count");
    badge.textContent = count || "";
    badge.classList.toggle("visible", count > 0);
  });
}

function exportFeedback() {
  const payload = {
    schemaVersion: "1.0",
    blueprintVersion: window.RR_BLUEPRINT.version,
    exportedAt: new Date().toISOString(),
    business: "R&R Finest Auto Glass",
    feedback: getFeedback()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rr-blueprint-feedback-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Structured feedback exported");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

stageButtons.forEach(button => {
  button.addEventListener("click", () => {
    stageButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    renderStage(button.dataset.stage);
  });
});

document.querySelector("#export-feedback").addEventListener("click", exportFeedback);
document.querySelector(".feedback-close").addEventListener("click", closeFeedback);
document.querySelector(".feedback-cancel").addEventListener("click", closeFeedback);
feedbackDialog.addEventListener("click", event => { if (event.target === feedbackDialog) closeFeedback(); });

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll("nav a")];
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === "#" + visible.target.id));
}, {rootMargin: "-20% 0px -65% 0px", threshold: [0, .2, .5]});
sections.forEach(section => observer.observe(section));

const outcomeDialog = document.querySelector("#outcome-dialog");
document.querySelector("[data-open='outcome']").addEventListener("click", () => outcomeDialog.showModal());
outcomeDialog.querySelector(".close").addEventListener("click", () => outcomeDialog.close());
outcomeDialog.addEventListener("click", event => { if (event.target === outcomeDialog) outcomeDialog.close(); });

addStageControls();
updateFeedbackCounts();
renderStage("acquire");