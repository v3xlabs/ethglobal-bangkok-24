import { Card, Heading } from "@ensdomains/thorin";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
    component: Index,
});

function Index() {
    return (
        <div className="space-y-4">
            <Heading>ENS Auto Renewal</Heading>
            <hr />
            <Card title="Welcome to ENS Auto Renewal">
                This is a simple app to help you renew your ENS names.
            </Card>
            <Card title="Your Pools">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>Pool {i}</div>
                ))}
            </Card>
        </div>
    );
}
