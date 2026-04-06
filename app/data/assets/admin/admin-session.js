(function () {
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

    window.adminFetch = adminFetch;
})();
