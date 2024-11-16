import { Button, Card, Helper, Typography } from "@ensdomains/thorin";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Header } from "../components/Header";

export const Route = createLazyFileRoute("/")({
    component: Index,
});

function Index() {
    return (
        <div className="space-y-8">
            <Header />

            <div className="text-center space-y-4">
                <Typography fontVariant="extraLarge" weight="bold">
                    Automate Your ENS Name Management
                </Typography>
                <Typography>
                    Set up automated renewals and custom actions for your ENS
                    names with advanced execution conditions
                </Typography>
                <Button
                    as="a"
                    href="/action/new"
                    className="w-full max-w-sm mx-auto"
                >
                    Get Started
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <Typography weight="bold">Automated Renewals</Typography>
                    <Typography>
                        Never let your ENS names expire. Set up automatic
                        renewals based on expiration dates.
                    </Typography>
                </Card>

                <Card>
                    <Typography weight="bold">Private Mempool</Typography>
                    <Typography>
                        Submit action intents privately to our secure mempool
                        for maximum protection.
                    </Typography>
                </Card>

                <Card>
                    <Typography weight="bold">Custom Conditions</Typography>
                    <Typography>
                        Define precise execution conditions like expiry dates,
                        gas limits, and more.
                    </Typography>
                </Card>
            </div>

            <Card className="text-center">
                <Typography fontVariant="large" weight="bold">
                    Ready to automate your ENS management?
                </Typography>
                <Helper>
                    Create your first automated action now and let us handle the
                    rest
                </Helper>
                <Button as="a" href="/action/new">
                    Create Action
                </Button>
            </Card>
        </div>
    );
}
