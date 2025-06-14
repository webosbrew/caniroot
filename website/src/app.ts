import {Component, html, render} from 'htm/preact';
import {DeviceExploitAvailabilities, DeviceExploitType, DeviceModel, DeviceModelName} from "@webosbrew/caniroot";
import debounce from 'lodash-es/debounce';
import {RenderableProps} from "preact";
import {ExploitCard} from "./exploit";
import {SearchHint, webOSReleaseName} from "./hint";

interface AppProps {
    q?: string;
    sample?: string;
}

interface CodeNameEntry {
    value: string;
    min?: string;
    disabled?: boolean;
}

interface AppState {
    term?: SearchTerm;
    model?: { base: DeviceModel, current: DeviceModel };
    candidates?: DeviceModel[];
    availableCodenames?: CodeNameEntry[];
    selectedCodename?: string;
    similar?: boolean;
    availability?: DeviceExploitAvailabilities;
}

export interface SearchTerm {
    q: string;
    model?: DeviceModelName;
    firmware?: string;
    otaId?: string;
    remaining?: string;
}

function parseSearchTerm(q?: string): SearchTerm | undefined {
    if (!q) return undefined;
    let remaining = q.split(/\s+/);
    const modelMatch = remaining.map((s): [string, DeviceModelName] | undefined => {
        const model = DeviceModelName.parse(s.toUpperCase());
        return model && [s, model];
    }).filter(r => r)?.[0] ?? [undefined, undefined];
    if (modelMatch) {
        remaining = remaining.filter(s => s !== modelMatch[0]);
    }
    const model = modelMatch?.[1];
    const firmwareMatch = remaining.map(s => s.match(/^(0?|[1-9])\d\.\d{2}\.\d{2}$/))?.[0];
    let firmware = undefined;
    if (firmwareMatch) {
        remaining = remaining.filter(s => s !== firmwareMatch[0]);
        firmware = firmwareMatch[0].padStart(8, '0');
    }
    const otaIdMatch = remaining.map(s => s.match(/^HE_[A-Z]{3}_[A-Z1-9]{4}_[A-Z]{8}$/))?.[0];
    let otaId = undefined;
    if (otaIdMatch) {
        remaining = remaining.filter(s => s !== otaIdMatch[0]);
        otaId = otaIdMatch[0];
    }
    return {q, model, firmware, otaId, remaining: remaining.join(' ') || undefined};
}

export declare interface ExploitMethod {
    name: string;
    key: DeviceExploitType;
    url: string;
    expert?: boolean;
}

class App extends Component<AppProps, AppState> {

    readonly exploits: ExploitMethod[] = [
        {
            name: 'faultmanager',
            key: DeviceExploitType.FaultManager,
            url: 'https://github.com/throwaway96/faultmanager-autoroot'
        },
        {
            name: 'DejaVuln',
            key: DeviceExploitType.DejaVuln,
            url: 'https://github.com/throwaway96/dejavuln-autoroot'
        },
        {
            name: 'ASM',
            key: DeviceExploitType.ASM,
            url: 'https://github.com/illixion/root-my-webos-tv'
        },
        {
            name: 'crashd',
            key: DeviceExploitType.crashd,
            url: 'https://gist.github.com/throwaway96/e811b0f7cc2a705a5a476a8dfa45e09f'
        },
        {
            name: 'WTA',
            key: DeviceExploitType.WTA,
            url: 'https://gist.github.com/throwaway96/b171240ef59d7f5fd6fb48fc6dfd2941'
        },
        {
            name: 'MVPD',
            key: DeviceExploitType.MVPD,
            url: 'https://github.com/throwaway96/mvpd-autoroot/'
        },
        {
            name: 'RootMy.TV',
            key: DeviceExploitType.RootMyTV,
            url: 'https://rootmy.tv/'
        },
    ];

    constructor(props: AppProps) {
        super(props);
        this.state = this.createState(props.q);
    }

    /**
     * Submit input to search for device model and exploit availability
     */
    searchChanged = debounce((q: string) => {
        this.searchImmediate(q);
        const url = new URL(location.href);
        if (url.searchParams && url.searchParams?.get('q') !== q) {
            if (q) {
                url.searchParams.set('q', q);
            } else {
                url.searchParams.delete('q');
            }
            history.pushState(null, '', url);
        }
    }, 300);

    locationChanged = (): void => {
        const url = new URL(location.href);
        this.searchImmediate(url.searchParams.get('q') ?? '');
    };

    componentDidMount(): void {
        addEventListener('popstate', this.locationChanged);
    }

    componentWillUnmount(): void {
        removeEventListener('popstate', this.locationChanged);
    }

