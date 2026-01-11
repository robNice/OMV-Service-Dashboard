const T = window.ADMIN_I18N;

let state = { sections: [] };

function clone(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

function enable(el) {
    el.querySelectorAll("input,button").forEach(e => e.disabled = false);
}

function render() {
    const root = document.getElementById("services-editor");
    root.innerHTML = "";
    state.sections.forEach(section => {
        root.appendChild(renderSection(section));
    });
}

function renderSection(section) {
    const el = clone("section-template");

    el.querySelector('[data-label="section-id"]').textContent = T.sectionId;
    el.querySelector('[data-label="section-title"]').textContent = T.sectionTitle;

    el.querySelector('[data-action="delete-section"]').textContent = T.deleteSection;
    el.querySelector('[data-action="add-service"]').textContent = T.addService;

    el.querySelector('[data-field="section-id"]').value = section.id ?? "";
    el.querySelector('[data-field="section-title"]').value = section.title ?? "";

    enable(el);

    const servicesEl = el.querySelector(".section-services");

    section.services.forEach(service => {
        servicesEl.appendChild(renderService(section, service));
    });

    el.querySelector('[data-action="add-service"]').onclick = () => {
        section.services.push({ id: "", title: "", url: "" });
        render();
    };

    el.querySelector('[data-action="delete-section"]').onclick = () => {
        state.sections = state.sections.filter(s => s !== section);
        render();
    };

    el.querySelector('[data-field="section-id"]').oninput = e => {
        section.id = e.target.value;
    };

    el.querySelector('[data-field="section-title"]').oninput = e => {
        section.title = e.target.value;
    };

    return el;
}

function renderService(section, service) {
    const el = clone("service-template");

    el.querySelector('[data-label="service-id"]').textContent = T.serviceId;
    el.querySelector('[data-label="service-title"]').textContent = T.serviceTitle;
    el.querySelector('[data-label="service-url"]').textContent = T.serviceUrl;

    el.querySelector('[data-action="delete-service"]').textContent = T.deleteService;

    el.querySelector('[data-field="service-id"]').value = service.id ?? "";
    el.querySelector('[data-field="service-title"]').value = service.title ?? "";
    el.querySelector('[data-field="service-url"]').value = service.url ?? "";

    enable(el);

    el.querySelector('[data-action="delete-service"]').onclick = () => {
        section.services = section.services.filter(s => s !== service);
        render();
    };

    el.querySelector('[data-field="service-id"]').oninput = e => {
        service.id = e.target.value;
    };

    el.querySelector('[data-field="service-title"]').oninput = e => {
        service.title = e.target.value;
    };

    el.querySelector('[data-field="service-url"]').oninput = e => {
        service.url = e.target.value;
    };

    return el;
}

document.getElementById("add-section").onclick = () => {
    state.sections.push({ id: "", title: "", services: [] });
    render();
};

async function init() {
    const res = await fetch("/admin/api/services");
    state = await res.json();
    render();
}

init();
