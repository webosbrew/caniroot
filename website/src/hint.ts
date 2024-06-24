import {DeviceModel} from "../../src/library";
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
    'mullet': 'webOS 7.x',
    'number1': 'webOS 8.x',
    'ombre': 'webOS 9.x',
};

export function webOSReleaseName(codename: string) {
    return html`<span>${osVersionMap[codename] ?? codename}</span>`;
}

export function SearchHint(props: { term?: SearchTerm, model?: DeviceModel }) {
    const {term, model} = props;
    if (!term) {
        return html`
          <div class="alert alert-primary mt-3">
            <i class="bi bi-lightbulb-fill me-2"/>Search for your device model and firmware version (optional)
            to check available rooting methods.
          </div>`
    }
    if (!term.model) {
        return html`
          <div class="alert alert-warning mt-3" role="alert">
            <i class="bi bi-info-circle-fill me-2"/>Unrecognized model name. Is this a valid model number of
            a <b>webOS powered smart TV</b>?
          </div>
        `
    }
    if (model) {
        return html`
          <div class="alert alert-info mt-3" role="alert">
            <i class="bi bi-search me-2"/>Found <code>${model.model}</code>
            , running <code>${webOSReleaseName(model.codename)}</code>
            , machine <code>${model.machine}</code>
            , otaId <code>${model.otaId}</code>
          </div>
          <hr/>`
    } else {
        return html`
          <div class="alert alert-warning mt-3" role="alert">
            Unable to find this model number <code>${term.model}</code>. Try searching by the series
            name (e.g. <code>OLEDC3</code> instead of <code>OLEDC3PJA</code>).<br/>
            <i class="bi bi-exclamation-circle-fill me-2"/>Root availability may vary across different
            models/regions of the same series.
          </div>`
    }
}