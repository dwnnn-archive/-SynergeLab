import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eye, EyeSlash, LockSimple, SquaresFour } from "@phosphor-icons/react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export async function authRequest(path, method = "GET", body) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || "연결을 확인한 뒤 다시 시도해 주세요.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [members, setMembers] = useState([]),
    [ready, setReady] = useState(false);
  const generation = useRef(0);
  function apply(data) {
    setUser(data.user);
    setMembers(data.members || []);
  }
  useEffect(() => {
    let stopped = false;
    async function refresh() {
      const started = generation.current;
      try {
        const data = await authRequest("/api/session");
        if (!stopped && started === generation.current) apply(data);
      } catch (error) {
        if (
          !stopped &&
          started === generation.current &&
          error.status === 401
        ) {
          setUser(null);
          setMembers([]);
        }
      } finally {
        if (!stopped) setReady(true);
      }
    }
    function expired() {
      generation.current++;
      setUser(null);
      setMembers([]);
    }
    function visible() {
      if (document.visibilityState === "visible") refresh();
    }
    refresh();
    const timer = setInterval(visible, 60000);
    window.addEventListener("synergelab-auth-expired", expired);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("synergelab-auth-expired", expired);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(
      () => {
        generation.current++;
        setUser(null);
        setMembers([]);
      },
      Math.max(0, user.expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [user?.expiresAt]);
  async function login(password) {
    const data = await authRequest("/api/login", "POST", { password });
    generation.current++;
    apply(data);
  }
  async function logout() {
    await authRequest("/api/logout", "POST");
    generation.current++;
    setUser(null);
    setMembers([]);
  }
  async function updateAvatar(avatar) {
    try {
      const data = await authRequest("/api/profile", "PUT", { avatar });
      generation.current++;
      apply(data);
    } catch (error) {
      if (error.status === 401) {
        generation.current++;
        setUser(null);
        setMembers([]);
      }
      throw error;
    }
  }
  return (
    <AuthContext.Provider
      value={{ user, members, ready, login, logout, updateAvatar }}
    >
      {user ? (
        <React.Fragment key={user.id}>{children}</React.Fragment>
      ) : (
        <LoginScreen />
      )}
    </AuthContext.Provider>
  );
}

function LoginScreen() {
  const { login, ready } = useAuth();
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const input = useRef(null),
    submitting = useRef(false);
  useEffect(() => {
    if (ready && !busy) input.current?.focus();
  }, [ready, busy]);
  async function submit(event) {
    event.preventDefault();
    if (!ready || submitting.current || event.nativeEvent.isComposing) return;
    if (!password) {
      setError("비밀번호를 입력해 주세요.");
      input.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await login(password);
    } catch (error) {
      setPassword("");
      setShow(false);
      setError(
        error.status === 401
          ? "틀렸습니다."
          : error.status
            ? error.message
            : "연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <div className="login-preview" aria-hidden="true" inert>
        <div className="preview-rail">
          <SquaresFour size={25} weight="fill" />
          <span />
          <span />
          <span />
        </div>
        <div className="preview-sidebar">
          <strong>SynergeLab</strong>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="preview-workspace">
          <div className="preview-breadcrumb" />
          <h2>우리 팀 보드</h2>
          <div className="preview-toolbar" />
          <div className="preview-columns">
            {[0, 1, 2].map((column) => (
              <div
                key={column}
                className={`preview-column preview-column-${column}`}
              >
                <b />
                {[0, 1, 2, 3].slice(0, 4 - column).map((card) => (
                  <div key={card} className="preview-card">
                    <i />
                    <b />
                    <span />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <section className="login-panel" aria-labelledby="login-title">
        <span className="login-logo">
          <SquaresFour size={26} weight="fill" />
        </span>
        <p className="login-brand">SynergeLab</p>
        <h1 id="login-title">우리 팀의 작업 공간</h1>
        <p className="login-description">
          비밀번호를 입력하고 함께 시작하세요.
        </p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="login-password">비밀번호</label>
          <div className="password-field">
            <LockSimple size={18} />
            <input
              id="login-password"
              ref={input}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={128}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              autoFocus
              disabled={busy || !ready}
              aria-invalid={!!error}
              aria-describedby="login-error"
            />
            <button
              type="button"
              aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
              onClick={() => setShow(!show)}
              disabled={busy || !ready}
            >
              {show ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p id="login-error" className="login-error" role="alert">
            {error}
          </p>
          <button className="primary login-submit" disabled={busy || !ready}>
            {!ready ? "확인 중…" : busy ? "입장 중…" : "입장하기"}
          </button>
        </form>
        <p className="login-footer">작은 팀, 함께 만드는 일</p>
      </section>
    </main>
  );
}
