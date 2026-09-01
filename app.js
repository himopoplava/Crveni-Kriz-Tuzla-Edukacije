const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const volunteerProfile = {
  id: "volunteer-view",
  fullName: "Volunteer Calendar View",
  role: "volunteer",
  phone: "",
  specialty: "Read-only access",
};

const state = {
  activeProfile: null,
  visibleDate: new Date(),
  currentView: "calendar",
  profiles: [],
  events: [],
};

const elements = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginError: document.querySelector("#loginError"),
  volunteerAccessButton: document.querySelector("#volunteerAccessButton"),
  logoutButton: document.querySelector("#logoutButton"),
  profileDetails: document.querySelector("#profileDetails"),
  addProfileButton: document.querySelector("#addProfileButton"),
  addEventButton: document.querySelector("#addEventButton"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  todayButton: document.querySelector("#todayButton"),
  monthLabel: document.querySelector("#monthLabel"),
  calendarSummary: document.querySelector("#calendarSummary"),
  calendarGrid: document.querySelector("#calendarGrid"),
  eventList: document.querySelector("#eventList"),
  profilesGrid: document.querySelector("#profilesGrid"),
  pageTitle: document.querySelector("#pageTitle"),
  eventDialog: document.querySelector("#eventDialog"),
  eventForm: document.querySelector("#eventForm"),
  closeDialog: document.querySelector("#closeDialog"),
  cancelDialog: document.querySelector("#cancelDialog"),
  deleteEventButton: document.querySelector("#deleteEventButton"),
  formError: document.querySelector("#formError"),
  profileDialog: document.querySelector("#profileDialog"),
  profileForm: document.querySelector("#profileForm"),
  closeProfileDialog: document.querySelector("#closeProfileDialog"),
  cancelProfileDialog: document.querySelector("#cancelProfileDialog"),
  profileFormError: document.querySelector("#profileFormError"),
  fields: {
    eventId: document.querySelector("#eventId"),
    title: document.querySelector("#titleInput"),
    date: document.querySelector("#dateInput"),
    time: document.querySelector("#timeInput"),
    duration: document.querySelector("#durationInput"),
    capacity: document.querySelector("#capacityInput"),
    location: document.querySelector("#locationInput"),
    notes: document.querySelector("#notesInput"),
  },
  profileFields: {
    fullName: document.querySelector("#profileNameInput"),
    userId: document.querySelector("#profileUserIdInput"),
    role: document.querySelector("#profileRoleInput"),
    phone: document.querySelector("#profilePhoneInput"),
    specialty: document.querySelector("#profileSpecialtyInput"),
  },
  loginFields: {
    email: document.querySelector("#loginEmailInput"),
    password: document.querySelector("#loginPasswordInput"),
  },
};

async function init() {
  bindEvents();

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    await enterAuthenticatedApp(data.session.user);
  } else {
    renderShell(false);
  }
}

async function enterAuthenticatedApp(user) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    await supabaseClient.auth.signOut();
    elements.loginError.textContent = "Your login exists, but no profile role was found. Add this user to the profiles table in Supabase.";
    renderShell(false);
    return;
  }

  state.activeProfile = fromProfileRow(profile);
  await loadSharedData();
  renderAll();
}

async function loadSharedData() {
  const profileColumns = state.activeProfile?.role === "volunteer" ? "id, full_name, role, specialty" : "*";
  const [{ data: profiles, error: profilesError }, { data: events, error: eventsError }] = await Promise.all([
    supabaseClient.from("profiles").select(profileColumns).order("full_name", { ascending: true }),
    supabaseClient.from("education_events").select("*").order("starts_at", { ascending: true }),
  ]);

  if (profilesError || eventsError) {
    const message = profilesError?.message || eventsError?.message || "Supabase data could not be loaded.";
    showAppError(message);
    return;
  }

  state.profiles = profiles.map(fromProfileRow);
  state.events = events.map(fromEventRow);
}

function fromProfileRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone || "",
    specialty: row.specialty || row.role,
  };
}

function fromEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    location: row.location || "",
    notes: row.notes || "",
    educatorId: row.educator_id,
  };
}

