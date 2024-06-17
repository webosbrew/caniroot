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

    public static byOTAID(otaId: string): DeviceExploitAvailabilities | undefined;
}

export class DeviceModel {
    readonly broadcast: string;
    readonly machine: string;
    readonly codename: string;
    readonly otaId: string;

    public static modelNameSimplified(model: string): string | undefined;

    public static findModel(model: string): DeviceModel | undefined;
}