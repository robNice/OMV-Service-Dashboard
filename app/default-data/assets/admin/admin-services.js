let state = { sections: [] };
const T = window.ADMIN_I18N;
let dragState = null;
let uiState = {
    collapsedSections: new Set()
};


/* ================= helpers ================= */

const editor = document.getElementById("services-editor");
const indicator = document.getElementById("drop-indicator");

function render() {
    editor.innerHTML = "";
    state.sections.forEach((section, sIdx) => {
        editor.appendChild(renderSection(section, sIdx));
    });
}

/* ================= drop helpers ================= */

function getSectionDropIndex(mouseY) {
    const sections = [...editor.querySelectorAll(".section:not(.dragging)")];

    for (let i = 0; i < sections.length; i++) {
        const r = sections[i].getBoundingClientRect();
        if (mouseY < r.top + r.height / 2) return i;
    }
    return sections.length;
}

function getServiceDropTarget(mouseY) {
    const sections = [...editor.querySelectorAll(".section")];

    for (const sec of sections) {
        const servicesEl = sec.querySelector(".section-services");
        const r = servicesEl.getBoundingClientRect();

        if (mouseY >= r.top && mouseY <= r.bottom) {
            const sectionIndex = Number(servicesEl.dataset.sectionIndex);

            if (!servicesEl.children.length) {
                return {
                    sectionIndex,
                    serviceIndex: 0,
                    top: r.top + 8
                };
            }

            break;
        }
    }

    const services = [...editor.querySelectorAll(".service:not(.dragging)")];

    for (const el of services) {
        const r = el.getBoundingClientRect();
        if (mouseY < r.top + r.height / 2) {
            return {
                sectionIndex: Number(el.dataset.sectionIndex),
                serviceIndex: Number(el.dataset.serviceIndex),
                top: r.top
            };
        }
    }

    const lastSection = sections.at(-1);
    if (!lastSection) return null;

    const servicesEl = lastSection.querySelector(".section-services");

    return {
        sectionIndex: Number(servicesEl.dataset.sectionIndex),
        serviceIndex: servicesEl.children.length,
        top: servicesEl.getBoundingClientRect().bottom
    };
}



function showIndicator(y) {
    indicator.style.top = `${y + window.scrollY}px`;
    indicator.style.display = "block";
}

function clearIndicator() {
    indicator.style.display = "none";
}

/* ================= section ================= */

function renderSection(section, sectionIndex) {
    const el = document.createElement("div");
    el.className = "section";
    el.draggable = true;
    const isCollapsed = uiState.collapsedSections.has(sectionIndex);
    el.innerHTML = `
        <div class="section-header">
             <button class="collapse-toggle" title="Toggle">
                ${isCollapsed ? "▶" : "▼"}
            </button>
            <div>
                <label>${T.sectionId}</label>
                <input type="text" value="${section.id}">
            </div>
            <div>
                <label>${T.sectionTitle}</label>
                <input type="text" value="${section.title}">
            </div>
            <button class="danger">${T.deleteSection}</button>
        </div>


        <div class="section-body ${isCollapsed ? "collapsed" : ""}">
            <div class="section-services"></div>
            <button class="secondary add">${T.addService}</button>
        </div>
    `;

    el.querySelector(".collapse-toggle").onclick = () => {
        if (uiState.collapsedSections.has(sectionIndex)) {
            uiState.collapsedSections.delete(sectionIndex);
        } else {
            uiState.collapsedSections.add(sectionIndex);
        }
        render();
    };

    /* section drag */
    el.addEventListener("dragstart", () => {
        dragState = { type: "section", sectionIndex };
        el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        dragState = null;
        clearIndicator();
    });

    const [idInput, titleInput] = el.querySelectorAll("input");
    idInput.oninput = e => section.id = e.target.value.trim();
    titleInput.oninput = e => section.title = e.target.value.trim();

    el.querySelector(".danger").onclick = () => {
        state.sections.splice(sectionIndex, 1);
        render();
    };

    const servicesEl = el.querySelector(".section-services");
    servicesEl.dataset.sectionIndex = sectionIndex;

    if (!uiState.collapsedSections.has(sectionIndex)) {
        section.services.forEach((svc, svcIdx) => {
            servicesEl.appendChild(
                renderService(section, svc, sectionIndex, svcIdx)
            );
        });
    }

    el.querySelector(".add").onclick = () => {
        section.services.push({ title: "", url: "", logo: "" });
        render();
    };

    return el;
}

