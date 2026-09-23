import { Link } from "react-router";

function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>

      <p>
        The page you are looking for does not exist.
      </p>

      <Link to="/">
        Go Home
      </Link>
    </main>
  );
}

export default NotFoundPage;