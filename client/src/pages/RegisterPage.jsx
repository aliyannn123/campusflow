import { Link } from "react-router";

function RegisterPage() {
  return (
    <main>
      <h1>Create CampusFlow Account</h1>

      <form>
        <div>
          <label htmlFor="name">
            Full Name
          </label>

          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="email">
            College Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="student@college.ac.in"
          />
        </div>

        <div>
          <label htmlFor="accountType">
            Account Type
          </label>

          <select id="accountType">
            <option value="STUDENT">
              Student
            </option>

            <option value="FACULTY">
              Faculty
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Create a password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
          />
        </div>

        <button type="submit">
          Create Account
        </button>
      </form>

      <p>
        Already have an account?{" "}
        <Link to="/login">
          Login
        </Link>
      </p>
    </main>
  );
}

export default RegisterPage;