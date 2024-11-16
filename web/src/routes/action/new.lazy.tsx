import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import {
    Button,
    Card,
    Helper,
    Input,
    PlusSVG,
    TrashSVG,
} from "@ensdomains/thorin";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lookupEnsNameQueryOptions } from "../../hooks/enstate";
import { signMessage } from "wagmi/actions";
import { useAccount, useConfig } from "wagmi";
import { Header } from "../../components/Header";
import { Action } from "../../types";

export const Route = createLazyFileRoute("/action/new")({
    component: RouteComponent,
});

function RouteComponent() {
    const { address } = useAccount();
    const navigate = useNavigate();
    const config = useConfig();
    const queryClient = useQueryClient();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mutate } = useMutation({
        mutationKey: ["create-action"],
        mutationFn: async (data: { names: string[]; reward: number }) => {
            // TODO: Implement correct message here
            const message = JSON.stringify(data);
            const signature = await signMessage(config, {
                message,
            });

            const response = await fetch("https://API/verify", {
                method: "POST",
                body: JSON.stringify({
                    msg: data,
                    sig: signature,
                    signer: address,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to verify signature");
            }

            return response.json();
        },
    });

    const form = useForm({
        defaultValues: {
            names: [] as Array<string>,
            reward: 0,
        },
        onSubmit({ value }) {
            if (!address) return;
            // TODO: run create action mutation and sign message
            // Temporary adding to local storage
            const actions = localStorage.getItem("actions") ?? "[]";
            localStorage.setItem(
                "actions",
                JSON.stringify([
                    ...JSON.parse(actions),
                    {
                        ...value,
                        owner: address,
                        type: "RENEW_NAME",
                    } satisfies Action,
                ])
            );

            navigate({ to: "/" });
        },
    });

    return (
        <div className="space-y-4">
            <Header />
            <hr />
            <Card title="Create new action">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                    className="space-y-4"
                >
                    <form.Field
                        name="names"
                        mode="array"
                        validators={{
                            onChange: ({ value }) => {
                                if (value.length === 0)
                                    return "At least one name is required";
                                return undefined;
                            },
                        }}
                    >
                        {(field) => {
                            return (
                                <div className="space-y-4">
                                    {field.state.value.map((_, i) => {
                                        return (
                                            <form.Field
                                                key={i}
                                                name={`names[${i}]`}
                                                validators={{
                                                    onChange: ({ value }) => {
                                                        if (!value)
                                                            return "Name is required";
                                                        // check if valid domain name
                                                        if (
                                                            !value.includes(".")
                                                        )
                                                            return "Invalid domain name";
                                                        return undefined;
                                                    },
                                                    onChangeAsync: async ({
                                                        value,
                                                    }) => {
                                                        const result =
                                                            await queryClient
                                                                .fetchQuery(
                                                                    lookupEnsNameQueryOptions(
                                                                        value
                                                                    )
                                                                )
                                                                .catch(
                                                                    () => {}
                                                                );

                                                        if (!result) {
                                                            return "ENS name couldn't be resolved";
                                                        }
                                                    },
                                                    onChangeAsyncDebounceMs: 500,
                                                }}
                                            >
                                                {(subField) => {
                                                    return (
                                                        <div className="flex gap-2 items-center">
                                                            <Input
                                                                label={`Name ${i + 1}`}
                                                                value={
                                                                    subField
                                                                        .state
                                                                        .value
                                                                }
                                                                onChange={(e) =>
                                                                    subField.handleChange(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                width={
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    "100%" as any
                                                                }
                                                                actionIcon={
                                                                    <div>
                                                                        <TrashSVG className="text-thorin-red" />
                                                                    </div>
                                                                }
                                                                alwaysShowAction={
                                                                    true
                                                                }
                                                                onClickAction={() =>
                                                                    field.removeValue(
                                                                        i
                                                                    )
                                                                }
                                                                error={
                                                                    subField
                                                                        .state
                                                                        .meta
                                                                        .errors
                                                                        .length >
                                                                    0
                                                                        ? subField.state.meta.errors.join(
                                                                              ", "
                                                                          )
                                                                        : null
                                                                }
                                                            />
                                                        </div>
                                                    );
                                                }}
                                            </form.Field>
                                        );
                                    })}
                                    {field.state.value.length === 0 && (
                                        <>
                                            <Helper alert="error">
                                                No names added
                                            </Helper>
                                        </>
                                    )}
                                    <Button
                                        // className="w-fit"
                                        className="w-fit aspect-square text-thorin-background p-4 ml-auto"
                                        onClick={() => field.pushValue("")}
                                    >
                                        <PlusSVG className="size-full" />
                                    </Button>
                                </div>
                            );
                        }}
                    </form.Field>
                    <hr />
                    <form.Field
                        name="reward"
                        validators={{
                            onChange: ({ value }) => {
                                console.log(value);
                                if (!value) return "Reward is required";
                                if (isNaN(Number(value)))
                                    return "Must be a number";
                                if (Number(value) <= 0)
                                    return "Must be greater than 0";
                                return undefined;
                            },
                        }}
                    >
                        {(field) => (
                            <div className="space-y-2">
                                <Input
                                    label="Reward (GWEI)"
                                    placeholder="100"
                                    // @ts-expect-error Number
                                    type="number"
                                    min="0"
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(
                                            Number(e.target.value)
                                        )
                                    }
                                    error={
                                        field.state.meta.errors.length > 0
                                            ? field.state.meta.errors[0]
                                            : undefined
                                    }
                                />
                                <Helper>
                                    The reward paid to executors for renewing
                                    your names (in GWEI)
                                </Helper>
                            </div>
                        )}
                    </form.Field>
                    <form.Subscribe
                        selector={(state) => [
                            state.canSubmit,
                            state.isSubmitting,
                        ]}
                        children={([canSubmit, isSubmitting]) => (
                            <Button type="submit" disabled={!canSubmit}>
                                {isSubmitting ? "..." : "Submit"}
                            </Button>
                        )}
                    />
                </form>
            </Card>
        </div>
    );
}
