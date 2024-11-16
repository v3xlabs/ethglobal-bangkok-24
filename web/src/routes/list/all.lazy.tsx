import { Button, Card, Helper, Tag, Typography } from "@ensdomains/thorin";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { Header } from "../../components/Header";
import { Action } from "../../types";

export const Route = createLazyFileRoute("/list/all")({
    component: Index,
});

/**
 * list of all actions
 * list of all actions by owner
 *
 * create new action | SIG_REQ
 * delete action | SIG_REQ
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getAllActions = async (owner: string): Promise<Action[]> => {
    // Temporary storage of actions in local storage
    const stored = localStorage.getItem("actions");
    if (!stored) {
        return [];
    }

    try {
        return JSON.parse(stored) as Action[];
    } catch {
        return [];
    }
};

const ActionRow = ({ action }: { action: Action }) => {
    return (
        <li className="gap-2">
            <Tag display="block">
                {match(action.type)
                    .with("RENEW_NAME", () => "Renew Name")
                    .otherwise(() => "Unknown")}
            </Tag>

            <div className="flex gap-2 ml-1 flex-wrap">
                <Typography fontVariant="body">
                    {action.names.join(", ")}
                </Typography>
                <Typography fontVariant="small" className="ml-auto">
                    {action.reward} GWEI
                </Typography>
            </div>
        </li>
    );
};

function Index() {
    const { data: actions } = useQuery({
        queryKey: ["actions", "all"],
        queryFn: () => getAllActions("0x0"),
    });

    return (
        <div className="space-y-4">
            <Header />
            <Typography>
                Add your ENS names to the list below to automatically renew them
                when needed.
            </Typography>
            <hr />
            <Card title="All Actions">
                <ul>
                    {actions?.map((action) => (
                        <ActionRow key={action.type} action={action} />
                    ))}
                </ul>
                {actions?.length === 0 && <Helper>No actions found</Helper>}
                <Button as={"a"} href="/action/new">
                    Create New Action
                </Button>
            </Card>
        </div>
    );
}
