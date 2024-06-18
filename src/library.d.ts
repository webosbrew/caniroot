export declare interface FirmwareVersion {
    version: string;
    release: string;
    codename: string;
}

export declare interface ExploitAvailability {
    latest: FirmwareVersion;
    patched: FirmwareVersion | undefined;
}

export class DeviceExploitAvailabilities {
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

    public static findModel(model: string): DeviceModel | undefined;
}