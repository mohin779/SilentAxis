import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";

export function ProfilePage() {
  return (
    <Card title="Anonymous access">
      <div className="space-y-4 text-sm text-slate-700">
        <p>
          Profile tracking has been removed to guarantee anonymity. The system does not keep a user-linked complaint history.
        </p>
        <p>
          Use complaint ID + secret key in the status page to view updates for a specific report.
        </p>
        <div className="flex gap-3">
          <Link to="/report">
            <Button>Submit complaint</Button>
          </Link>
          <Link to="/status">
            <Button variant="secondary">Check complaint status</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
