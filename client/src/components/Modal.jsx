import { useEffect, useId, useRef } from "react";
export default function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null), titleId = useId();
  useEffect(() => { const dialog = ref.current; const previous = document.activeElement; dialog.showModal(); return () => { dialog.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="modal-content"><div className="row modal-heading"><h2 id={titleId}>{title}</h2><button type="button" className="secondary" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></div>{children}</div>
  </dialog>;
}
