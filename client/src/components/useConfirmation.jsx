import { useState } from "react";
import Modal from "./Modal.jsx";
export function useConfirmation() {
  const [pending, setPending] = useState(null);
  const confirm = (title, description) => new Promise(resolve => setPending({ title, description, resolve }));
  function finish(value) { pending.resolve(value); setPending(null); }
  const dialog = pending && <Modal title={pending.title} onClose={() => finish(false)}><p>{pending.description}</p><div className="row"><button className="secondary" onClick={() => finish(false)}>Cancel</button><button onClick={() => finish(true)}>Confirm</button></div></Modal>;
  return { confirm, dialog };
}
