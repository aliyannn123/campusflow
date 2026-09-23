import { useEffect, useState } from "react";

import SubjectList from "./components/SubjectList.jsx";
import SubjectSearch from "./components/SubjectSearch.jsx";
import SelectedSubject from "./components/SelectedSubject.jsx";

function App() {
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

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

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
  };

  const handleCloseSubject = () => {
    setSelectedSubject(null);
  };

  const filteredSubjects = subjects.filter((subject) => {
    const search = searchTerm.toLowerCase();

    const nameMatches = subject.name
      .toLowerCase()
      .includes(search);

    const codeMatches = subject.code
      .toLowerCase()
      .includes(search);

    return nameMatches || codeMatches;
  });

  if (loading) {
    return <p>Loading subjects...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <main>
      <header>
        <h1>CampusFlow</h1>

        <p>
          Academic
        </p>
      </header>

      <SubjectSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <p>
        Showing {filteredSubjects.length} subject(s)
      </p>

      <SubjectList
        subjects={filteredSubjects}
        onSelectSubject={handleSelectSubject}
      />

      <SelectedSubject
        subject={selectedSubject}
        onClose={handleCloseSubject}
      />
    </main>
  );
}

export default App;