import { useEffect, useRef, useState } from "react";
import { KEY, SEED, validBoard } from "./model.js";
export const LAST_BOARD = "synergelab-shared-board";
export async function requestBoard(id, method = "GET", body) {
  const response = await fetch(`/api/boards/${id}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "서버 요청에 실패했습니다.");
    error.board = data.board;
    error.status = response.status;
    throw error;
  }
  if (!validBoard(data)) throw new Error("서버 응답을 확인할 수 없습니다.");
  return data;
}
export function useSharedBoard() {
  const [board, setBoard] = useState(null),
    [id, setId] = useState(""),
    [status, setStatus] = useState("loading"),
    [loadError, setLoadError] = useState("");
  const current = useRef(null);
  useEffect(() => {
    let stopped = false,
      socket,
      reconnect,
      heartbeat,
      attempt = 0,
      lastPong = Date.now();
    function apply(data) {
      if (
        !stopped &&
        validBoard(data) &&
        (!current.current || data.revision >= current.current.revision)
      ) {
        current.current = data;
        setBoard(data);
      }
    }
    function connect(boardId) {
      if (stopped) return;
      setStatus("connecting");
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/boards/${boardId}/events`,
      );
      socket.onopen = () => {
        attempt = 0;
        lastPong = Date.now();
        setStatus("live");
      };
      socket.onmessage = (e) => {
        if (e.data === "pong") {
          lastPong = Date.now();
          return;
        }
        try {
          apply(JSON.parse(e.data));
          lastPong = Date.now();
        } catch {}
      };
      socket.onclose = () => {
        if (stopped) return;
        setStatus("offline");
        clearTimeout(reconnect);
        reconnect = setTimeout(
          () => connect(boardId),
          Math.min(10000, 500 * 2 ** attempt++),
        );
      };
      socket.onerror = () => socket.close();
    }
    const refresh = () => {
      if (!stopped && current.current && document.visibilityState === "visible")
        requestBoard(idRef)
          .then(apply)
          .catch(() => {});
    };
    let idRef = "";
    async function start() {
      try {
        const hash = new URLSearchParams(location.hash.slice(1));
        let boardId = hash.get("board"),
          isNew = false;
        if (boardId && !/^[a-f0-9]{48}$/.test(boardId))
          throw new Error(
            "공유 링크가 올바르지 않습니다. 팀원에게 링크를 다시 받아 주세요.",
          );
        if (!boardId) {
          try {
            boardId = localStorage.getItem(LAST_BOARD);
          } catch {}
          if (!/^[a-f0-9]{48}$/.test(boardId || "")) {
            boardId = Array.from(
              crypto.getRandomValues(new Uint8Array(24)),
              (x) => x.toString(16).padStart(2, "0"),
            ).join("");
            isNew = true;
          }
        }
        idRef = boardId;
        if (stopped) return;
        setId(boardId);
        history.replaceState(
          null,
          "",
          `${location.pathname}${location.search}#board=${boardId}`,
        );
        let initial = SEED;
        try {
          const pending = JSON.parse(
            localStorage.getItem("synergelab-pending-create") || "null",
          );
          if (pending?.id === boardId && validBoard(pending.board)) {
            isNew = true;
            initial = pending.board;
          }
        } catch {}
        if (isNew) {
          try {
            const old = JSON.parse(localStorage.getItem(KEY) || "null");
            if (validBoard(old)) initial = old;
          } catch {}
        }
        if (isNew)
          try {
            localStorage.setItem(
              "synergelab-pending-create",
              JSON.stringify({ id: boardId, board: initial }),
            );
          } catch {}
        const data = await requestBoard(
          boardId,
          isNew ? "POST" : "GET",
          isNew ? initial : undefined,
        );
        if (stopped) return;
        try {
          localStorage.setItem(LAST_BOARD, boardId);
          const pending = JSON.parse(
            localStorage.getItem("synergelab-pending-create") || "null",
          );
          if (pending?.id === boardId)
            localStorage.removeItem("synergelab-pending-create");
        } catch {}
        apply(data);
        connect(boardId);
        heartbeat = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            if (Date.now() - lastPong > 75000) socket.close();
            else socket.send("ping");
          }
        }, 25000);
      } catch (error) {
        if (!stopped) {
          setLoadError(error.message);
          setStatus("offline");
        }
      }
    }
    const changedLink = () => {
      const selected = new URLSearchParams(location.hash.slice(1)).get("board");
      if (idRef && selected !== idRef) location.reload();
    };
    start();
    window.addEventListener("hashchange", changedLink);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      window.removeEventListener("hashchange", changedLink);
      clearTimeout(reconnect);
      clearInterval(heartbeat);
      socket?.close();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  async function save(base, next) {
    try {
      const data = await requestBoard(id, "PATCH", { base, next });
      if (!current.current || data.revision >= current.current.revision) {
        current.current = data;
        setBoard(data);
      }
      return data;
    } catch (error) {
      if (
        error.board &&
        validBoard(error.board) &&
        (!current.current || error.board.revision >= current.current.revision)
      ) {
        current.current = error.board;
        setBoard(error.board);
      }
      throw error;
    }
  }
  return { board, id, status, loadError, save };
}
