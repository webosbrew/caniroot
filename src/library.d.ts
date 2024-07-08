export declare interface FirmwareVersion {
    version: string;
    release: string;
    codename: string;
}

export declare interface ExploitAvailability {
    latest?: FirmwareVersion;
    patched?: FirmwareVersion;
}

export enum DeviceExploitType {
    NVM = 'nvm',
    RootMyTV = 'rootmytv',
    crashd = 'crashd',
    WTA = 'wta',
    ASM = 'asm',
    DejaVuln = 'dejavuln',
}

export type DeviceExploitAvailabilitiesData = {
    [key in DeviceExploitType]?: ExploitAvailability | undefined;
}

export class DeviceExploitAvailabilities implements DeviceExploitAvailabilitiesData {
    readonly otaId: string;

    readonly nvm?: ExploitAvailability;
    readonly rootmytv?: ExploitAvailability;
    readonly crashd?: ExploitAvailability;
    readonly wta?: ExploitAvailability;
    readonly asm?: ExploitAvailability;
    readonly dejavuln?: ExploitAvailability;

    private constructor();

    /**
     * Find exploit availabilities for a specific OTA ID
     * @param otaId OTA ID
     * @param exact If true, only return the exact match. If false, return the closest match.
     */
    public static byOTAID(otaId: string, exact?: boolean): DeviceExploitAvailabilities | undefined;
}

export declare interface DeviceModelNameData {
    name: string;
    series: string;
    size?: number;
    tdd?: string;
    suffix?: string;
}

export class DeviceModelName {
    /**
     * Model name (e.g. "SM8100")
     */
    readonly name: string;
    /**
     * Model class (e.g. "OLED")
     */
    readonly class: string;
    /**
     * Model series (e.g. "SM81")
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

    get simple(): string;

    /**
     * Parse a model name into its components
     * @param model Model name like "55SM8100PJA"
     * @returns Parsed model name or undefined if the model is not recognized
     */
    public static parse(model: string): DeviceModelName | undefined;
}

export interface DeviceModelData {
    series: string;
    region: string;
    broadcast: string;
    machine: string;
    codename: string;
    otaId: string;
    suffix?: string;
    variants?: DeviceModelVariantData[];
}

export type DeviceModelVariantData = Partial<Omit<DeviceModelData, 'variants'>>;

export class DeviceModel implements DeviceModelData {
    readonly model: string;
    readonly series: string;
    readonly region: string;
    readonly broadcast: string;
    readonly machine: string;
    readonly codename: string;
    readonly otaId: string;
    readonly suffix?: string;
    readonly variants?: DeviceModelVariantData[];

    private constructor();

    public variant(predicate: (variant: Readonly<DeviceModelVariantData>) => boolean): DeviceModel | undefined;

    /**
     * Find a model by its name
     * @param model Model name like "55OLEDC3PJA"
     * @param exact If true, only return the exact match. If false, return the closest match.
     * @returns Matching model or undefined if not found
     */
    public static find(model: string, exact?: boolean): DeviceModel | undefined;

    /**
     * Find matching models by their name
     * @param model Model name like "55OLEDC3PJA", or "OLEDC3"
     * @returns List of matching models
     */
    public static findAll(model: string): DeviceModel[];

    /**
     * Map of all known models
     */
    public static get all(): Readonly<Record<string, Readonly<DeviceModelData>>>;
}