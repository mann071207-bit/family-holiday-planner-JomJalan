// js/plans.js
// My Plans page: READ, UPDATE and DELETE plans stored in Local Storage

const plansList = document.getElementById("plansList");
const plansMessage = document.getElementById("plansMessage");
const editSection = document.getElementById("editSection");
const editNotes = document.getElementById("editNotes");
const editDays = document.getElementById("editDays");
const updateBtn = document.getElementById("updateBtn");
const cancelBtn = document.getElementById("cancelBtn");

let editingId = null;   // id of the plan being edited

function loadPlans() {
  return JSON.parse(localStorage.getItem("plans")) || [];
}

function savePlans(plans) {
  localStorage.setItem("plans", JSON.stringify(plans));
}

function showPlansMessage(text, isError = false) {
  plansMessage.textContent = text;
  plansMessage.style.color = isError ? "red" : "green";
}

// READ: show all plans
function renderPlans() {
  const plans = loadPlans();
  plansList.innerHTML = "";

  if (plans.length === 0) {
    plansList.innerHTML = "<p>No saved plans yet. Go to Explore to create one.</p>";
    return;
  }

  plans.forEach(plan => {
    const card = document.createElement("div");
    card.className = "plan-card";                 // <-- new: picks up the card style
    card.innerHTML = `
      <h3>${plan.city}, ${plan.country}</h3>
      <p>Package: ${plan.package} | ${plan.days} days</p>
      <p>Travellers: ${plan.adults} adults, ${plan.children} children, ${plan.infants} infants, ${plan.seniors} seniors</p>
      <p>Total cost: RM ${plan.totalCost.toFixed(2)}</p>
      <p>Suggestion: ${plan.suggestion}</p>
      <p>Notes: ${plan.notes || "-"}</p>
      <button data-action="edit" data-id="${plan.id}">Edit</button>
      <button data-action="delete" data-id="${plan.id}">Delete</button>
    `;                                            // <hr> removed
    plansList.appendChild(card);
  });
}

// One click listener for all Edit and Delete buttons
plansList.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const id = Number(event.target.dataset.id);
  if (!action) return;

  if (action === "delete") {
    if (!confirm("Delete this plan?")) return;
    const plans = loadPlans().filter(p => p.id !== id);   // DELETE
    savePlans(plans);
    renderPlans();
    showPlansMessage("Plan deleted.");
  }

  if (action === "edit") {
    const plan = loadPlans().find(p => p.id === id);
    editingId = id;
    editNotes.value = plan.notes;
    editDays.value = plan.days;
    editSection.hidden = false;                           // show the edit form
  }
});

// UPDATE: save the edited values
updateBtn.addEventListener("click", () => {
  const newDays = Number(editDays.value);
  if (!Number.isInteger(newDays) || newDays < 1) {
    showPlansMessage("Days must be a whole number of at least 1.", true);
    return;
  }

  const plans = loadPlans();
  const plan = plans.find(p => p.id === editingId);

  // Recalculate the cost for the new number of days
  const oldDays = plan.days;
  plan.totalCost = (plan.totalCost / oldDays) * newDays;
  plan.days = newDays;
  plan.notes = editNotes.value.trim();

  savePlans(plans);
  editSection.hidden = true;
  editingId = null;
  renderPlans();
  showPlansMessage("Plan updated!");
});

cancelBtn.addEventListener("click", () => {
  editSection.hidden = true;
  editingId = null;
});

renderPlans();