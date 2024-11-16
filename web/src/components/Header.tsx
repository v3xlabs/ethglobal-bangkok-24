import { Heading } from "@ensdomains/thorin";
import { Link } from "@tanstack/react-router";

export const Header = () => {
    return (
        <header className="flex flex-col justify-between items-start">
            <Heading>ENS Auto Renewal</Heading>
            <div className="flex gap-4">
                <Link to="/">Home</Link>
                <Link to="/list">View all actions</Link>
                <Link to="/action/new">Create new action</Link>
            </div>
        </header>
    );
};
