# Automatic model fallbacks

`gen-models.js` tries a fallback for a listed family with no EPK or OTA ID.
The database export must include unlinked model rows with null firmware fields.
Direct firmware mappings and reviewed export fallbacks take precedence.

Candidates must have the same parsed class, series, screen size, technical
suffix and regional broadcast system. Exactly one numeric character in the
simple model name may differ; letters must match. All eligible candidates,
including every firmware version, must agree on machine, OTA ID, major webOS
codename and broadcast. An unparseable candidate or any disagreement prevents
inference. Unknown regions and sizes are not inferred.

Only direct references are donors, so inference cannot propagate through a
chain of guessed mappings. Unresolved sizes and regions are omitted from an
inferred family. Generated records carry `inferredFrom`, listing the source
model/region pairs. This marks an inference, not a confirmed target OTA ID.

For example, `32LM637BPLA.AEK` can use `32LM630BPLA.AEK` and agreeing DVB
references: machine `m3r`, codename `goldilocks2`, OTA ID
`HE_DTV_W19R_AFAAABAA`.

Run focused checks with `node --test tools/model-fallbacks.test.js`, then
`npm run gen-models` to regenerate the model data from the latest export.
