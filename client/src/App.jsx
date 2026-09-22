import { useEffect, useState } from "react";
import SubjectCard from "./components/SubjectCard.jsx";

function App() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/v1/subjects"
        );

        if (!response.ok) {
          throw new Error("Failed to load subjects");
        }

        const result = await response.json();

        setSubjects(result.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, []);

  if (loading) {
    return <p>Loading subjects...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <main>
      <h1>CampusFlow</h1>

      <p>My Subjects</p>

      <section>
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
          />
        ))}
      </section>
    </main>
  );
}

export default App;