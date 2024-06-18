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

    /**
     * Find exploit availabilities for a specific OTA ID
     * @param otaId OTA ID
     * @param exact If true, only return the exact match. If false, return the closest match.
     */
    public static byOTAID(otaId: string, exact?: boolean): DeviceExploitAvailabilities | undefined;
}

export class DeviceModel {
    readonly broadcast: string;
    readonly machine: string;
    readonly codename: string;
    readonly otaId: string;

    public static modelNameSimplified(model: string): string | undefined;

    /**
     * Find a model by its name
     * @param model Model name like "55OLEDC3PJA"
     * @param exact If true, only return the exact match. If false, return the closest match.
     */
    public static findModel(model: string, exact?: boolean): DeviceModel | undefined;
}