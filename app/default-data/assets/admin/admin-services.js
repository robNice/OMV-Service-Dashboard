let state = { sections: [] };
let dirty = false;
let dragState = null;
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


function isCustom(image) {
    return !!(
        image &&
        (
            image.isCustom === true ||   // vom Backend
            image.uploadId ||            // frisch hochgeladen
            image.source === 'explicit'  // Fallback / Altbestand
        )
    );
}

/* ================= Render ================= */

function render() {
    editor.innerHTML = "";
    state.sections.forEach((section, i) => {
        editor.appendChild(renderSection(section, i));
    });
}

async function uploadImage(kind, file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`/admin/api/upload/${kind}`, {
        method: "POST",
        body: fd
    });

    if (!res.ok) {
        throw new Error("upload_failed");
    }

    return await res.json();
}

/* ================= Section ================= */

function renderSection(section, sectionIndex) {
    const tpl = document.getElementById("tpl-section");
    const el = tpl.content.firstElementChild.cloneNode(true);

    const cardPreview = el.querySelector('[data-preview="section-card"]')?.closest('.image-preview');
    const bgPreview   = el.querySelector('[data-preview="section-bg"]')?.closest('.image-preview');

    const cardResetBtn = el.querySelector('[data-action="reset-section-card"]');
    if (cardResetBtn) {
        cardResetBtn.style.display = isCustom(section.cardImage) ? '' : 'none';
    }

    const bgResetBtn = el.querySelector('[data-action="reset-section-bg"]');
    if (bgResetBtn) {
        bgResetBtn.style.display = isCustom(section.backgroundImage) ? '' : 'none';
    }

    applyImagePreview(cardPreview, section.cardImage);
    applyImagePreview(bgPreview, section.backgroundImage);


    const bgInput = el.querySelector('[data-upload="section-bg"]');
    if (bgInput) {
        bgInput.addEventListener("change", async () => {
            const file = bgInput.files[0];
            if (!file) return;

            try {
                const result = await uploadImage("section-background", file);

                section.backgroundImage = {
                    uploadId: result.uploadId,
                    src: result.previewUrl,
                    source: "explicit"
                };

                markDirty();
                render();
            } catch {
                alert("Upload fehlgeschlagen");
            }
        });
    }

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

    const cardInput = el.querySelector('[data-upload="section-card"]');
    if (cardInput) {
        cardInput.addEventListener("change", async () => {
            const file = cardInput.files[0];
            if (!file) return;

            try {
                const result = await uploadImage("section-card", file);

                section.cardImage = {
                    uploadId: result.uploadId,
                    src: result.previewUrl,
                    source: "explicit"
                };

                markDirty();
                render();
            } catch {
                alert("Upload fehlgeschlagen");
            }
        });
    }


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

    // Object.entries(section.services).forEach(([id, svc], i) => {
    //     servicesEl.appendChild(
    //         renderService({ ...svc, id }, sectionIndex, i)
    //     );
    // });

    (section.serviceOrder || []).forEach((serviceId, i) => {
        const svc = section.services[serviceId];
        if (!svc) return;
        servicesEl.appendChild(
            renderService(
                serviceId,
                svc,
                sectionIndex,
                i
            )
        );
    });



    return el;
}

/* ================= Service ================= */

function renderService(serviceId, service, sectionIndex, orderIndex) {
    const tpl = document.getElementById("tpl-service");
    const el = tpl.content.firstElementChild.cloneNode(true);

    el.dataset.sectionIndex = sectionIndex;
    el.dataset.serviceIndex = orderIndex;
    el.dataset.serviceId = serviceId;

    const title = el.querySelector('[data-field="service-title"]');
    const url   = el.querySelector('[data-field="service-url"]');

    const cardInput = el.querySelector('[data-upload="service-card"]');
    if (cardInput) {
        cardInput.addEventListener("change", async () => {
            const file = cardInput.files[0];
            if (!file) return;

            try {
                const result = await uploadImage("service-card", file);

                service.cardImage = {
                    uploadId: result.uploadId,
                    src: result.previewUrl,
                    source: "explicit"
                };

                markDirty();
                render();
            } catch {
                alert("Upload fehlgeschlagen");
            }
        });
    }


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
    const resetBtn = el.querySelector('[data-action="reset-service-card"]');
    if (resetBtn) {
        resetBtn.style.display = isCustom(service.cardImage) ? '' : 'none';
    }
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

        case "add-service": {
            const section = state.sections[sectionIndex];

            if (!section.services) section.services = {};
            if (!section.serviceOrder) section.serviceOrder = [];

            const tmpId = "tmp-" + Math.random().toString(36).slice(2, 10);

            section.services[tmpId] = {
                title: "",
                url: "",
                logo: ""
            };

            section.serviceOrder.push(tmpId);

            markDirty();
            render();
            break;
        }

        case "delete-service": {
            const section = state.sections[sectionIndex];
            const serviceId = serviceEl.dataset.serviceId;

            delete section.services[serviceId];
            section.serviceOrder =
                section.serviceOrder.filter(id => id !== serviceId);

            markDirty();
            render();
            break;
        }

        case "reset-section-card":
            state.sections[sectionIndex].cardImage = {
                src: "/assets/cards/sections/_default.png",
                source: "default",
                resolvedFile: "_default.png",
                isCustom: false
            };
            markDirty();
            render();
            break;

        case "reset-section-bg":
            state.sections[sectionIndex].backgroundImage = {
                src: "/assets/backgrounds/_default.png",
                source: "default",
                resolvedFile: "_default.png"
            };
            markDirty();
            render();
            break;

        case "reset-service-card": {
            state.sections[sectionIndex].cardImage = {
                src: "/assets/cards/sections/_default.png",
                source: "default",
                resolvedFile: "_default.png"
            };
            markDirty();
            render();
            break;
        }

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
            const order =
                state.sections[dragState.fromSection].serviceOrder;

            const [moved] = order.splice(dragState.fromService, 1);
            order.splice(target.serviceIndex, 0, moved);

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
    state.sections.push({
        id: "",
        title: "",
        services: {},
        serviceOrder: []
    });
    markDirty();
    render();
});

async function loadInitialData() {
    const res = await fetch("/admin/api/services");
    const data = await res.json();
    data.sections.forEach(section => {
        if (!section.services) {
            section.services = {};
        }
        if (!section.serviceOrder) {
            section.serviceOrder = Object.keys(section.services);
        }
    });
    state = data;
    render();
}


async function init() {
    await loadInitialData();
    bindSaveButton();
}
init();
