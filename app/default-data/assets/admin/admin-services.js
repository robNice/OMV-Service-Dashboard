let state = { sections: [] };
let dirty = false;
let dragState = null;
let serviceCardImages = [];
let uiState = {
    collapsedSections: new Set()
};

const editor   = document.getElementById("services-editor");
const indicator = document.getElementById("drop-indicator");
const I18N = (() => {
    const el = document.getElementById("i18n");
    return el ? el.dataset : {};
})();


function applyImagePreview(previewEl, image) {
    if (!previewEl || !image) return;

    const img = previewEl.querySelector("img");
    const status = previewEl.querySelector(".image-status");

    if (img) {
        img.src = image.src;
        img.title = image.resolvedFile || "";
    }

    if (status) {
        const LABELS = {
            explicit: 'custom',
            id:       'auto',
            default:  'default'
        };


        status.textContent = LABELS[image.source] || image.source;

        status.dataset.source = image.source;
    }
}



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

    const cardPreview = el.querySelector('[data-preview="section-card"]')?.closest('.image-preview');
    const bgPreview   = el.querySelector('[data-preview="section-bg"]')?.closest('.image-preview');

    applyImagePreview(cardPreview, section.cardImage);
    applyImagePreview(bgPreview, section.backgroundImage);


    const toggle = el.querySelector('[data-action="toggle-section"]');
    const body   = el.querySelector('.section-services');

    if (uiState.collapsedSections.has(sectionIndex)) {
        body.classList.add("collapsed");
    }

    toggle.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();

        if (uiState.collapsedSections.has(sectionIndex)) {
            uiState.collapsedSections.delete(sectionIndex);
            body.classList.remove("collapsed");
            toggle.classList.remove("is-collapsed");
        } else {
            uiState.collapsedSections.add(sectionIndex);
            body.classList.add("collapsed");
            toggle.classList.add("is-collapsed");
        }
    });



    el.dataset.sectionIndex = sectionIndex;

    const idInput    = el.querySelector('[data-field="section-id"]');
    const titleInput = el.querySelector('[data-field="section-title"]');
    const servicesEl = el.querySelector('.section-services');

    idInput.value = section.id || "";
    titleInput.value = section.title || "";

    const cardImg = el.querySelector('[data-preview="section-card"]');
    const cardStatus = el.querySelector('[data-status="section-card"]');

    if (section.cardImage && cardImg) {
        cardImg.src = section.cardImage.src;
        cardStatus.textContent = section.cardImage.source;
    }

    const bgImg = el.querySelector('[data-preview="section-bg"]');
    const bgStatus = el.querySelector('[data-status="section-bg"]');
    console.log('BG resolver', section.backgroundImage);
    if (section.backgroundImage && bgImg) {
        bgImg.src = section.backgroundImage.src;
        bgStatus.textContent = section.backgroundImage.source;
    }


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

    title.value = service.title || "";
    url.value   = service.url || "";

    title.addEventListener("input", () => {
        service.title = title.value;
        markDirty();
    });

    url.addEventListener("input", () => {
        service.url = url.value;
        markDirty();
    });

    const preview = el.querySelector('.image-preview');
    if (preview && service.cardImage) {
        applyImagePreview(preview, service.cardImage);
    }

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

        case "reset-section-card":
            state.sections[sectionIndex].cardImage = null;
            markDirty();
            render();
            break;

        case "reset-section-bg":
            state.sections[sectionIndex].backgroundImage = null;
            markDirty();
            render();
            break;

        case "reset-service-card":
            state.sections[sectionIndex]
                .services[serviceIndex]
                .logo = null;
            markDirty();
            render();
            break;

    }
});

/* ================= Drag & Drop ================= */

