const pwNew    = document.getElementById("pw-new");
const pwRepeat = document.getElementById("pw-repeat");
const btn      = document.getElementById("pw-save");
const status   = document.getElementById("pw-status");
const label    = btn.querySelector(".label");
const spinner  = btn.querySelector(".spinner");

let dirty = false;

/* ================= Validation ================= */

function validate() {
    const a = pwNew.value;
    const b = pwRepeat.value;

    if (!a || !b) {
        setStatus("");
        btn.disabled = true;
        return false;
    }

    if (a.length < 8) {
        setStatus("{{__.admin.password.tooShort}}", "error");
        btn.disabled = true;
        return false;
    }

    if (a !== b) {
        setStatus("{{__.admin.password.mismatch}}", "error");
        btn.disabled = true;
        return false;
    }

    setStatus("");
    btn.disabled = false;
    return true;
}

function setStatus(text, type = "hint") {
    status.textContent = text;
    status.className = type;
}

/* ================= Input ================= */

[pwNew, pwRepeat].forEach(el => {
    el.addEventListener("input", () => {
        dirty = true;
        validate();
    });
});

/* ================= Save ================= */

btn.addEventListener("click", async () => {
    if (!validate()) return;

    btn.disabled = true;
    spinner.classList.remove("hidden");
    label.textContent = "{{__.admin.save.saving}}";
    setStatus("");

    try {
        const res = await fetch("/admin/setpassword", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                password: pwNew.value,
                passwordRepeat: pwRepeat.value
            })
        });

        if (!res.ok) throw new Error();

        setStatus("{{__.admin.save.saved}}", "hint");
        dirty = false;

        pwNew.value = "";
        pwRepeat.value = "";
        btn.disabled = true;

    } catch {
        setStatus("{{__.admin.save.error}}", "error");
        btn.disabled = false;
    } finally {
        spinner.classList.add("hidden");
        label.textContent = "{{__.admin.save.label}}";
    }
});
