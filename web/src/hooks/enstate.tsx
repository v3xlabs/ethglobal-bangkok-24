import { queryOptions } from "@tanstack/react-query";

// {
//     "name": "helgesson.eth",
//     "address": "0xd577D1322cB22eB6EAC1a008F62b18807921EFBc",
//     "avatar": "https://ipfs.euc.li/ipfs/bafkreigiqg7bxushl3ogmdavtuk5jsh3g4xbyskn3blqu4kaw2wj4odgp4",
//     "display": "helgesson.eth",
//     "records": {
//     "avatar": "ipfs://bafkreigiqg7bxushl3ogmdavtuk5jsh3g4xbyskn3blqu4kaw2wj4odgp4",
//     "com.discord": "Svemat#5531",
//     "com.github": "svemat01",
//     "com.twitter": "Helgesson_",
//     "email": "jakob@helgesson.dev",
//     "org.telegram": "helgesson",
//     "url": "https://jakobhelgesson.com"
//     },
//     "chains": {
//     "eth": "0xd577D1322cB22eB6EAC1a008F62b18807921EFBc"
//     },
//     "fresh": 1731744359845,
//     "resolver": "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
//     "errors": {}
//     }
type EnstateResponse = {
    name: string;
    address: string;
    avatar?: string;
    errors?: Record<string, string>;
};

const lookupEnsName = async (name: string): Promise<EnstateResponse> => {
    if (!name || !name.includes(".") || name.endsWith(".")) {
        throw new Error("Invalid ENS name");
    }

    const res = await fetch(`https://sepolia.enstate.rs/n/${name}`);

    if (!res.ok) {
        throw new Error("Failed to lookup ENS name");
    }

    return res.json() as Promise<EnstateResponse>;
};

export const lookupEnsNameQueryOptions = (name: string) =>
    queryOptions({
        queryKey: ["enstate", "name", name],
        queryFn: () => lookupEnsName(name),
    });
