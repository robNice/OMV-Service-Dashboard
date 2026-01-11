let state = { sections: [] };
const T = window.ADMIN_I18N;

/* ================= helpers ================= */

function render() {
    const root = document.getElementById("services-editor");
    root.innerHTML = "";

    state.sections.forEach((section, sIndex) => {
        const el = renderSection(section, sIndex);
        root.appendChild(el);
    });
}

/* ================= section ================= */

function renderSection(section, sectionIndex) {
    const el = document.createElement("div");
    el.className = "section";
    el.draggable = true;
    el.dataset.sectionIndex = sectionIndex;

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

    /* section drag */
    el.addEventListener("dragstart", e => {
        e.dataTransfer.setData("type", "section");
        e.dataTransfer.setData("index", sectionIndex);
        el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
    });

    el.addEventListener("dragover", e => e.preventDefault());

    el.addEventListener("drop", e => {
        e.preventDefault();
        if (e.dataTransfer.getData("type") !== "section") return;

        const from = Number(e.dataTransfer.getData("index"));
        const to = sectionIndex;
        if (from === to) return;

        const moved = state.sections.splice(from, 1)[0];
        state.sections.splice(to, 0, moved);
        render();
    });

    /* section logic */
    const [idInput, titleInput] = el.querySelectorAll("input");

    idInput.oninput = e => section.id = e.target.value.trim();
    titleInput.oninput = e => section.title = e.target.value.trim();

    el.querySelector(".danger").onclick = () => {
        state.sections.splice(sectionIndex, 1);
        render();
    };

    const servicesContainer = el.querySelector(".section-services");

    section.services.forEach((service, serviceIndex) => {
        servicesContainer.appendChild(
            renderService(section, service, serviceIndex)
        );
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
    el.draggable = true;
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
        <button class="danger">${T.deleteService}</button>
    `;

    /* service drag */
    el.addEventListener("dragstart", e => {
        e.stopPropagation();
        e.dataTransfer.setData("type", "service");
        e.dataTransfer.setData("serviceIndex", serviceIndex);
        e.dataTransfer.setData(
            "sectionIndex",
            state.sections.indexOf(section)
        );
        el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
    });

    el.addEventListener("dragover", e => {
        e.preventDefault();
        e.stopPropagation();
    });

    el.addEventListener("drop", e => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.getData("type") !== "service") return;

        const fromSection = Number(e.dataTransfer.getData("sectionIndex"));
        const fromService = Number(e.dataTransfer.getData("serviceIndex"));
        const toSection = state.sections.indexOf(section);
        const toService = serviceIndex;

        const moved = state.sections[fromSection].services.splice(fromService, 1)[0];
        state.sections[toSection].services.splice(toService, 0, moved);

        render();
    });

    /* service logic */
    const [titleInput, urlInput] = el.querySelectorAll("input");

    titleInput.oninput = e => service.title = e.target.value;
    urlInput.oninput = e => service.url = e.target.value;

    el.querySelector(".danger").onclick = () => {
        section.services.splice(serviceIndex, 1);
        render();
    };

    return el;
}

/* ================= init ================= */

document.getElementById("add-section").onclick = () => {
    state.sections.push({
        id: "",
        title: "",
        services: []
    });
    render();
};

async function loadInitialData() {
    const res = await fetch("/admin/api/services");
    state = await res.json();
    render();
}

loadInitialData();
