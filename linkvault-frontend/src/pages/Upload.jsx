import { useEffect, useState } from "react";

export default function Upload() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState("");
  const [password, setPassword] = useState("");
  const [oneTime, setOneTime] = useState(false);
  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);
    if (expiry) formData.append("expiryMinutes", expiry);
    if (password) formData.append("password", password);
    if (oneTime) formData.append("oneTime", "true");

    const res = await fetch("http://localhost:4000/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLink(data.link);
    setExpiresAt(data.expiresAt);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remaining = expiresAt ? Math.max(0, expiresAt - now) : null;
  const mm = remaining ? Math.floor(remaining / 60000) : 0;
  const ss = remaining ? Math.floor((remaining % 60000) / 1000) : 0;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-black/70 backdrop-blur-xl p-8 pulse-blood">

        <h1 className="text-3xl font-black tracking-widest text-center text-red-500">
          LINKVAULT
        </h1>
        <p className="text-center text-xs uppercase tracking-widest text-red-400/70 mb-6">
          secure • temporary • irreversible
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full bg-black/80 border border-red-900/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            placeholder="enter text (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />

          <input
            type="file"
            className="w-full text-sm file:bg-red-700 file:text-white file:border-none file:px-4 file:py-2 file:rounded-lg file:cursor-pointer"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <input
            type="number"
            placeholder="expiry in minutes (default 10)"
            className="w-full bg-black/80 border border-red-900/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />

          <input
            type="password"
            placeholder="password (optional)"
            className="w-full bg-black/80 border border-red-900/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          <button className="w-full mt-4 bg-red-700 hover:bg-red-800 py-3 rounded-xl font-bold tracking-widest">
            GENERATE LINK
          </button>
        </form>

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
          </div>
        )}
      </div>
    </div>
  );
}
