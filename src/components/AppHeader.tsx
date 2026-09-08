import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AppHeader({ current }: { current: "application" | "blueprint" }) {
  const { isPending } = useCurrentUserState();
  const item = (active: boolean) =>
    `h-10 px-2 sm:px-3 rounded-md inline-flex items-center no-underline text-sm whitespace-nowrap ${
      active ? "bg-white/10 text-paper" : "text-accent-soft hover:text-paper"
    }`;

  return (
    <header className="bg-navy text-paper overflow-x-hidden">
      <div className="max-w-[1300px] mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        <Link
          to="/"
          className="font-serif text-base sm:text-lg tracking-tight text-paper no-underline shrink-0"
        >
          CygnusX-1
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          <Link to="/" className={item(current === "application")}>
            Application
          </Link>
          <Link to="/blueprint" className={item(current === "blueprint")}>
            Blueprint
          </Link>
          <a
            href="/cygnusx-1-blueprint.html"
            download="CygnusX-1-Blueprint.html"
            className={`${item(false)} hidden sm:inline-flex`}
          >
            Download
          </a>
          {isPending ? (
            <span className="ml-1 h-8 w-8 rounded-full bg-white/10 animate-pulse shrink-0" />
          ) : (
            <>
              <SignedIn>
                <span className="ml-1 shrink-0">
                  <UserButton />
                </span>
              </SignedIn>
              <SignedOut>
                <Link to="/login" className={`${item(false)} ml-0.5 shrink-0`}>
                  Sign in
                </Link>
              </SignedOut>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
