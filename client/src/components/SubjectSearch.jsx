function SubjectSearch({ searchTerm, onSearchChange }) {
  return (
    <div>
      <label htmlFor="subject-search">
        Search subjects
      </label>

      <input
        id="subject-search"
        type="text"
        placeholder="Search by subject name or code"
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>
  );
}

export default SubjectSearch;