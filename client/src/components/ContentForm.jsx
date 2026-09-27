import { useState } from "react";
export default function ContentForm({ fields, onSubmit, label = "Publish", initial = {} }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(form));
    for (const field of fields) { if (field.type === "checkbox") data[field.name] = new FormData(form).has(field.name); if (field.multiple) data[field.name] = new FormData(form).getAll(field.name); }
    try { await onSubmit(data); form.reset(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    {fields.map(field => <label key={field.name}>{field.label}
      {field.options ? <select name={field.name} multiple={field.multiple} defaultValue={initial[field.name] ?? (field.multiple ? [] : field.options[0]?.[0])} required={!field.optional}>{field.options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> :
        field.type === "textarea" ? <textarea name={field.name} required={!field.optional} maxLength={field.max || 5000} defaultValue={initial[field.name] || ""} /> :
          <input name={field.name} type={field.type || "text"} required={!field.optional} min={field.min} max={field.max} step={field.step} maxLength={field.type === "text" || !field.type ? 180 : undefined} defaultChecked={field.type === "checkbox" ? Boolean(initial[field.name]) : undefined} defaultValue={field.type === "checkbox" ? undefined : initial[field.name] ?? ""} />}
    </label>)}
    {error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? "Saving…" : label}</button>
  </form>;
}
