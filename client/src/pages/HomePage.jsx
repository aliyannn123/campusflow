import { Link } from "react-router";

function HomePage() {
  return (
    <main>
      <header>
        <h1>CampusFlow</h1>

        <p>Welcome to your campus dashboard.</p>
      </header>

      <section>
        <h2>Quick Navigation</h2>

        <nav>
          <ul>
            <li>
              <Link to="/academic">
                Academic
              </Link>
            </li>

            <li>
              <Link to="/community">
                Community
              </Link>
            </li>

            <li>
              <Link to="/campus">
                Campus
              </Link>
            </li>

            <li>
              <Link to="/calendar">
                Calendar
              </Link>
            </li>
          </ul>
        </nav>
      </section>
    </main>
  );
}

export default HomePage;