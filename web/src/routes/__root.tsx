import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ThemeProvider } from "@ensdomains/thorin";
import { Web3Provider } from "../utils/Web3Provider";
import { ConnectKitButton } from "connectkit";

export const Route = createRootRoute({
    component: () => (
        <Web3Provider>
            <ThemeProvider>
                <div className="p-2 flex gap-2 items-center">
                    <div className="ml-auto">
                        <ConnectKitButton />
                    </div>
                </div>
                <div className="max-w-3xl mx-auto">
                    <Outlet />
                </div>
                <TanStackRouterDevtools />
            </ThemeProvider>
        </Web3Provider>
    ),
});