/* ================= service ================= */

function renderService(section, service, sectionIndex, serviceIndex) {
    const el = document.createElement("div");
    el.className = "service";
    el.draggable = true;

    el.dataset.sectionIndex = sectionIndex;
    el.dataset.serviceIndex = serviceIndex;

    el.innerHTML = `
        <div>
            <label>${T.serviceTitle}</label>
            <input type="text" value="${service.title || ""}">
        </div>
        <div>
            <label>${T.serviceUrl}</label>
            <input type="text" value="${service.url || ""}">
        </div>
         <div>
            <label>${T.logo}</label>
            <input type="text" placeholder="logo.png" value="${service.logo || ""}">
        </div>
        <button class="danger">${T.deleteService}</button>
    `;

    /* service drag */
    el.addEventListener("dragstart", e => {
        e.stopPropagation();
        dragState = {
            type: "service",
            fromSection: sectionIndex,
            fromService: serviceIndex
        };
        el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        dragState = null;
        clearIndicator();
    });

    const [titleInput, urlInput] = el.querySelectorAll("input");
    titleInput.oninput = e => service.title = e.target.value;
    urlInput.oninput = e => service.url = e.target.value;
    logoInput.oninput = e => service.logo = e.target.value;

    el.querySelector(".danger").onclick = () => {
        section.services.splice(serviceIndex, 1);
        render();
    };

    return el;
}

/* ================= global DnD ================= */

editor.addEventListener("dragover", e => {
    e.preventDefault();
    if (!dragState) return;

    if (dragState.type === "section") {
        const idx = getSectionDropIndex(e.clientY);
        const sections = editor.querySelectorAll(".section");
        if (sections[idx]) {
            const r = sections[idx].getBoundingClientRect();
            showIndicator(r.top);
        }
    }

    if (dragState.type === "service") {
        const target = getServiceDropTarget(e.clientY);
        if (target) {
            showIndicator(target.top);
        }
    }
});

editor.addEventListener("drop", e => {
    e.preventDefault();
    if (!dragState) return;

    /* SECTION DROP */
    if (dragState.type === "section") {
        const from = dragState.sectionIndex;
        const to = getSectionDropIndex(e.clientY);

        if (from !== to && from + 1 !== to) {
            const moved = state.sections.splice(from, 1)[0];
            state.sections.splice(to > from ? to - 1 : to, 0, moved);
        }
    }

    /* SERVICE DROP */
    if (dragState.type === "service") {
        const target = getServiceDropTarget(e.clientY);
        if (target) {
            const { fromSection, fromService } = dragState;
            const { sectionIndex, serviceIndex } = target;

            const moved =
                state.sections[fromSection].services.splice(fromService, 1)[0];

            state.sections[sectionIndex].services.splice(serviceIndex, 0, moved);
        }
    }

    dragState = null;
    clearIndicator();
    render();
});

function bindSaveButton() {
    document.getElementById("save-services").onclick = async () => {
        const res = await fetch("/admin/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state)
        });

        const status = document.getElementById("save-status");

        if (res.ok) {
            status.textContent = "Saved";
            status.style.color = "#22c55e";
        } else {
            status.textContent = "Error";
            status.style.color = "#ef4444";
        }
    };
}

/* ================= init ================= */

document.getElementById("add-section").onclick = () => {
    state.sections.push({ id: "", title: "", services: [] });
    render();
};

async function loadInitialData() {
    const res = await fetch("/admin/api/services");
    state = await res.json();
    render();
}

loadInitialData();
bindSaveButton();