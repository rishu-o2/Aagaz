import { useState, useRef } from "react";
import { firestore, firebaseApp } from "../firebase";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function ImageGalleryManager({ gallery, setGallery, onSave, busy, token }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; }
    setError("");

    // Check if Firebase Storage is available
    if (!firebaseApp) {
      setError("Firebase not configured. Using color tile mode.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const storage = getStorage(firebaseApp);
      const filename = `gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const sRef = storageRef(storage, filename);
      const task = uploadBytesResumable(sRef, file);

      task.on("state_changed",
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => { setError(err.message); setUploading(false); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          const newItem = { id: `gallery-${Date.now()}`, label: file.name.replace(/\.[^.]+$/, ""), color: "#006c86", imageUrl: url };
          setGallery(prev => [...prev, newItem]);
          setUploadProgress(0);
          setUploading(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      );
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  }

  function update(id, key, value) { setGallery(items => items.map(i => i.id === id ? { ...i, [key]: value } : i)); }
  function addColorTile() { setGallery(items => [...items, { id: `gallery-${Date.now()}`, label: "New Photo", color: "#00d4ff" }]); }
  function remove(id) { setGallery(items => items.filter(i => i.id !== id)); }

  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-3xl font-bold uppercase">Gallery Highlights</h3>
        <div className="flex gap-2">
          <button onClick={addColorTile} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-cyan">
            + Color Tile
          </button>
          <label className="cursor-pointer rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-cyan">
            + Upload Image
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <button disabled={busy} onClick={() => onSave("/api/admin/gallery", gallery, "Gallery saved.")} className="rounded-md bg-cyan px-3 py-2 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-50">
            Save
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-900/30 border border-red-500/30 px-4 py-2 text-sm text-red-400">{error}</p>}

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Uploading...</span><span>{uploadProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-cyan transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {gallery.map(item => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-ink p-3">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.label} className="h-10 w-16 rounded object-cover border border-white/10" />
              : <input type="color" value={item.color || "#00d4ff"} onChange={e => update(item.id, "color", e.target.value)} className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
            }
            <input
              value={item.label}
              onChange={e => update(item.id, "label", e.target.value)}
              className="flex-1 rounded border border-white/10 bg-navy p-2 text-sm outline-none"
              placeholder="Caption"
            />
            {item.imageUrl && <span className="text-[10px] font-bold text-lime uppercase">Uploaded</span>}
            <button onClick={() => remove(item.id)} className="text-xl text-slate-500 hover:text-red-500">×</button>
          </div>
        ))}
        {gallery.length === 0 && <p className="text-sm text-slate-500">No gallery items. Add a color tile or upload an image.</p>}
      </div>
    </section>
  );
}
