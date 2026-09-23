import { Link } from "react-router";

function LoginPage() {
  return (
    <main>
      <h1>CampusFlow</h1>

      <h2>Login</h2>

      <form>
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
          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
          />
        </div>

        <button type="submit">
          Login
        </button>
      </form>

      <p>
        Don't have an account?{" "}
        <Link to="/register">
          Create Account
        </Link>
      </p>
    </main>
  );
}

export default LoginPage;