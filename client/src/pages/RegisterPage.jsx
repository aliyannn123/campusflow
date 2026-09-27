import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../lib/apiClient.js";

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    accountType: "STUDENT",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      await api("/auth/register", {
          method: "post",
          data: {
            name: formData.name,
            email: formData.email,
            accountType: formData.accountType,
            password: formData.password,
          },
      });

      navigate(`/verify-email?email=${encodeURIComponent(formData.email.trim())}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-card">
      <h1>Create CampusFlow Account</h1>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">
            Full Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="email">
            College Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="student@walchandsangli.ac.in"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="accountType">
            Account Type
          </label>

          <select
            id="accountType"
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
          >
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
            name="password"
            type="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Creating Account..."
            : "Create Account"}
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
