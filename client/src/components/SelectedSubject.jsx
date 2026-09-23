function SelectedSubject({ subject, onClose }) {
  if (!subject) {
    return null;
  }

  return (
    <section>
      <h2>Selected Subject</h2>

      <h3>{subject.name}</h3>

      <p>Code: {subject.code}</p>

      <p>Semester: {subject.semester}</p>

      <p>
        Status: {subject.active ? "Active" : "Inactive"}
      </p>

      <button onClick={onClose}>
        Close
      </button>
    </section>
  );
}

export default SelectedSubject;