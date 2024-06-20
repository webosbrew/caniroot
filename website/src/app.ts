import {Component, html, render} from 'htm/preact';
import {DeviceExploitAvailabilities, DeviceModel, DeviceModelName} from "@webosbrew/caniroot";
import debounce from 'lodash-es/debounce';
import {RenderableProps} from "preact";
import {ExploitCard} from "./exploit";
import {SearchHint} from "./hint";

interface AppProps {
    q?: string;
    sample?: string;
}

interface AppState {
    term?: SearchTerm;
    model?: DeviceModel;
    availability?: DeviceExploitAvailabilities;
}

export interface SearchTerm {
    q: string;
    model?: DeviceModelName;
    firmware?: string;
}

function parseSearchTerm(q?: string): SearchTerm | undefined {
    if (!q) return undefined;
    const modelQ = q.match(/[A-Z0-9-]{4,12}(?:\.[A-Z0-9]{2,4})?/i)?.[0]?.toUpperCase();
    const model = modelQ ? DeviceModelName.parse(modelQ) : undefined;
    const firmware = q.match(/\d{2}\.\d{2}\.\d{2}/)?.[0];
    return {q, model, firmware};
}

export declare interface ExploitMethod {
    name: string;
    key: keyof DeviceExploitAvailabilities;
    url: string;
    expert?: boolean;
}

class App extends Component<AppProps, AppState> {

    readonly exploits: ExploitMethod[] = [
        {name: 'DejaVuln', key: 'dejavuln', url: 'https://github.com/throwaway96/dejavuln-autoroot'},
        {name: 'crashd', key: 'crashd', url: 'https://gist.github.com/throwaway96/e811b0f7cc2a705a5a476a8dfa45e09f'},
        {name: 'WTA', key: 'wta', url: 'https://gist.github.com/throwaway96/b171240ef59d7f5fd6fb48fc6dfd2941'},
        {name: 'RootMy.TV', key: 'rootmytv', url: 'https://rootmy.tv/'},
    ];

    constructor(props: AppProps) {
        super(props);
        const term = parseSearchTerm(props.q);
        let model = term?.model && DeviceModel.find(term.model.series + (term.model.tdd || ''));
        let availability = model && DeviceExploitAvailabilities.byOTAID(model.otaId);
        this.state = {term, model, availability};
    }

    /**
     * Submit input to search for device model and exploit availability
     */
    searchChanged = debounce((q: string) => {
        this.searchImmediate(q);
        const url = new URL(location.href);
        if (url.searchParams && url.searchParams?.get('q') !== q) {
            url.searchParams.set('q', q);
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
        const codename = state.term && state.model?.codename;
        const getMeIn = codename && ['afro', 'beehive', 'dreadlocks', 'dreadlocks2'].includes(codename) || false;
        return html`
          <div class="app">
            <input class="form-control form-control-lg" type="search" value=${state.term?.q ?? ''} autofocus
                   placeholder=${props.sample}
                   onInput=${(e: Event) => this.searchChanged((e.currentTarget as HTMLInputElement).value)}/>
            ${SearchHint(state.term, state.model)}


            ${this.exploits.map(exploit => {
              const avail = state.availability?.[exploit.key];
              return avail && ExploitCard({exploit, avail, firmware: state.term?.firmware});
            })}

            ${getMeIn && html`
              <div class="card p-3 mt-3 bg-secondary-subtle">
                <h3>
                  <i class="bi bi-question-octagon-fill me-2"></i>
                  <a class="stretched-link text-decoration-none" href="https://www.webosbrew.org/rooting/getmenow"
                     target="_blank">GetMeNow</a>
                </h3>
                <div>
                  GetMeNow method may work on some models running webOS 1~3.<br/>
                  <i class="bi bi-exclamation-triangle-fill me-2"/>Latest Dev Mode updates may have patched this method.
                  <br/>

                </div>
              </div>
            `}

            ${state.availability?.nvm && html`
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

    private searchImmediate(q: string): void {
        const term = parseSearchTerm(q);
        let model = term?.model && DeviceModel.find(term.model.series + (term.model.tdd || ''));
        let availability = model && DeviceExploitAvailabilities.byOTAID(model.otaId);
        this.setState({term, model, availability});
    }
}

render(html`
      <${App} q=${new URLSearchParams(location.search).get('q')} sample="OLED65G2PUA 04.40.75"/>`,
    document.getElementById('app-container')!);