import React, { useRef, useState } from "react";
import { Camera, SignOut, Trash } from "@phosphor-icons/react";
import { useAuth } from "./auth.jsx";

async function preparePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("PNG, JPG, WebP 사진을 선택해 주세요.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("5MB 이하의 사진을 선택해 주세요.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.");
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const size = Math.min(bitmap.width, bitmap.height);
    canvas
      .getContext("2d")
      .drawImage(
        bitmap,
        (bitmap.width - size) / 2,
        (bitmap.height - size) / 2,
        size,
        size,
        0,
        0,
        256,
        256,
      );
    return canvas.toDataURL("image/webp", 0.85);
  } finally {
    bitmap.close();
  }
}
export function ProfileSettings({ onBusy, onSaved }) {
  const { user, updateAvatar, logout } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fileInput = useRef(null),
    pending = useRef(false);
  async function run(action, message) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await action();
      if (message) onSaved(message);
    } catch (error) {
      setError(
        error.status
          ? error.message
          : error.message?.includes("사진")
            ? error.message
            : "저장하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className="profile-settings">
      <div className={`profile-preview avatar ${user.color}`}>
        {user.avatar ? (
          <img src={user.avatar} alt={`${user.name} 프로필 사진`} />
        ) : (
          user.name.slice(0, 1)
        )}
      </div>
      <strong className="profile-name">{user.name}</strong>
      <p>사진이 없으면 이름의 첫 글자가 표시돼요.</p>
      <input
        ref={fileInput}
        className="profile-file-input"
        aria-label="프로필 사진 파일"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file)
            run(
              async () => updateAvatar(await preparePhoto(file)),
              "프로필 사진을 저장했어요.",
            );
        }}
      />
      <div className="profile-photo-actions">
        <button
          className="primary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Camera size={18} />
          {busy ? "저장 중…" : user.avatar ? "사진 변경" : "사진 등록"}
        </button>
        {user.avatar && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(() => updateAvatar(null), "프로필 사진을 제거했어요.")
            }
          >
            <Trash size={17} />
            사진 제거
          </button>
        )}
      </div>
      <p className="profile-file-hint">PNG, JPG, WebP · 최대 5MB</p>
      <p className="profile-error" role="alert">
        {error}
      </p>
      <footer className="profile-footer">
        <button
          className="secondary"
          disabled={busy}
          onClick={() => run(logout)}
        >
          <SignOut size={18} />
          로그아웃
        </button>
      </footer>
    </div>
  );
}
