export type Action = {
    // List of ENS names
    /** messages */
    names: string[];
    /** prefix */
    type: "RENEW_NAME";
    /** GWEI */
    reward: number;
    owner: string;
};
