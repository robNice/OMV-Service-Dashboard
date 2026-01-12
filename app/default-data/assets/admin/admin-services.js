let state = { sections: [] };
let dirty = false;
let dragState = null;

const editor   = document.getElementById("services-editor");
const indicator = document.getElementById("drop-indicator");

/* ================= Render ================= */

function render() {
    editor.innerHTML = "";
    state.sections.forEach((section, i) => {
        editor.appendChild(renderSection(section, i));
    });
}

/* ================= Section ================= */

function renderSection(section, sectionIndex) {
    const tpl = document.getElementById("tpl-section");
    const el = tpl.content.firstElementChild.cloneNode(true);

    el.dataset.sectionIndex = sectionIndex;

    const idInput    = el.querySelector('[data-field="section-id"]');
    const titleInput = el.querySelector('[data-field="section-title"]');
    const servicesEl = el.querySelector('.section-services');

    idInput.value = section.id || "";
    titleInput.value = section.title || "";

    idInput.addEventListener("input", () => {
        section.id = idInput.value.trim();
        markDirty();
    });

    titleInput.addEventListener("input", () => {
        section.title = titleInput.value.trim();
        markDirty();
    });

    section.services.forEach((svc, i) => {
        servicesEl.appendChild(
            renderService(svc, sectionIndex, i)
        );
    });

    return el;
}

/* ================= Service ================= */

function renderService(service, sectionIndex, serviceIndex) {
    const tpl = document.getElementById("tpl-service");
    const el = tpl.content.firstElementChild.cloneNode(true);

    el.dataset.sectionIndex = sectionIndex;
    el.dataset.serviceIndex = serviceIndex;

    const title = el.querySelector('[data-field="service-title"]');
    const url   = el.querySelector('[data-field="service-url"]');
    const logo  = el.querySelector('[data-field="service-logo"]');

    title.value = service.title || "";
    url.value   = service.url || "";
    logo.value  = service.logo || "";

    title.addEventListener("input", () => {
        service.title = title.value;
        markDirty();
    });

    url.addEventListener("input", () => {
        service.url = url.value;
        markDirty();
    });

    logo.addEventListener("input", () => {
        service.logo = logo.value;
        markDirty();
    });

    return el;
}

/* ================= Event Delegation ================= */

editor.addEventListener("click", e => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const sectionEl = actionEl.closest(".section");
    const serviceEl = actionEl.closest(".service");

    const sectionIndex = sectionEl
        ? Number(sectionEl.dataset.sectionIndex)
        : null;

    const serviceIndex = serviceEl
        ? Number(serviceEl.dataset.serviceIndex)
        : null;

    switch (actionEl.dataset.action) {
        case "delete-section":
            state.sections.splice(sectionIndex, 1);
            markDirty();
            render();
            break;

        case "add-service":
            state.sections[sectionIndex].services.push({
                title: "", url: "", logo: ""
            });
            markDirty();
            render();
            break;

        case "delete-service":
            state.sections[sectionIndex].services.splice(serviceIndex, 1);
            markDirty();
            render();
            break;
    }
});

/* ================= Dirty / Save ================= */

function markDirty() {
    if (!dirty) {
        dirty = true;
        updateSaveUI();
    }
}

function clearDirty() {
    dirty = false;
    updateSaveUI();
}

function updateSaveUI() {
    const btn = document.getElementById("save-services");
    const status = document.getElementById("save-status");

    btn.disabled = !dirty;
    if (dirty) status.textContent = "";
}

function bindSaveButton() {
    const btn = document.getElementById("save-services");
    const label = btn.querySelector(".label");
    const spinner = btn.querySelector(".spinner");
    const status = document.getElementById("save-status");

    btn.addEventListener("click", async () => {
        if (!dirty) return;

        btn.disabled = true;
        spinner.classList.remove("hidden");
        label.textContent = btn.dataset.saving || label.textContent;

        try {
            const res = await fetch("/admin/api/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(state)
            });

            if (!res.ok) throw new Error();

            status.textContent = label.textContent = "{{__.admin.save.saved}}";
            clearDirty();
        } catch {
            status.textContent = "{{__.admin.save.error}}";
        } finally {
            spinner.classList.add("hidden");
            label.textContent = "{{__.admin.save.label}}";
        }
    });
}

/* ================= Init ================= */

document.getElementById("add-section").addEventListener("click", () => {
    state.sections.push({ id: "", title: "", services: [] });
    markDirty();
    render();
});

async function loadInitialData() {
    const res = await fetch("/admin/api/services");
    state = await res.json();
    render();
}

loadInitialData();
bindSaveButton();
