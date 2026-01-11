let state = { sections: [] };
const T = window.ADMIN_I18N;
let dragState = null;

/* ================= helpers ================= */

function render() {
    const root = document.getElementById("services-editor");
    root.innerHTML = "";

    state.sections.forEach((section, index) => {
        root.appendChild(renderSection(section, index));
    });
}

/* ================= drop helpers ================= */

const editor = document.getElementById("services-editor");
const indicator = document.getElementById("drop-indicator");

function getSectionDropIndex(container, mouseY) {
    const sections = [...container.querySelectorAll(".section:not(.dragging)")];

    for (let i = 0; i < sections.length; i++) {
        const r = sections[i].getBoundingClientRect();
        if (mouseY < r.top + r.height / 2) return i;
    }
    return sections.length;
}

function updateDropIndicator(mouseY) {
    const sections = [...editor.querySelectorAll(".section:not(.dragging)")];

    for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (mouseY < r.top + r.height / 2) {
            indicator.style.top = `${r.top + window.scrollY}px`;
            indicator.style.display = "block";
            return;
        }
    }

    if (sections.length) {
        const r = sections.at(-1).getBoundingClientRect();
        indicator.style.top = `${r.bottom + window.scrollY}px`;
        indicator.style.display = "block";
    }
}

function clearDropIndicator() {
    indicator.style.display = "none";
}

/* ================= section ================= */

function renderSection(section, sectionIndex) {
    const el = document.createElement("div");
    el.className = "section";
    el.draggable = true;

    el.innerHTML = `
        <div class="section-header">
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

        <div class="section-services"></div>

        <button class="secondary add">${T.addService}</button>
    `;

    el.addEventListener("dragstart", () => {
        dragState = { type: "section", index: sectionIndex };
        el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        dragState = null;
        clearDropIndicator();
    });

    const [idInput, titleInput] = el.querySelectorAll("input");
    idInput.oninput = e => section.id = e.target.value.trim();
    titleInput.oninput = e => section.title = e.target.value.trim();

    el.querySelector(".danger").onclick = () => {
        state.sections.splice(sectionIndex, 1);
        render();
    };

    const servicesEl = el.querySelector(".section-services");
    section.services.forEach((svc, idx) => {
        servicesEl.appendChild(renderService(section, svc, idx));
    });

    el.querySelector(".add").onclick = () => {
        section.services.push({ title: "", url: "" });
        render();
    };

    return el;
}

/* ================= service ================= */

function renderService(section, service, serviceIndex) {
    const el = document.createElement("div");
    el.className = "service";

    el.innerHTML = `
        <div>
            <label>${T.serviceTitle}</label>
            <input type="text" value="${service.title || ""}">
        </div>
        <div>
            <label>${T.serviceUrl}</label>
            <input type="text" value="${service.url || ""}">
        </div>
        <button class="danger">${T.deleteService}</button>
    `;

    const [titleInput, urlInput] = el.querySelectorAll("input");
    titleInput.oninput = e => service.title = e.target.value;
    urlInput.oninput = e => service.url = e.target.value;

    el.querySelector(".danger").onclick = () => {
        section.services.splice(serviceIndex, 1);
        render();
    };

    return el;
}

/* ================= global DnD ================= */

editor.addEventListener("dragover", e => {
    e.preventDefault();
    if (dragState?.type === "section") {
        updateDropIndicator(e.clientY);
    }
});

editor.addEventListener("drop", e => {
    e.preventDefault();

    if (!dragState || dragState.type !== "section") return;

    const from = dragState.index;
    const to = getSectionDropIndex(editor, e.clientY);

    if (from !== to && from + 1 !== to) {
        const moved = state.sections.splice(from, 1)[0];
        state.sections.splice(to > from ? to - 1 : to, 0, moved);
    }

    dragState = null;
    clearDropIndicator();
    render();
});

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
