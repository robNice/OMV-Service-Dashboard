const express = require("express");
const fs = require("fs");
const path = require("path");
const {APP_CODE} = require("../lib/paths");

function createAdminPagesRouter({
    sessions,
    requireAdmin,
    verifyPassword,
    hashPassword,
    loadConfiguration,
    saveConfiguration,
    renderAdminTemplate,
    renderThemeAdminTemplate,
    normalizeTheme,
    loadTemplate,
    projectName,
    projectUrl,
    appVersion,
    crypto
}) {
    const router = express.Router();

    router.get("/login", (req, res) => {
        if (req.session?.isAdmin) {
            return res.redirect("/admin");
        }

        const tpl = fs.readFileSync(
            path.join(APP_CODE, "templates/admin-login.html"),
            "utf8"
        );

        const html = renderAdminTemplate(
            req,
            tpl.replace("{{MESSAGE}}", ""),
            {version: appVersion, projectName, projectUrl}
        );

        res.send(html);
    });

    router.post(
        "/login",
        express.urlencoded({extended: false}),
        (req, res) => {
            const {password} = req.body;
            const config = loadConfiguration();

            if (!verifyPassword(password, config.admin.passwordHash)) {
                const tpl = fs.readFileSync(
                    path.join(APP_CODE, "templates/admin-login.html"),
                    "utf8"
                );

                const html = renderAdminTemplate(
                    req,
                    tpl.replace(
                        "{{MESSAGE}}",
                        '<div class="error">{{__.admin.login.invalid}}</div>'
                    ),
                    {version: appVersion, projectName, projectUrl}
                );

                return res.status(401).send(html);
            }

            const sid = crypto.randomBytes(16).toString("hex");
            sessions.set(sid, {isAdmin: true});

            res.setHeader(
                "Set-Cookie",
                `omv_session=${sid}; HttpOnly; SameSite=Lax`
            );

            res.redirect("/admin");
        }
    );

    router.get("/logout", (req, res) => {
        const cookie = req.headers.cookie
            ?.split("; ")
            .find(c => c.startsWith("omv_session="));

        if (cookie) {
            const sid = cookie.split("=")[1];
            sessions.delete(sid);
        }

        res.setHeader(
            "Set-Cookie",
            "omv_session=; Max-Age=0"
        );

        res.redirect("/admin/login");
    });

    router.get("/", requireAdmin, (req, res) => {
        const tpl = fs.readFileSync(
            path.join(APP_CODE, "templates/admin-index.html"),
            "utf8"
        );

        const html = renderAdminTemplate(req, tpl, {
            version: appVersion,
            projectName,
            projectUrl
        });

        res.send(html);
    });

    router.get("/setpassword", requireAdmin, (req, res) => {
        const tpl = fs.readFileSync(
            path.join(APP_CODE, "templates/admin-setpassword.html"),
            "utf8"
        );

        const html = renderAdminTemplate(req, tpl, {
            version: appVersion,
            projectName,
            projectUrl
        });

        res.send(html);
    });

    router.get("/theme", requireAdmin, (req, res) => {
        const tpl = fs.readFileSync(
            path.join(APP_CODE, "templates/admin-theme.html"),
            "utf8"
        );

        const config = loadConfiguration();
        const html = renderThemeAdminTemplate(
            req,
            tpl,
            normalizeTheme(config.theme),
            {version: appVersion, projectName, projectUrl}
        );

        res.send(html);
    });

    router.get("/config", requireAdmin, (req, res) => {
        const tpl = fs.readFileSync(
            path.join(APP_CODE, "templates/admin-config.html"),
            "utf8"
        );

        const html = renderAdminTemplate(req, tpl, {
            version: appVersion,
            projectName,
            projectUrl
        });

        res.send(html);
    });

    router.post(
        "/setpassword",
        requireAdmin,
        express.urlencoded({extended: false}),
        (req, res) => {
            const {password, passwordRepeat} = req.body;

            if (password !== passwordRepeat || password.length < 8) {
                return res.status(400).json({error: "invalid_password"});
            }

            const config = loadConfiguration();
            config.admin.passwordHash = hashPassword(password);
            config.admin.passwordInitialized = false;
            saveConfiguration(config);

            res.redirect("/admin");
        }
    );

    router.get("/services", requireAdmin, (req, res) => {
        const tpl = fs.readFileSync(
            path.join(APP_CODE, "templates/admin-services.html"),
            "utf8"
        );

        const html = renderAdminTemplate(req, tpl, {
            version: appVersion,
            projectName,
            projectUrl
        });

        res.send(html);
    });

    return router;
}

module.exports = {
    createAdminPagesRouter
};
