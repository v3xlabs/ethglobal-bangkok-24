import { WagmiProvider, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

const WALLETCONNECT_PROJECT_ID = import.meta.env
    .VITE_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("VITE_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
}

const config = createConfig(
    getDefaultConfig({
        // Your dApps chains
        chains: [mainnet],
        // transports: {
        //     // RPC URL for each chain
        //     [mainnet.id]: http(
        //         `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_PUBLIC_ALCHEMY_ID}`
        //     ),
        // },

        // Required API Keys
        walletConnectProjectId: WALLETCONNECT_PROJECT_ID,

        // Required App Info
        appName: "ENS Auto Renew",

        // Optional App Info
        appDescription: "Auto renew ENS names",
        appUrl: "https://ensautorenew.xyz", // your app's url
        appIcon: "https://ensautorenew.xyz/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
    })
);

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ConnectKitProvider>{children}</ConnectKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};
