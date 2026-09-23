function SubjectCard({ subject, onSelect }) {
  return (
    <article>
      <h2>{subject.name}</h2>

      <p>Code: {subject.code}</p>

      <p>Semester: {subject.semester}</p>

      <button onClick={() => onSelect(subject)}>
        View Subject
      </button>
    </article>
  );
}

export default SubjectCard;