    render(props: RenderableProps<AppProps>, state: Readonly<AppState>) {
        const model = state.model;
        const codename = state.term && model?.current.codename;
        const legacy = model && codename && ['afro', 'beehive', 'dreadlocks', 'dreadlocks2'].includes(codename) || false;
        const unrootable = model && !state.availability && !legacy;
        const invalidQ = state.term && state.term.remaining;
        return html`
          <div class="app">
            <input class="form-control form-control-lg ${invalidQ ? 'is-invalid' : ''}" type="search" autofocus
                   value=${state.term?.q ?? ''} placeholder=${props.sample} autocapitalize="characters"
                   onInput=${(e: Event) => this.searchChanged((e.currentTarget as HTMLInputElement).value)}/>
            <${SearchHint} term=${state.term} model=${model?.base} candidates=${state.candidates}/>

              ${state.availableCodenames && html`
                <div class="alert alert-info mt-3">
                  <i class="bi bi-info-circle me-2"/> This model can be upgraded to newer webOS versions. Please select
                  the version you are using.
                </div>
                <ul class="nav nav-pills nav-fill">
                  ${state.availableCodenames.map(codename => html`
                    <li class="nav-item">
                      <button class="nav-link ${state.selectedCodename === codename.value ? 'active' : ''} notranslate"
                              type="button" translate="no" disabled=${codename.disabled}
                              onClick=${() => !codename.disabled && this.searchImmediate(state.term!!.q, codename.value)}>
                        ${webOSReleaseName(codename.value)}
                      </button>
                    </li>
                  `)}
                </ul>`}

              ${state.similar && html`
                <div class="alert alert-warning mt-3">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>
                  We found rooting methods for a similar model (<code>${state.availability?.otaId}</code>),
                  but not an exact match (<code>${model?.base.otaId}</code>). They may have different firmware versions.
                </div>
              `}

              ${this.exploits.map(exploit => {
                const avail = state.availability?.[exploit.key];
                return avail && html`
                  <${ExploitCard} exploit=${exploit} avail=${avail} codename=${codename}
                                  firmware=${state.term?.firmware}/>`;
              })}

              ${unrootable && html`
                <div class="card p-3 mt-3 bg-secondary-subtle">
                  <h3>
                    <i class="bi bi-x-circle-fill me-2"></i>Unrootable or unknown (yet)
                  </h3>
                  <div>
                    No known rooting methods are available for this model. <br/>
                    <a href="https://discord.gg/xWqRVEm">Contact us</a> to help us find a way to root!
                  </div>
                </div>
              `}

              ${legacy && html`
                <div class="card p-3 mt-3 bg-secondary-subtle">
                  <h3>
                    <i class="bi bi-question-octagon-fill me-2"></i>
                    <a class="stretched-link text-decoration-none" href="https://www.webosbrew.org/rooting/getmenow"
                       target="_blank">GetMeNow</a>
                  </h3>
                  <div>
                    GetMeNow method may work on some models running webOS 1~3.<br/>
                    <i class="bi bi-exclamation-triangle-fill me-2"/>Latest Dev Mode updates may have patched this
                    method.
                    <br/>
                  </div>
                </div>

                <div class="card p-3 mt-3 bg-info-subtle">
                  <h3>
                    <i class="bi bi-tools me-2"></i>
                    <a class="stretched-link text-decoration-none"
                       href="https://gist.github.com/throwaway96/827ff726981cc2cbc46a22a2ad7337a1" target="_blank">
                      NVM (hardware method)</a>
                  </h3>
                  <div>
                    Alternatively, you can modify contents on NVRAM chip in the TV to enable root access. <br/>
                    <i class="bi bi-exclamation-triangle-fill me-2"/>This method requires expert knowledge.
                  </div>
                </div>
              `
              }
          </div>
        `;
    }

    private searchImmediate(q: string, codename?: string): void {
        this.setState(this.createState(q, codename));
    }

    private createState(q?: string, codename?: string): AppState {
        const term = parseSearchTerm(q);
        if (!term) {
            return {};
        }
        const models = term.model && DeviceModel.findAll(term.model.name + (term.model.tdd || ''));
        let model = models?.filter(m => m.model.startsWith(term.model!!.simple))[0];
        if (!model && models) {
            model = models[0];
        }
        let base = model;
        let availableCodenames: CodeNameEntry[] | undefined = undefined;
        let selectedCodename: string | undefined;
        let candidates: DeviceModel[] | undefined = undefined;
        let availability: DeviceExploitAvailabilities | undefined = undefined;
        if (term.otaId) {
            availability = DeviceExploitAvailabilities.byOTAID(term.otaId, codename);
            availableCodenames = DeviceExploitAvailabilities.codenamesByOTAID(term.otaId).map(value => ({value}));
            selectedCodename = codename || availableCodenames[0]?.value;
        } else if (model) {
            availableCodenames = model.variants
                ?.filter(v => v.codename && v.codename !== model!!.codename)
                ?.map(v => ({value: v.codename!!, min: v.swMajor}));
            if (availableCodenames?.length === 0) {
                availableCodenames = undefined;
            }
            if (availableCodenames) {
                // Add base model to the list
                availableCodenames.unshift({value: model.codename});

                function matchedCodename(): string | undefined {
                    if (!term?.firmware) {
                        return undefined;
                    }
                    let value = undefined;
                    for (let i = availableCodenames!!.length - 1; i >= 0; i--) {
                        const entry = availableCodenames!![i];
                        if (!value && entry.min && term.firmware >= entry.min) {
                            value = entry.value;
                        } else {
                            entry.disabled = true;
                        }
                    }
                    return value;
                }

                selectedCodename = codename || matchedCodename() || model.codename;
            }
            if (selectedCodename && selectedCodename !== model.codename) {
                model = model.variant((v) => v.codename === selectedCodename)
            }
            availability = model && DeviceExploitAvailabilities.byOTAID(model.otaId, selectedCodename);
        } else {
            const series = term?.model?.series;
            candidates = series ? DeviceModel.findAll(series).filter(v => v.series === series) : undefined;
        }

        const similar = model && availability && availability.otaId !== model.otaId;
        return {
            term,
            model: base && {base, current: model!!},
            candidates,
            availableCodenames,
            selectedCodename,
            similar,
            availability
        };
    }
}

render(html`
      <${App} q=${new URLSearchParams(location.search).get('q')} sample="OLED65G2PUA 04.40.75"/>`,
    document.getElementById('app-container')!);
