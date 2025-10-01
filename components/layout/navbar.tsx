import Link from "next/link";
import { UserMenu } from "./user-menu";
import { requireAuth } from "@/lib/utils/auth-helpers";

export async function Navbar() {
  const user = await requireAuth();

  return (
    <nav className="border-b border-gray-200 bg-white" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-xl font-bold"
              data-testid="navbar-logo"
            >
              Spider Mind v2
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </nav>
  );
}
