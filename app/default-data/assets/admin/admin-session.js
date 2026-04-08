(function () {
    function syncSaveBarViewportOffset() {
        if (!document.getElementById("save-bar")) {
            return;
        }

        const rootStyle = document.body ? document.body.style : null;
        if (!rootStyle) {
            return;
        }

        const viewport = window.visualViewport;
        if (!viewport) {
            rootStyle.setProperty("--admin-save-bar-offset-bottom", "0px");
            return;
        }

        const layoutHeight = Math.max(
            window.innerHeight || 0,
            document.documentElement ? document.documentElement.clientHeight : 0
        );
        const offsetBottom = Math.max(0, layoutHeight - viewport.height - viewport.offsetTop);
        rootStyle.setProperty("--admin-save-bar-offset-bottom", `${Math.round(offsetBottom)}px`);
    }

    function redirectToAdminLogin() {
        window.location.href = "/admin/login";
    }

    async function adminFetch(input, init) {
        const response = await fetch(input, {
            ...init,
            headers: {
                ...(init && init.headers ? init.headers : {}),
                "X-Admin-Request": "1"
            }
        });

        const redirectTarget = response.headers.get("X-Admin-Redirect");
        if (response.status === 401 || redirectTarget === "/admin/login") {
            redirectToAdminLogin();
            throw new Error("admin_auth_required");
        }

        if (response.redirected && response.url && response.url.includes("/admin/login")) {
            redirectToAdminLogin();
            throw new Error("admin_auth_required");
        }

        return response;
    }

    syncSaveBarViewportOffset();

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncSaveBarViewportOffset);
        window.visualViewport.addEventListener("scroll", syncSaveBarViewportOffset);
    } else {
        window.addEventListener("resize", syncSaveBarViewportOffset);
    }

    window.addEventListener("orientationchange", syncSaveBarViewportOffset);
    window.addEventListener("pageshow", syncSaveBarViewportOffset);

    window.adminFetch = adminFetch;
})();
