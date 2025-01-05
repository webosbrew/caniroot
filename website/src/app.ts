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

interface AppState {
    term?: SearchTerm;
    model?: DeviceModel;
    availableCodenames?: string[];
    selectedCodename?: string;
    similar?: boolean;
    availability?: DeviceExploitAvailabilities;
}

export interface SearchTerm {
    q: string;
    model?: DeviceModelName;
    firmware?: string;
    remaining?: string;
}

function parseSearchTerm(q?: string): SearchTerm | undefined {
    if (!q) return undefined;
    let remaining = q;
    const modelMatch = remaining.match(/[A-Z0-9-]{4,12}(?:\.[A-Z0-9]{2,4})?/i);
    if (modelMatch) {
        remaining = remaining.replace(modelMatch[0], '');
    }
    const modelQ = modelMatch?.[0]?.toUpperCase();
    const model = modelQ ? DeviceModelName.parse(modelQ) : undefined;
    const firmwareMatch = remaining.match(/(0?|[1-9])\d\.\d{2}\.\d{2}/);
    let firmware = undefined;
    if (firmwareMatch) {
        remaining = remaining.replace(firmwareMatch[0], '');
        firmware = firmwareMatch[0].padStart(8, '0');
    }
    return {q, model, firmware, remaining: remaining.trim() || undefined};
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
        const codename = state.term && model?.codename;
        const legacy = model && codename && ['afro', 'beehive', 'dreadlocks', 'dreadlocks2'].includes(codename) || false;
        const unrootable = model && !state.availability && !legacy;
        const invalidQ = state.term && state.term.remaining;
        return html`
          <div class="app">
            <input class="form-control form-control-lg ${invalidQ ? 'is-invalid' : ''}" type="search" autofocus
                   value=${state.term?.q ?? ''} placeholder=${props.sample} autocapitalize="characters"
                   onInput=${(e: Event) => this.searchChanged((e.currentTarget as HTMLInputElement).value)}/>
            <${SearchHint} term=${state.term} model=${model}/>

              ${state.availableCodenames && html`
                <ul class="nav nav-pills nav-fill">
                  ${state.availableCodenames.map(codename => html`
                    <li class="nav-item">
                      <button class="nav-link ${state.selectedCodename === codename ? 'active' : ''} notranslate"
                              type="button" translate="no"
                              onClick=${() => this.searchImmediate(state.term!!.q, codename)}>
                        ${webOSReleaseName(codename)}
                      </button>
                    </li>
                  `)}
                </ul>`}

              ${state.similar && html`
                <div class="alert alert-warning mt-3">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>
                  We found rooting methods for a similar model (<code>${state.availability?.otaId}</code>),
                  but not an exact match (<code>${model?.otaId}</code>). They may have different firmware versions.
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
                    <i class="bi bi-x-circle-fill me-2"></i>Unrootable (yet)
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
        const models = term?.model && DeviceModel.findAll(term.model.name + (term.model.tdd || ''));
        let model = models?.filter(m => m.model.startsWith(term!!.model!!.simple))[0];
        if (!model && models) {
            model = models[0];
        }
        let availableCodenames: string[] | undefined = undefined;
        let selectedCodename: string | undefined;
        if (model) {
            availableCodenames = model.variants?.filter(v => v.codename && v.codename !== model!!.codename)
                .map(v => v.codename!!);
            if (availableCodenames?.length === 0) {
                availableCodenames = undefined;
            }
            if (availableCodenames) {
                availableCodenames.unshift(model.codename);
                selectedCodename = codename || model.codename;
            }
            if (selectedCodename && selectedCodename !== model.codename) {
                model = model.variant((v) => v.codename === selectedCodename)
            }
        }

        const availability = model && DeviceExploitAvailabilities.byOTAID(model.otaId, selectedCodename);
        const similar = model && availability && availability.otaId !== model.otaId;
        return {term, model, availableCodenames, selectedCodename, similar, availability};
    }
}

render(html`
      <${App} q=${new URLSearchParams(location.search).get('q')} sample="OLED65G2PUA 04.40.75"/>`,
    document.getElementById('app-container')!);
