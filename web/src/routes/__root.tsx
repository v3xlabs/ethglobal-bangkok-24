import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ThemeProvider } from "@ensdomains/thorin";

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider>
            <div className="p-2 flex gap-2">
                <Link to="/" className="[&.active]:font-bold">
                    Home
                </Link>{" "}
                {/* <Link to="/about" className="[&.active]:font-bold">
                    About
                </Link> */}
            </div>
            <hr />
            <Outlet />
            <TanStackRouterDevtools />
        </ThemeProvider>
    ),
});
