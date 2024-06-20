export declare interface FirmwareVersion {
    version: string;
    release: string;
    codename: string;
}

export declare interface ExploitAvailability {
    latest?: FirmwareVersion;
    patched?: FirmwareVersion;
}

export class DeviceExploitAvailabilities {
    readonly nvm?: ExploitAvailability;
    readonly rootmytv?: ExploitAvailability;
    readonly crashd?: ExploitAvailability;
    readonly wta?: ExploitAvailability;
    readonly dejavuln?: ExploitAvailability;

    private constructor();

    /**
     * Find exploit availabilities for a specific OTA ID
     * @param otaId OTA ID
     * @param exact If true, only return the exact match. If false, return the closest match.
     */
    public static byOTAID(otaId: string, exact?: boolean): DeviceExploitAvailabilities | undefined;
}

export class DeviceModelName {
    /**
     * Model series (e.g. "OLEDC3")
     */
    readonly series: string;
    /**
     * Model size in inches (e.g. 55)
     */
    readonly size?: number;
    /**
     * Technical features, tuner type and design (e.g. "PJA")
     */
    readonly tdd?: string;
    /**
     * Extra model suffix (e.g. ".AJL")
     */
    readonly suffix?: string;

    private constructor();

    /**
     * Parse a model name into its components
     * @param model Model name like "55OLEDC3PJA"
     * @returns Parsed model name or undefined if the model is not recognized
     */
    public static parse(model: string): DeviceModelName | undefined;
}

export class DeviceModel {
    readonly series: string;
    readonly region: string;
    readonly broadcast: string;
    readonly machine: string;
    readonly codename: string;
    readonly otaId: string;

    private constructor();

    /**
     * Find a model by its name
     * @param model Model name like "55OLEDC3PJA"
     * @param exact If true, only return the exact match. If false, return the closest match.
     */
    public static find(model: string, exact?: boolean): DeviceModel | undefined;

    /**
     * Map of all known models
     */
    public static get all(): Readonly<Record<string, Readonly<DeviceModel>>>;
}