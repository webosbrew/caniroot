import {Component, html, render} from 'htm/preact';
import {DeviceExploitAvailabilities, DeviceModel} from "@webosbrew/caniroot";
import debounce from 'lodash-es/debounce';
import {JSXInternal} from "preact/src/jsx";
import TargetedInputEvent = JSXInternal.TargetedInputEvent;
import {RenderableProps} from "preact";

interface AppProps {
    q?: string;
}

interface AppState {
    term?: SearchTerm;
    model?: DeviceModel;
    availability?: DeviceExploitAvailabilities;
}

interface SearchTerm {
    q: string;
    model?: string;
    firmware?: string;
}

function parseSearchTerm(q?: string): SearchTerm | undefined {
    if (!q) return undefined;
    const model = q.match(/[A-Z0-9-]{4,12}(?:\.[A-Z0-9]{2,4})?/i)?.[0]?.toUpperCase();
    const firmware = q.match(/\d{2}\.\d{2}\.\d{2}/)?.[0];
    return {q, model, firmware};
}

interface ExploitMethod {
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
        let model = term && DeviceModel.findModel(term.model ?? '');
        let availability = model && DeviceExploitAvailabilities.byOTAID(model.otaId);
        this.state = {term, model, availability};
    }

    /**
     * Submit input to search for device model and exploit availability
     */
    searchChanged = debounce((q: string) => {
        const term = parseSearchTerm(q);
        let model = term && DeviceModel.findModel(term.model ?? '');
        let availability = model && DeviceExploitAvailabilities.byOTAID(model.otaId);
        this.setState({term, model, availability});
        const url = new URL(location.href);
        if (url.searchParams) {
            url.searchParams.set('q', q);
            history.pushState(null, '', url);
        }
    }, 300);

    osVersionMap: Record<string, string> = {
        'afro': 'webOS 1.x',
        'beehive': 'webOS 2.x',
        'dreadlocks': 'webOS 3.0~3.4',
        'dreadlocks2': 'webOS 3.5~3.9',
        'goldilocks': 'webOS 4.0~4.4',
        'goldilocks2': 'webOS 4.5~4.10',
        'jhericurl': 'webOS 5.x',
        'kisscurl': 'webOS 6.x',
        'mullet': 'webOS 7.x',
        'number1': 'webOS 8.x',
        'ombre': 'webOS 9.x',
    };

    render(_props: RenderableProps<AppProps>, state: Readonly<AppState>) {
        const codename = state.term && state.model?.codename;
        const getMeIn = codename && ['afro', 'beehive', 'dreadlocks', 'dreadlocks2'].includes(codename) || false;
        return html`
          <div class="app">
            <input class="form-control form-control-lg" type="search" value="${state.term?.q ?? ''}"
                   placeholder="Type model & firmware version here..."
                   onInput=${(e: TargetedInputEvent<HTMLInputElement>) => this.searchChanged(e.currentTarget.value)}/>
            ${state.term && (state.model ?
                    html`
                      <div class="alert alert-info mt-3" role="alert">Found <code>${state.model.series}</code>
                        , running <code>${this.osVersionMap[state.model.codename]}</code>
                        , region <code>${state.model.region} (${state.model.broadcast})</code>
                        , machine <code>${state.model.machine}</code>
                        , otaId <code>${state.model.otaId}</code>
                      </div>
                      <hr/>` :
                    html`
                      <div class="alert alert-warning mt-3" role="alert">
                        Unable to find this model number <code>${state.term.model}</code>. Try searching by the series
                        name (e.g. <code>OLEDC3</code> instead of <code>OLEDC3PJA</code>).<br/>
                        <i class="bi bi-exclamation-circle-fill me-2"></i>Root availability may vary across different
                        models/regions of the same series.
                      </div>`
            )}

            ${this.exploits.map(exploit => {
              const avail = state.availability?.[exploit.key];
              const firmware = state.term?.firmware ?? avail?.patched?.version;
              const patched = (avail?.patched && firmware && firmware >= avail.patched.version) || false;
              const mayPatched = !patched && (avail?.latest && firmware && firmware > avail.latest.version) || false;
              const bgClass = patched ? 'bg-danger-subtle' : mayPatched ? 'bg-warning-subtle' : 'bg-success-subtle';
              const iconClass = patched ? 'bi-exclamation-octagon-fill' : mayPatched ?
                  'bi-question-octagon-fill' : 'bi-hand-thumbs-up-fill';
              return avail && html`
                <div class=${`card p-3 mt-3 ${bgClass}`}>
                  <h3>
                    <i class="bi ${iconClass} me-2"/>
                    <a class="stretched-link text-decoration-none" href="${exploit.url}" target="_blank">${exploit.name}</a>
                  </h3>
                  ${avail.latest && html`
                    <div>
                      <i class="bi bi-info-circle-fill me-2"/>Latest known working firmware: <b>${avail.latest?.version}
                    </b>${mayPatched && state.term?.firmware && html` (you have <b>${state.term.firmware}</b>)`}
                    </div>
                  `}
                  ${avail.patched && html`
                    <div><i class="bi bi-bandaid-fill me-2"/>Patched in: <b>${avail.patched?.version}</b>
                      ${state.term?.firmware && html` (you have <b>${state.term.firmware}</b>)`}
                    </div>
                  `}
                  ${exploit.expert && html`
                    <div>
                      <i class="bi bi-exclamation-triangle-fill me-2"/>Requires expert knowledge.
                    </div>
                  `}
                </div>`;
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
}

render(html`
  <${App} q=${new URLSearchParams(location.search).get('q')}/>`, document.getElementById('app-container')!);