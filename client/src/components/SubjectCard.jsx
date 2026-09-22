function SubjectCard({ subject }) {
  return (
    <article>
      <h2>{subject.name}</h2>

      <p>Code: {subject.code}</p>

      <p>Semester: {subject.semester}</p>
    </article>
  );
}

export default SubjectCard;