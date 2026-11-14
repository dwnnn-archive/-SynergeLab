import { test } from "node:test";
import assert from "node:assert/strict";
import {
  credentials,
  matchPassword,
  randomToken,
  readToken,
  sessionCookie,
  validAvatar,
  COOKIE_NAME,
} from "../worker/auth-helpers.js";
test("인증 비밀값이 없거나 동일하면 로그인 구성을 거부한다", () => {
  assert.equal(credentials({}), null);
  assert.equal(
    credentials({ AUTH_PASSWORD_BOM: "same", AUTH_PASSWORD_DAEWON: "same" }),
    null,
  );
});
test("두 계정을 비밀번호로 식별하고 임의의 입력은 거부한다", async () => {
  const values = [randomToken(), randomToken()];
  assert.equal(await matchPassword(values[0], values), 0);
  assert.equal(await matchPassword(values[1], values), 1);
  assert.equal(await matchPassword("incorrect", values), -1);
});
test("세션 쿠키는 안전한 속성과 충분한 무작위 값을 사용한다", () => {
  const token = randomToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, randomToken());
  const cookie = sessionCookie(token);
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"])
    assert.ok(cookie.includes(attribute));
  assert.equal(
    readToken(
      new Request("https://test", {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      }),
    ),
    token,
  );
  assert.equal(
    readToken(
      new Request("https://test", {
        headers: { Cookie: `${COOKIE_NAME}=forged` },
      }),
    ),
    "",
  );
});
test("프로필 사진은 작은 래스터 형식만 허용하고 SVG 및 위장 파일은 거부한다", () => {
  assert.equal(validAvatar(null), true);
  assert.equal(validAvatar("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(
    validAvatar("data:image/png;base64," + btoa("<script>bad</script>")),
    false,
  );
  assert.equal(
    validAvatar(
      "data:image/png;base64," + btoa("\x89PNG\r\n\x1a\n" + "x".repeat(140000)),
    ),
    false,
  );
});
