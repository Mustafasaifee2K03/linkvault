// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";

// export default function View() {
//   const { id } = useParams();
//   const [data, setData] = useState(null);
//   const [password, setPassword] = useState("");
//   const [verified, setVerified] = useState(false);

//   useEffect(() => {
//     fetch(`http://localhost:4000/api/content/${id}`)
//       .then((res) => (res.ok ? res.json() : Promise.reject()))
//       .then(setData)
//       .catch(() => setData({ error: true }));
//   }, [id]);

//   const verifyPassword = async () => {
//     const res = await fetch(`http://localhost:4000/api/verify/${id}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ password }),
//     });
//     if (res.ok) setVerified(true);
//   };

//   if (!data) return <p className="p-6">Loading...</p>;
//   if (data.error) return <p className="p-6">Invalid or expired link</p>;

//   if (data.requiresPassword && !verified) {
//     return (
//       <div className="p-6">
//         <input
//           type="password"
//           placeholder="Enter password"
//           className="border p-2"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />
//         <button
//           onClick={verifyPassword}
//           className="ml-2 bg-blue-600 text-white p-2"
//         >
//           Verify
//         </button>
//       </div>
//     );
//   }

//   if (data.type === "text") {
//     return (
//       <div className="p-6">
//         <pre className="bg-gray-100 p-4 whitespace-pre-wrap">
//           {data.text}
//         </pre>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       <a
//         href={`http://localhost:4000/api/download/${id}`}
//         className="bg-green-600 text-white p-2 rounded"
//       >
//         Download {data.originalName}
//       </a>
//     </div>
//   );
// }
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MonsterEyes from "../components/MonsterEyes";

export default function View() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVerified(false);
    setPassword("");
    setWrongPassword(false);
    setError(false);
    setShakeScreen(false);
    setLoading(true);
    fetch(`http://localhost:4000/api/content/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);


  const verifyPassword = async () => {
    const res = await fetch(`http://localhost:4000/api/access/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

    if (res.ok) {
      const payload = await res.json();
      setData({ ...payload, requiresPassword: false });
      setVerified(true);
      setWrongPassword(false);
      return;
    }

    const errorData = await res.json().catch(() => ({}));
    if (errorData.error && errorData.error !== "INVALID_PASSWORD") {
      setError(true);
      return;
    }

    // Wrong password - trigger creepy effects
    setWrongPassword(true);
    setShakeScreen(true);
    setPassword("");

    // Stop shaking after animation
    setTimeout(() => {
      setShakeScreen(false);
    }, 1000);

    // Hide error message after 5 seconds
    setTimeout(() => {
      setWrongPassword(false);
    }, 5000);
  };

  // 🔥 EXPIRED / INVALID
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 px-6">
        <MonsterEyes />
        <div className="text-center max-w-xl">
          <h1 className="text-6xl font-black tracking-widest drop-shadow-[0_0_20px_red]">
            EXPIRED
          </h1>
          <p className="mt-6 text-red-400 text-sm uppercase tracking-widest">
            the artifact has dissolved into the void
          </p>
          <p className="mt-4 text-xs text-red-600/70">
            unauthorized resurrection is forbidden
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-400">
        <MonsterEyes />
        <p className="animate-pulse">summoning artifact...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // 🔐 PASSWORD GATE
  if (data.requiresPassword && !verified) {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center px-4 text-red-200 ${shakeScreen ? 'animate-shake' : ''}`}>
        <MonsterEyes />
        
        {/* Creepy wrong password warning */}
        {wrongPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-red-900/30 animate-pulse-fast" />
            <div className="relative text-center animate-glitch-intense">
              <div className="text-6xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(255,0,0,1)] mb-4 tracking-wider">
                ⛧ WRONG ⛧
              </div>
              <div className="text-2xl text-red-400 font-bold tracking-widest">
                THE DEMON REJECTS YOU
              </div>
              <div className="text-sm text-red-600 mt-4 italic">
                your soul trembles in fear...
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-black/70 border border-red-900/50 rounded-xl p-8 shadow-[0_0_40px_rgba(255,0,0,.4)]">
          <h2 className="text-xl font-bold tracking-widest text-red-500 mb-4">
            ⛧ SEALED ⛧
          </h2>
          <p className="text-xs text-red-400 mb-4">
            a seal protects this artifact
          </p>
          <input
            type="password"
            placeholder="enter the seal phrase"
            className={`w-full bg-black border rounded p-3 text-sm focus:outline-none focus:ring-2 transition-all ${
              wrongPassword 
                ? 'border-red-500 ring-2 ring-red-600 text-red-400' 
                : 'border-red-900/50 focus:ring-red-600 text-red-100'
            }`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
          />
          <button
            onClick={verifyPassword}
            className="w-full mt-4 bg-red-700 hover:bg-red-800 py-2 rounded tracking-widest font-semibold transition-all hover:shadow-[0_0_25px_rgba(255,0,0,0.6)]"
          >
            BREAK SEAL
          </button>
          
          {wrongPassword && (
            <p className="mt-4 text-xs text-center text-red-500 animate-pulse">
              ⚠ incorrect incantation ⚠
            </p>
          )}
        </div>
      </div>
    );
  }

  // 📜 TEXT CONTENT
  if (data.type === "text") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 text-red-100">
        <MonsterEyes />
        <div className="max-w-2xl bg-black/80 border border-red-900/50 rounded-xl p-6 shadow-[0_0_40px_rgba(255,0,0,.4)]">
          <h2 className="text-red-500 tracking-widest mb-4">
            ⛧ INSCRIBED TEXT ⛧
          </h2>
          <pre className="whitespace-pre-wrap text-sm text-red-200">
            {data.text}
          </pre>
        </div>
      </div>
    );
  }

  // 📦 FILE DOWNLOAD
  const downloadUrl = verified
    ? `http://localhost:4000/api/download/${id}?password=${encodeURIComponent(password)}`
    : `http://localhost:4000/api/download/${id}`;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 text-red-100">
      <MonsterEyes />
      <div className="bg-black/80 border border-red-900/50 rounded-2xl p-8 shadow-[0_0_60px_rgba(255,0,0,.5)] max-w-md w-full text-center">
        <h2 className="text-2xl font-black tracking-widest text-red-500 drop-shadow">
          ⛧ FORBIDDEN ARTIFACT ⛧
        </h2>

        <p className="mt-4 text-sm text-red-300">
          the watcher sees all who download
        </p>

        <div className="mt-6 text-xs text-red-400">
          file name:
          <div className="mt-1 break-all text-red-300">
            {data.originalName}
          </div>
        </div>

        <a
          href={downloadUrl}
          className="inline-block mt-8 bg-red-700 hover:bg-red-800 transition-all px-6 py-3 rounded-xl font-bold tracking-widest shadow-[0_0_25px_rgba(255,0,0,.6)]"
        >
          ⚠️ DOWNLOAD
        </a>

        <p className="mt-6 text-[11px] text-red-600/70 uppercase tracking-widest">
          misuse invites consequences
        </p>
      </div>
    </div>
  );
}
