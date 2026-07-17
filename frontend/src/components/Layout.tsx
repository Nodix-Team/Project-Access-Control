import { useNavigate } from "react-router-dom";
import MockupBanner from "./MockupBanner";
import NavSidebar from "./NavSidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("jwt");
    navigate("/login");
  }

  return (
    <div className="flex h-screen flex-col">
      <MockupBanner />
      <div className="flex flex-1 overflow-hidden">
        <NavSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
            <span className="text-sm text-gray-500">Access Control System v0.2</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
