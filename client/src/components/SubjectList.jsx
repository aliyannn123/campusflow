import SubjectCard from "./SubjectCard.jsx";

function SubjectList({ subjects, onSelectSubject }) {
  if (subjects.length === 0) {
    return <p>No subjects found.</p>;
  }

  return (
    <section>
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onSelect={onSelectSubject}
        />
      ))}
    </section>
  );
}

export default SubjectList;