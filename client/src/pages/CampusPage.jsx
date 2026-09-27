import { Link } from "react-router";
import { BellRing, CalendarDays, BriefcaseBusiness, Search } from "lucide-react";
export default function CampusPage() {
  return <><header className="page-header"><p className="eyebrow">LIFE BEYOND THE CLASSROOM</p><h1>Campus</h1><p>Everything happening across your college.</p></header><div className="card-grid">
    {[[BellRing, "notices", "Notices", "Official announcements and important updates."], [CalendarDays, "events", "Events", "Discover what's on and save your place."], [BriefcaseBusiness, "placements", "Placements", "Find your next opportunity."], [Search, "lost-found", "Lost & Found", "Help belongings find their way home."]].map(([Icon, path, title, description]) => <Link className="card space-card" key={path} to={"/campus/" + path}><Icon size={27} /><h2>{title}</h2><p>{description}</p><span>Explore →</span></Link>)}
  </div></>;
}
