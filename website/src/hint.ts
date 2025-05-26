import {DeviceModel, DeviceModelName} from "../../src/library";
import {SearchTerm} from "./app";
import {html} from "htm/preact";

const osVersionMap: Record<string, string> = {
    'afro': 'webOS 1.x',
    'beehive': 'webOS 2.x',
    'dreadlocks': 'webOS 3.0~3.4',
    'dreadlocks2': 'webOS 3.5~3.9',
    'goldilocks': 'webOS 4.0~4.4',
    'goldilocks2': 'webOS 4.5~4.10',
    'jhericurl': 'webOS 5.x',
    'kisscurl': 'webOS 6.x',
    'mullet': 'webOS 22 (7.x)',
    'number1': 'webOS 23 (8.x)',
    'ombre': 'webOS 24 (9.x)',
    'ponytail': 'webOS 25 (10.x)',
};

export function webOSReleaseName(codename: string) {
    return html`<span>${osVersionMap[codename] ?? codename}</span>`;
}

function ModelCandidate(props: { term: SearchTerm, model: DeviceModel }) {
    const model = DeviceModelName.parse(props.model.model);
    if (!model) {
        return null;
    }
    const newQuery = [model.simple, props.term.firmware ?? '', props.term.remaining ?? '']
        .map(v => v.trim())
        .filter(v => !!v)
        .map(v => encodeURIComponent(v))
        .join('+');
    return html`<a href="?q=${newQuery}">${model.simple}</a>`
}

function ModelCandidates(props: { term: SearchTerm, candidates: DeviceModel[] }) {
    const {term, candidates} = props;
    if (!candidates?.length) {
        return;
    }
    return html`You may want to check these similar models: ${candidates?.slice(0, 3)?.map((model, index) => html`${index > 0 ? ', ' : ''}
    <${ModelCandidate} term=${term} model=${model}/>`)}
    <br/>`;
}

export function SearchHint(props: { term?: SearchTerm, model?: DeviceModel, candidates?: DeviceModel[] }) {
    const {term, model, candidates} = props;
    if (!term) {
        return html`
          <div class="alert alert-primary mt-3">
            <i class="bi bi-lightbulb-fill me-2"/>Search for your device model and firmware version (optional)
            to check available rooting methods.
          </div>`;
    }
    if (term.otaId) {
        return;
    }
    if (!term.model) {
        return html`
          <div class="alert alert-warning mt-3" role="alert">
            <i class="bi bi-info-circle-fill me-2"/>Unrecognized model name. Is this a valid model number of
            a <b>webOS powered smart TV</b>?
          </div>
        `;
    }
    if (term.remaining) {
        return html`
          <div class="alert alert-warning mt-3" role="alert">
            <i class="bi bi-info-circle-fill me-2"/>Please make sure the firmware version is correct.<br/>
            It should be in the format of <code>00.00.00</code>.
          </div>
        `;
    }
    if (model) {
        return html`
          <div class="alert alert-info mt-3" role="alert">
            <i class="bi bi-search me-2"/>Found <code>${model.model}</code> <code translate="no">(
            <code>${webOSReleaseName(model.codename)}</code>
            , machine: ${model.machine}
            , otaId: ${model.otaId}
            )</code>
          </div>
          <hr/>`;
    } else {
        return html`
          <div class="alert alert-warning mt-3" role="alert">
            Unable to find this model number.
            <br/>
            ${['QNED', 'NANO'].includes(term.model.class) ?
                html`For QNED and NANO series, please input the complete model number (e.g. <code>
                  NANO916NA</code> instead of <code>NANO91</code>).
                <br/>` :
                html`
                  <${ModelCandidates} term=${term} candidates=${candidates}/>`
            }
            <i class="bi bi-exclamation-circle-fill me-2"/>Root availability may vary across different
            models/regions of the same series.
          </div>`;
    }
}
