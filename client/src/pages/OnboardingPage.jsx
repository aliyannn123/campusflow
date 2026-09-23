function OnboardingPage() {
  return (
    <main>
      <h1>Complete Your Academic Profile</h1>

      <form>
        <div>
          <label htmlFor="department">
            Department
          </label>

          <select id="department">
            <option value="">
              Select Department
            </option>

            <option value="AIML">
              AIML
            </option>

            <option value="CSE">
              CSE
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="year">
            Year
          </label>

          <select id="year">
            <option value="">
              Select Year
            </option>

            <option value="1">First Year</option>
            <option value="2">Second Year</option>
            <option value="3">Third Year</option>
            <option value="4">Fourth Year</option>
          </select>
        </div>

        <div>
          <label htmlFor="semester">
            Semester
          </label>

          <select id="semester">
            <option value="">
              Select Semester
            </option>

            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
          </select>
        </div>

        <div>
          <label htmlFor="section">
            Section
          </label>

          <select id="section">
            <option value="">
              Select Section
            </option>

            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>
        </div>

        <button type="submit">
          Continue
        </button>
      </form>
    </main>
  );
}

export default OnboardingPage;