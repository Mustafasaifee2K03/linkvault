import { useEffect, useState } from "react";
import MonsterEyes from "../components/MonsterEyes";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm"
];

export default function Upload() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState("");
  const [password, setPassword] = useState("");
  const [oneTime, setOneTime] = useState(false);
  const [maxViews, setMaxViews] = useState("");
  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [contentId, setContentId] = useState("");
  const [deleteToken, setDeleteToken] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("");
  const [viewCount, setViewCount] = useState(0);
  const [maxViewsResult, setMaxViewsResult] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("linkvault_token") || ""
  );
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [myContents, setMyContents] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState("");
  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const persistToken = (token) => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem("linkvault_token", token);
    } else {
      localStorage.removeItem("linkvault_token");
    }
  };

  const clearAuth = () => {
    persistToken("");
    setAuthUser(null);
    setMyContents([]);
  };

  useEffect(() => {
    if (!authToken) {
      setAuthUser(null);
      return;
    }

    const checkSession = async () => {
      const res = await fetch("http://localhost:4000/api/me", {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) {
        clearAuth();
        return;
      }

      const data = await res.json();
      setAuthUser(data.user || null);
    };

    checkSession();
  }, [authToken]);

  const handleAuth = async (mode) => {
    if (!authEmail || !authPassword) {
      setAuthError("Email and password required.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");

    const res = await fetch(`http://localhost:4000/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail, password: authPassword })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = errorData.error || "Authentication failed.";
      setAuthError(error.replace(/_/g, " ").toLowerCase());
      setAuthBusy(false);
      return;
    }

    const data = await res.json();
    persistToken(data.token);
    setAuthUser(data.user || null);
    setAuthPassword("");
    setAuthBusy(false);
  };

  const handleLogout = async () => {
    if (!authToken) {
      clearAuth();
      return;
    }

    await fetch("http://localhost:4000/api/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` }
    });

    clearAuth();
  };

  const fetchMyContents = async () => {
    if (!authToken) return;
    setMyLoading(true);
    setMyError("");

    const res = await fetch("http://localhost:4000/api/my-contents", {
      headers: authHeaders
    });

    if (!res.ok) {
      setMyError("could not load your uploads");
      setMyLoading(false);
      return;
    }

    const data = await res.json();
    setMyContents(Array.isArray(data.items) ? data.items : []);
    setMyLoading(false);
  };

  useEffect(() => {
    if (!authUser || !authToken) {
      setMyContents([]);
      return;
    }
    fetchMyContents();
  }, [authUser, authToken]);

  const handleFileChange = (event) => {
    const selected = event.target.files[0];

    if (!selected) {
      setFile(null);
      setUploadError("");
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      setFile(null);
      setUploadError("File type not allowed.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setUploadError(`File too large. Max ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setUploadError("");
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadError("");
    setDeleteStatus("");

    if (!text && !file) {
      setUploadError("Text or file required.");
      return;
    }

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);
    if (expiry) formData.append("expiryMinutes", expiry);
    if (password) formData.append("password", password);
    if (oneTime) formData.append("oneTime", "true");
    if (maxViews) formData.append("maxViews", maxViews);

    const res = await fetch("http://localhost:4000/api/upload", {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      setUploadError(errorData.error || "Upload failed.");
      return;
    }

    const data = await res.json();
    setLink(data.link);
    setExpiresAt(data.expiresAt);
    setContentId(data.id || "");
    setDeleteToken(data.deleteToken || "");
    setViewCount(typeof data.viewCount === "number" ? data.viewCount : 0);
    setMaxViewsResult(data.maxViews ?? null);
  };

  const handleDeleteNow = async () => {
    if (!contentId || !deleteToken) return;
    setDeleteStatus("deleting");

    const res = await fetch(`http://localhost:4000/api/delete/${contentId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ deleteToken })
      }
    );

    if (res.ok) {
      setDeleteStatus("deleted");
      setLink("");
      setExpiresAt(null);
      setContentId("");
      setDeleteToken("");
    } else {
      setDeleteStatus("failed");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remaining = expiresAt ? Math.max(0, expiresAt - now) : null;
  const mm = remaining ? Math.floor(remaining / 60000) : 0;
  const ss = remaining ? Math.floor((remaining % 60000) / 1000) : 0;
  const uploadHint = uploadError
    ? `Try a file under ${MAX_FILE_SIZE_MB} MB and one of: pdf, images, text, office, zip, audio, video.`
    : "";

  const handleOwnerDelete = async (id) => {
    if (!authToken) return;

    const res = await fetch(`http://localhost:4000/api/delete/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({})
      }
    );

    if (res.ok) {
      fetchMyContents();
    }
  };

  useEffect(() => {
    if (!contentId || !deleteToken) return;

    const poll = async () => {
      const res = await fetch(`http://localhost:4000/api/stats/${contentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ deleteToken })
        }
      );

      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.viewCount === "number") {
        setViewCount(data.viewCount);
      }
      if (data.maxViews !== undefined) {
        setMaxViewsResult(data.maxViews ?? null);
      }
    };

    poll();
    const timer = setInterval(poll, 4000);
    return () => clearInterval(timer);
  }, [contentId, deleteToken]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative z-10 overflow-hidden">
      <MonsterEyes />
      
      {/* Creepy fog effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/10 via-transparent to-red-950/20 pointer-events-none animate-pulse-slow" />
      
      <div className="w-full max-w-lg rounded-2xl border-2 border-red-900/70 bg-black/90 backdrop-blur-xl p-8 pulse-blood shadow-[0_0_60px_rgba(139,0,0,0.6)]">

        <h1 className="text-3xl font-black tracking-widest text-center text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] hover-glitch">
          LINKVAULT
        </h1>
        <p className="text-center text-xs uppercase tracking-widest text-red-400/70 mb-2">
          secure • temporary • irreversible
        </p>
        <p className="text-center text-[10px] text-red-600/50 mb-6 italic">
          ⚠ you are being watched ⚠
        </p>

        <div className="mb-6 rounded-xl border border-red-900/50 bg-black/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3">
            account
          </p>

          {authUser ? (
            <div className="flex items-center justify-between text-xs text-red-300">
              <span>signed in as {authUser.email}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded bg-red-900 hover:bg-red-800"
                type="button"
              >
                sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                placeholder="email"
                className="w-full bg-black/90 border border-red-900/60 rounded-lg p-2 text-xs text-red-100 placeholder-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 transition-all"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="password (min 8 chars)"
                className="w-full bg-black/90 border border-red-900/60 rounded-lg p-2 text-xs text-red-100 placeholder-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 transition-all"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAuth("login")}
                  disabled={authBusy}
                  className="flex-1 bg-red-800 hover:bg-red-700 py-2 rounded text-xs tracking-widest"
                >
                  sign in
                </button>
                <button
                  type="button"
                  onClick={() => handleAuth("register")}
                  disabled={authBusy}
                  className="flex-1 bg-red-900 hover:bg-red-800 py-2 rounded text-xs tracking-widest"
                >
                  create account
                </button>
              </div>
              {authError && (
                <p className="text-[10px] text-red-400">{authError}</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full bg-black/90 border border-red-900/60 rounded-lg p-3 text-sm text-red-100 placeholder-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 transition-all shadow-inner"
            placeholder="enter text (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />

          <input
            type="file"
            className="w-full text-sm file:bg-red-700 file:text-white file:border-none file:px-4 file:py-2 file:rounded-lg file:cursor-pointer"
            onChange={handleFileChange}
          />

          <p className="text-[10px] text-red-500/70">
            max {MAX_FILE_SIZE_MB} MB • allowed types: pdf, images, text, office, zip, audio, video
          </p>

          <input
            type="number"
            placeholder="expiry in minutes (default 10)"
            className="w-full bg-black/90 border border-red-900/60 rounded-lg p-3 text-sm text-red-100 placeholder-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 transition-all shadow-inner"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />

          <input
            type="password"
            placeholder="password (optional)"
            className="w-full bg-black/90 border border-red-900/60 rounded-lg p-3 text-sm text-red-100 placeholder-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 transition-all shadow-inner"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="number"
            placeholder="max views (optional)"
            className="w-full bg-black/90 border border-red-900/60 rounded-lg p-3 text-sm text-red-100 placeholder-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 transition-all shadow-inner"
            value={maxViews}
            onChange={(e) => setMaxViews(e.target.value)}
          />


          <label className="flex items-center gap-2 text-xs text-red-300">
            <input
              type="checkbox"
              checked={oneTime}
              onChange={() => setOneTime(!oneTime)}
              className="accent-red-600"
            />
            one-time access
          </label>

          <button className="w-full mt-4 bg-red-700 hover:bg-red-600 py-3 rounded-xl font-bold tracking-widest transition-all shadow-[0_0_20px_rgba(255,0,0,0.4)] hover:shadow-[0_0_35px_rgba(255,0,0,0.7)] hover:scale-[1.02]">
            GENERATE LINK
          </button>
        </form>

        {uploadError && (
          <div className="mt-4 text-xs text-red-400">
            <p>{uploadError}</p>
            {uploadHint && (
              <p className="mt-1 text-red-500/80">{uploadHint}</p>
            )}
          </div>
        )}

        {link && (
          <div className="mt-6 border border-red-900/50 rounded-xl p-4 bg-black/80">
            <p className="text-red-400 font-semibold mb-1">
              secure link generated
            </p>

            <div className="flex gap-2 items-center">
              <a
                href={link}
                className="text-red-300 underline break-all text-xs flex-1"
              >
                {link}
              </a>
              <button
                onClick={copyLink}
                className="px-3 py-1 text-xs bg-red-700 hover:bg-red-800 rounded"
              >
                COPY
              </button>
            </div>

            {copied && (
              <p className="mt-2 text-xs text-green-400">
                ✔ copied to clipboard
              </p>
            )}

            {remaining !== null && (
              <p className="mt-3 text-xs text-red-400">
                expires in {mm}:{String(ss).padStart(2, "0")}
              </p>
            )}

            <p className="mt-2 text-xs text-red-400">
              views: {viewCount}{maxViewsResult ? ` / ${maxViewsResult}` : ""}
            </p>

            {deleteToken && (
              <div className="mt-4 text-xs text-red-300">
                <p className="mb-2">manual delete token:</p>
                <p className="break-all text-red-400">{deleteToken}</p>
                <button
                  onClick={handleDeleteNow}
                  className="mt-3 w-full bg-red-900 hover:bg-red-800 py-2 rounded"
                >
                  DELETE NOW
                </button>
                {deleteStatus === "deleted" && (
                  <p className="mt-2 text-green-400">deleted</p>
                )}
                {deleteStatus === "failed" && (
                  <p className="mt-2 text-red-400">delete failed</p>
                )}
              </div>
            )}
          </div>
        )}

        {authUser && (
          <div className="mt-6 border border-red-900/50 rounded-xl p-4 bg-black/80">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-red-500">
                your vault
              </p>
              <button
                onClick={fetchMyContents}
                className="text-[10px] text-red-400 hover:text-red-300"
                type="button"
              >
                refresh
              </button>
            </div>

            {myLoading && (
              <p className="mt-3 text-xs text-red-400">loading...</p>
            )}

            {myError && (
              <p className="mt-3 text-xs text-red-400">{myError}</p>
            )}

            {!myLoading && !myError && myContents.length === 0 && (
              <p className="mt-3 text-xs text-red-400">no uploads yet</p>
            )}

            {!myLoading && !myError && myContents.length > 0 && (
              <div className="mt-3 space-y-3">
                {myContents.map((item) => (
                  <div
                    key={item.id}
                    className="border border-red-900/40 rounded-lg p-3 text-xs text-red-300"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {item.type === "file"
                          ? item.originalName || "file"
                          : "text snippet"}
                      </span>
                      <button
                        onClick={() => handleOwnerDelete(item.id)}
                        className="text-[10px] text-red-400 hover:text-red-200"
                        type="button"
                      >
                        delete
                      </button>
                    </div>
                    <div className="mt-2 text-[10px] text-red-500/80">
                      views: {item.viewCount}
                      {item.maxViews ? ` / ${item.maxViews}` : ""}
                    </div>
                    <a
                      href={`http://localhost:5173/view/${item.id}`}
                      className="mt-2 block text-[10px] text-red-300 underline break-all"
                    >
                      http://localhost:5173/view/{item.id}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
