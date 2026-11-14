// Verify sessions before sending data; a failed check is not a revoked session.
export async function broadcastBoard(auth, sockets, board) {
  if (!sockets.length) return;
  const hashes = sockets
    .map((socket) => socket.deserializeAttachment()?.hash)
    .filter(Boolean);
  let valid;
  try {
    const response = await auth.fetch("https://auth/internal/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashes }),
    });
    if (!response.ok) throw new Error("Session verification unavailable");
    ({ valid } = await response.json());
    if (!Array.isArray(valid) || valid.some((hash) => typeof hash !== "string"))
      throw new Error("Invalid session verification response");
  } catch {
    for (const socket of sockets) {
      try {
        socket.close(1011, "Session verification unavailable");
      } catch {}
    }
    return;
  }
  const payload = JSON.stringify(board);
  for (const socket of sockets) {
    try {
      if (!valid.includes(socket.deserializeAttachment()?.hash)) {
        socket.close(1008, "Login required");
        continue;
      }
      socket.send(payload);
    } catch {
      try {
        socket.close(1011, "Reconnect");
      } catch {}
    }
  }
}

export async function checkBoardSession(auth, request) {
  try {
    const response = await auth.fetch(
      new Request("https://auth/internal/check", {
        headers: { Cookie: request.headers.get("Cookie") || "" },
      }),
    );
    if (response.ok) return { session: await response.json() };
    if (response.status === 401)
      return { status: 401, error: "로그인이 필요합니다." };
  } catch {}
  return {
    status: 503,
    error: "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  };
}
