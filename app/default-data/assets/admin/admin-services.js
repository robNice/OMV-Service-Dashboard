let state = {
    sections: []
};

/* ---------- helpers ---------- */

function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
}

function render() {
    const root = document.getElementById("services-editor");
    root.innerHTML = "";

    state.sections.forEach(section => {
        root.appendChild(renderSection(section));
    });
}

/* ---------- section ---------- */

function renderSection(section) {
    const el = document.createElement("div");
    el.className = "section";

    el.innerHTML = `
        <div class="section-header">
            <input type="text" value="${section.id}" data-field="section-id">
            <input type="text" value="${section.title}" data-field="section-title">
            <button class="danger" data-action="delete-section">Delete</button>
        </div>

        <div class="section-services"></div>

        <button data-action="add-service">+ Add service</button>
    `;

    const servicesContainer = el.querySelector(".section-services");

    section.services.forEach(service => {
        servicesContainer.appendChild(renderService(section, service));
    });

    el.querySelector('[data-action="add-service"]').onclick = () => {
        section.services.push({
            id: uid("service"),
            title: "New service",
            url: ""
        });
        render();
    };

    el.querySelector('[data-action="delete-section"]').onclick = () => {
        state.sections = state.sections.filter(s => s !== section);
        render();
    };

    el.querySelector('[data-field="section-id"]').onchange = e => {
        section.id = e.target.value.trim();
    };

    el.querySelector('[data-field="section-title"]').onchange = e => {
        section.title = e.target.value.trim();
    };

    return el;
}

/* ---------- service ---------- */

function renderService(section, service) {
    const el = document.createElement("div");
    el.className = "service";

    el.innerHTML = `
        <input type="text" value="${service.id}" data-field="service-id">
        <input type="text" value="${service.title}" data-field="service-title">
        <input type="text" value="${service.url}" data-field="service-url">
        <button class="danger" data-action="delete-service">×</button>
    `;

    el.querySelector('[data-action="delete-service"]').onclick = () => {
        section.services = section.services.filter(s => s !== service);
        render();
    };

    el.querySelector('[data-field="service-id"]').onchange = e => {
        service.id = e.target.value.trim();
    };

    el.querySelector('[data-field="service-title"]').onchange = e => {
        service.title = e.target.value.trim();
    };

    el.querySelector('[data-field="service-url"]').onchange = e => {
        service.url = e.target.value.trim();
    };

    return el;
}

/* ---------- init ---------- */

document.getElementById("add-section").onclick = () => {
    state.sections.push({
        id: uid("section"),
        title: "New section",
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
