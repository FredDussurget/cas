const assert = require("assert");
const cas = require("../../cas.js");

(async () => {
    const browser = await cas.newBrowser(cas.browserOptions());
    const page = await cas.newPage(browser);
    const service = "https://localhost:9859/anything/cas";

    const url = `https://localhost:8443/cas/login?service=${service}`;
    await cas.goto(page, url);

    await cas.assertVisibility(page, "li #Keycloak");
    await cas.click(page, "li #Keycloak");
    await cas.waitForNavigation(page);
    await cas.sleep(3000);
    await cas.screenshot(page);
    await cas.loginWith(page, "caskeycloak", "r2RlZXz6f2h5");
    await cas.sleep(1000);

    await cas.logPage(page);
    const result = new URL(page.url());
    await cas.log(result.searchParams.toString());

    assert(result.searchParams.has("ticket") === true);

    const ticket = result.searchParams.get("ticket");
    const body = await cas.doRequest(`https://localhost:8443/cas/p3/serviceValidate?service=${service}&ticket=${ticket}&format=JSON`);
    await cas.log(body);
    const json = JSON.parse(body);
    const authenticationSuccess = json.serviceResponse.authenticationSuccess;
    assert(authenticationSuccess.user === "caskeycloak@example.org");
    assert(authenticationSuccess.attributes.name !== undefined);
    assert(authenticationSuccess.attributes.email !== undefined);
    assert(authenticationSuccess.attributes.department !== undefined);
    assert(authenticationSuccess.attributes.cas_role !== undefined);
    assert(authenticationSuccess.attributes.sid !== undefined);
    assert(authenticationSuccess.attributes.access_token !== undefined);
    assert(authenticationSuccess.attributes.refresh_token !== undefined);

    await cas.gotoLogin(page);
    await cas.assertCookie(page);
    await cas.separator();

    const sid = authenticationSuccess.attributes.sid[0];
    const privateKey = "enTHR15K28p0N6f404HaC9Vp1cfIBgQiHhmbgBiO7UHEnSiNJudxtDhPQNFjFQtOVSjEYu0pr5yxEeBAiO6IlA";
    const jwt = await cas.createJwt({
        "jti": "THJZGsQDP26OuwQn",
        "iss": "https://localhost:8989/realms/cas",
        "sid": sid,
        "aud": "kc-client",
        "sub": "casuser",
        "client_id": "caskeycloak"
    }, privateKey, "HS512");
    const logoutUrl = `https://localhost:8443/cas/login?logout_token=${jwt}&client_name=Keycloak`;

    await cas.doPost(logoutUrl, "", {
        "Content-Type": "application/json"
    }, (res) => assert(res.status === 200),
    (error) => {
        throw `Operation failed: ${error}`;
    });

    await cas.gotoLogin(page);
    await cas.assertCookie(page, false);

    await browser.close();
})();
