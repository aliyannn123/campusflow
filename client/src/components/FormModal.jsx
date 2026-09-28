import { useState } from "react";
import Modal from "./Modal.jsx";
export default function FormModal({ title, children }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="secondary" onClick={() => setOpen(true)}>{title}</button>{open && <Modal title={title} onClose={() => setOpen(false)}>{children}</Modal>}</>;
}