editor.addEventListener("dragstart", e => {
    const serviceEl = e.target.closest(".service");
    const sectionEl = e.target.closest(".section");

    if (serviceEl) {
        dragState = {
            type: "service",
            fromSection: Number(serviceEl.dataset.sectionIndex),
            fromService: Number(serviceEl.dataset.serviceIndex)
        };
        serviceEl.classList.add("dragging");
        e.stopPropagation();
        return;
    }

    if (sectionEl) {
        dragState = {
            type: "section",
            fromSection: Number(sectionEl.dataset.sectionIndex)
        };
        sectionEl.classList.add("dragging");
    }
});

editor.addEventListener("dragend", () => {
    editor.querySelectorAll(".dragging")
        .forEach(el => el.classList.remove("dragging"));
    dragState = null;
    hideDropIndicator();
});

editor.addEventListener("dragover", e => {
    e.preventDefault();
    if (!dragState) return;

    if (dragState.type === "section") {
        const idx = getSectionDropIndex(e.clientY);
        const sections = editor.querySelectorAll(".section");
        if (sections[idx]) {
            showDropIndicator(sections[idx].getBoundingClientRect().top);
        }
    }

    if (dragState.type === "service") {
        const target = getServiceDropTarget(e.clientY);
        if (target) showDropIndicator(target.y);
    }
});

editor.addEventListener("drop", e => {
    e.preventDefault();
    if (!dragState) return;

    if (dragState.type === "section") {
        const from = dragState.fromSection;
        const to = getSectionDropIndex(e.clientY);

        if (from !== to && from + 1 !== to) {
            const moved = state.sections.splice(from, 1)[0];
            state.sections.splice(to > from ? to - 1 : to, 0, moved);
            markDirty();
        }
    }

    if (dragState.type === "service") {
        const target = getServiceDropTarget(e.clientY);
        if (target) {
            const moved =
                state.sections[dragState.fromSection]
                    .services.splice(dragState.fromService, 1)[0];

            state.sections[target.sectionIndex]
                .services.splice(target.serviceIndex, 0, moved);

            markDirty();
        }
    }

    dragState = null;
    hideDropIndicator();
    render();
});

function showDropIndicator(y) {
    indicator.style.top = `${y + window.scrollY}px`;
    indicator.style.display = "block";
}

function hideDropIndicator() {
    indicator.style.display = "none";
}


function getSectionDropIndex(mouseY) {
    const sections = [...editor.querySelectorAll(".section:not(.dragging)")];

    for (let i = 0; i < sections.length; i++) {
        const r = sections[i].getBoundingClientRect();
        if (mouseY < r.top + r.height / 2) return i;
    }
    return sections.length;
}

function getServiceDropTarget(mouseY) {
    const sectionEls = [...editor.querySelectorAll(".section")];

    for (const sec of sectionEls) {
        const services = sec.querySelector(".section-services");
        const r = services.getBoundingClientRect();

        if (mouseY >= r.top && mouseY <= r.bottom) {
            const sectionIndex = Number(sec.dataset.sectionIndex);
            const items = [...services.querySelectorAll(".service:not(.dragging)")];

            if (!items.length) {
                return { sectionIndex, serviceIndex: 0, y: r.top + 8 };
            }

            for (let i = 0; i < items.length; i++) {
                const ir = items[i].getBoundingClientRect();
                if (mouseY < ir.top + ir.height / 2) {
                    return { sectionIndex, serviceIndex: i, y: ir.top };
                }
            }

            return {
                sectionIndex,
                serviceIndex: items.length,
                y: r.bottom
            };
        }
    }
    return null;
}

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

            status.textContent = label.textContent = I18N.saveSaved;
            clearDirty();
        } catch {
            status.textContent = I18N.saveError;
        } finally {
            spinner.classList.add("hidden");
            label.textContent = I18N.saveLabel;
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
async function loadServiceCardImages() {
    const res = await fetch("/admin/api/service-card-images");
    const data = await res.json();
    serviceCardImages = data.images || [];
}
async function init() {
    await loadServiceCardImages();
    await loadInitialData();
    bindSaveButton();
}
init();