function toEventRow(event) {
  return {
    title: event.title,
    starts_at: event.startsAt,
    duration_minutes: event.durationMinutes,
    capacity: event.capacity,
    location: event.location,
    notes: event.notes,
    educator_id: event.educatorId,
  };
}

function getActiveProfile() {
  return state.activeProfile;
}

function canEditEvent(event) {
  const profile = getActiveProfile();
  if (!profile) return false;
  return ["educator", "admin"].includes(profile.role) && (!event || event.educatorId === profile.id || profile.role === "admin");
}

function renderShell(isLoggedIn) {
  elements.loginScreen.classList.toggle("is-hidden", isLoggedIn);
  elements.appShell.classList.toggle("is-hidden", !isLoggedIn);
}

function renderActiveProfile() {
  const profile = getActiveProfile();
  if (!profile) return;

  elements.profileDetails.innerHTML = `
    <span class="role-pill ${profile.role}">${profile.role}</span>
    <strong>${escapeHtml(profile.fullName)}</strong>
    <span>${escapeHtml(profile.specialty)}</span>
  `;
  elements.addEventButton.disabled = !["educator", "admin"].includes(profile.role);
  elements.addProfileButton.classList.toggle("is-hidden", profile.role !== "admin");
}

function renderCalendar() {
  const year = state.visibleDate.getFullYear();
  const month = state.visibleDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstGridDate = new Date(firstOfMonth);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  firstGridDate.setDate(firstOfMonth.getDate() - mondayOffset);

  elements.monthLabel.textContent = formatDate(firstOfMonth, { month: "long", year: "numeric" });

  const monthEvents = state.events.filter((event) => {
    const eventDate = new Date(event.startsAt);
    return eventDate.getFullYear() === year && eventDate.getMonth() === month;
  });
  elements.calendarSummary.textContent = `${monthEvents.length} education session${monthEvents.length === 1 ? "" : "s"} this month`;

  const todayKey = dateKey(new Date());
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(firstGridDate);
    day.setDate(firstGridDate.getDate() + index);
    const key = dateKey(day);
    const dayEvents = state.events
      .filter((event) => dateKey(new Date(event.startsAt)) === key)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    const classes = ["day-cell"];
    if (day.getMonth() !== month) classes.push("outside");
    if (key === todayKey) classes.push("today");

    cells.push(`
      <div class="${classes.join(" ")}" data-date="${key}">
        <div class="day-number">${day.getDate()}</div>
        ${dayEvents
          .map((event) => {
            const startsAt = new Date(event.startsAt);
            return `
              <button class="event-chip" type="button" data-event-id="${event.id}">
                <strong>${escapeHtml(event.title)}</strong>
                <span>${formatDate(startsAt, { hour: "2-digit", minute: "2-digit" })} - ${escapeHtml(educatorName(event.educatorId))}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `);
  }

  elements.calendarGrid.innerHTML = cells.join("");
}

function renderEventList() {
  const upcoming = state.events
    .filter((event) => new Date(event.startsAt) >= startOfToday())
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

  elements.eventList.innerHTML = upcoming.length
    ? upcoming.map(renderEventRow).join("")
    : `<div class="event-row"><div>No upcoming education sessions yet.</div></div>`;
}

function renderEventRow(event) {
  const startsAt = new Date(event.startsAt);
  const editButton = canEditEvent(event)
    ? `<button class="secondary-button" type="button" data-event-id="${event.id}">Edit</button>`
    : `<span class="status-pill">View only</span>`;

  return `
    <article class="event-row">
      <div>
        <div class="event-date">${formatDate(startsAt, { weekday: "short", day: "2-digit", month: "short" })}</div>
        <div class="event-meta">${formatDate(startsAt, { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div>
        <h4>${escapeHtml(event.title)}</h4>
        <div class="event-meta">
          <span>${escapeHtml(educatorName(event.educatorId))}</span>
          <span>${minutesToLabel(event.durationMinutes)}</span>
          <span>${event.capacity} places</span>
          <span>${escapeHtml(event.location || "Location not set")}</span>
        </div>
      </div>
      ${editButton}
    </article>
  `;
}

function renderProfiles() {
  elements.profilesGrid.innerHTML = state.profiles
    .map(
      (profile) => `
        <article class="profile-card">
          <span class="role-pill ${profile.role}">${profile.role}</span>
          <div>
            <h4>${escapeHtml(profile.fullName)}</h4>
            <p>${escapeHtml(profile.specialty)}</p>
          </div>
          <p>${escapeHtml(profile.phone || "No phone added")}</p>
        </article>
      `,
    )
    .join("");
}

function renderAll() {
  const profile = getActiveProfile();
  const isLoggedIn = Boolean(profile);

  renderShell(isLoggedIn);
  if (!isLoggedIn) return;

  renderActiveProfile();
  renderCalendar();
  renderEventList();
  renderProfiles();

  document.querySelector('[data-view="profiles"]').classList.toggle("is-hidden", profile.role !== "admin");
  if (state.currentView === "profiles" && profile.role !== "admin") {
    setView("calendar");
  }
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value, time) {
  const [year, month, day] = value.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function minutesToLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

function educatorName(id) {
  return state.profiles.find((profile) => profile.id === id)?.fullName ?? "Unknown educator";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setView(viewName) {
  const profile = getActiveProfile();
  if (viewName === "profiles" && profile?.role !== "admin") return;

  state.currentView = viewName;
  document.querySelectorAll(".view-section").forEach((section) => section.classList.remove("active"));
  document.querySelector(`#${viewName}View`).classList.add("active");
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  elements.pageTitle.textContent = viewName === "calendar" ? "Calendar" : viewName === "list" ? "Education list" : "Profiles";
}

function openEventDialog(event = null, selectedDate = null) {
  if (!canEditEvent(event)) return;

  elements.formError.textContent = "";
  elements.deleteEventButton.classList.toggle("is-hidden", !event);
  elements.fields.eventId.value = event?.id ?? "";
  elements.fields.title.value = event?.title ?? "";
  elements.fields.duration.value = event?.durationMinutes ?? "90";
  elements.fields.capacity.value = event?.capacity ?? "20";
  elements.fields.location.value = event?.location ?? "";
  elements.fields.notes.value = event?.notes ?? "";

  const initialDate = event ? new Date(event.startsAt) : selectedDate ? parseLocalDate(selectedDate, "17:00") : new Date();
  elements.fields.date.value = dateKey(initialDate);
  elements.fields.time.value = `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}`;

  elements.eventDialog.showModal();
}

function closeEventDialog() {
  elements.eventDialog.close();
  elements.eventForm.reset();
}

function openProfileDialog() {
  elements.profileFormError.textContent = "";
  elements.profileForm.reset();
  elements.profileDialog.showModal();
}

function closeProfileDialog() {
  elements.profileDialog.close();
  elements.profileForm.reset();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = elements.loginFields.email.value.trim();
  const password = elements.loginFields.password.value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    elements.loginError.textContent = "Login details are not correct.";
    return;
  }

  elements.loginError.textContent = "";
  elements.loginForm.reset();
  await enterAuthenticatedApp(data.user);
}

async function enterVolunteerView() {
  state.activeProfile = volunteerProfile;
  setView("calendar");
  await loadSharedData();
  renderAll();
}

async function logout() {
  await supabaseClient.auth.signOut();
  state.activeProfile = null;
  state.events = [];
  state.profiles = [];
  setView("calendar");
  renderAll();
}

async function handleSaveEvent(event) {
  event.preventDefault();
  const profile = getActiveProfile();

  if (!["educator", "admin"].includes(profile.role)) {
    elements.formError.textContent = "Only educators can add or edit education sessions.";
    return;
  }

  const id = elements.fields.eventId.value;
  const existing = state.events.find((item) => item.id === id);

  if (existing && existing.educatorId !== profile.id && profile.role !== "admin") {
    elements.formError.textContent = "Educators can only edit their own education sessions.";
    return;
  }

  const payload = {
    title: elements.fields.title.value.trim(),
    startsAt: parseLocalDate(elements.fields.date.value, elements.fields.time.value).toISOString(),
    durationMinutes: Number(elements.fields.duration.value),
    capacity: Number(elements.fields.capacity.value),
    location: elements.fields.location.value.trim(),
    notes: elements.fields.notes.value.trim(),
    educatorId: existing?.educatorId ?? profile.id,
  };

  if (!payload.title || Number.isNaN(payload.capacity) || payload.capacity < 1) {
    elements.formError.textContent = "Please add a title and a valid capacity.";
    return;
  }

  const query = existing
    ? supabaseClient.from("education_events").update(toEventRow(payload)).eq("id", existing.id)
    : supabaseClient.from("education_events").insert(toEventRow(payload));

  const { error } = await query;
  if (error) {
    elements.formError.textContent = error.message;
    return;
  }

  closeEventDialog();
  await loadSharedData();
  renderAll();
}

async function deleteCurrentEvent() {
  const eventId = elements.fields.eventId.value;
  const event = state.events.find((item) => item.id === eventId);
  if (!event || !canEditEvent(event)) return;

  const { error } = await supabaseClient.from("education_events").delete().eq("id", eventId);
  if (error) {
    elements.formError.textContent = error.message;
    return;
  }

  closeEventDialog();
  await loadSharedData();
  renderAll();
}

async function handleSaveProfile(event) {
  event.preventDefault();

  if (getActiveProfile()?.role !== "admin") {
    elements.profileFormError.textContent = "Only admins can add profiles.";
    return;
  }

  const fullName = elements.profileFields.fullName.value.trim();
  const userId = elements.profileFields.userId.value.trim();
  const role = elements.profileFields.role.value;

  if (!fullName || !userId) {
    elements.profileFormError.textContent = "Please add a name and the Supabase Auth user ID.";
    return;
  }

  const { error } = await supabaseClient.from("profiles").insert({
    id: userId,
    full_name: fullName,
    role,
    phone: elements.profileFields.phone.value.trim(),
    specialty: elements.profileFields.specialty.value.trim() || role,
  });

  if (error) {
    elements.profileFormError.textContent = error.message;
    return;
  }

  closeProfileDialog();
  await loadSharedData();
  renderAll();
}

function showAppError(message) {
  elements.calendarGrid.innerHTML = `<div class="event-row">${escapeHtml(message)}</div>`;
  elements.eventList.innerHTML = "";
  elements.profilesGrid.innerHTML = "";
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.volunteerAccessButton.addEventListener("click", enterVolunteerView);
  elements.logoutButton.addEventListener("click", logout);
  elements.addProfileButton.addEventListener("click", openProfileDialog);
  elements.addEventButton.addEventListener("click", () => openEventDialog());

  elements.prevMonth.addEventListener("click", () => {
    state.visibleDate.setMonth(state.visibleDate.getMonth() - 1);
    renderCalendar();
  });
  elements.nextMonth.addEventListener("click", () => {
    state.visibleDate.setMonth(state.visibleDate.getMonth() + 1);
    renderCalendar();
  });
  elements.todayButton.addEventListener("click", () => {
    state.visibleDate = new Date();
    renderCalendar();
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  elements.calendarGrid.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-event-id]");
    const dayCell = event.target.closest("[data-date]");

    if (chip) {
      const selectedEvent = state.events.find((item) => item.id === chip.dataset.eventId);
      openEventDialog(selectedEvent);
      return;
    }

    if (dayCell && ["educator", "admin"].includes(getActiveProfile()?.role)) {
      openEventDialog(null, dayCell.dataset.date);
    }
  });

  elements.eventList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-event-id]");
    if (!button) return;
    const selectedEvent = state.events.find((item) => item.id === button.dataset.eventId);
    openEventDialog(selectedEvent);
  });

  elements.eventForm.addEventListener("submit", handleSaveEvent);
  elements.deleteEventButton.addEventListener("click", deleteCurrentEvent);
  elements.closeDialog.addEventListener("click", closeEventDialog);
  elements.cancelDialog.addEventListener("click", closeEventDialog);
  elements.profileForm.addEventListener("submit", handleSaveProfile);
  elements.closeProfileDialog.addEventListener("click", closeProfileDialog);
  elements.cancelProfileDialog.addEventListener("click", closeProfileDialog);
}

init();
