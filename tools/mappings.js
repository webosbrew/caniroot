/**
 * @type {Record<string, string>}
 */
export const minorMajor = {
  'angeles': 'afro',
  'arches': 'afro',
  'ashley': 'afro',
  'badlands': 'beehive',
  'bighorn': 'beehive',
  'biscayne': 'beehive',
  'deathvalley': 'dreadlocks',
  'denali': 'dreadlocks',
  'deogyusan': 'dreadlocks',
  'deua': 'dreadlocks',
  'digya': 'dreadlocks',
  'dharug': 'dreadlocks',
  'dorrigo': 'dreadlocks2',
  'dixie': 'dreadlocks2',
  'drto': 'dreadlocks2',
  'dunggir': 'dreadlocks2',
  'dudhwa': 'dreadlocks2',
  'gayasan': 'goldilocks',
  'glacier': 'goldilocks',
  'gomolsha': 'goldilocks',
  'goobang': 'goldilocks',
  'gorce': 'goldilocks',
  'gorongosa': 'goldilocks',
  'grandcanyon': 'goldilocks2',
  'guaricana': 'goldilocks2',
  'gulaga': 'goldilocks2',
  'gyeongju': 'goldilocks2',
  'gyoen': 'goldilocks2',
  'gyeryongsan': 'goldilocks2',
  'gympie': 'goldilocks2',
  'grampians': 'goldilocks2',
  'jamestowne': 'jhericurl',
  'japoon': 'jhericurl',
  'jardine': 'jhericurl',
  'jasper': 'jhericurl',
  'jebil': 'jhericurl',
  'jervisbay': 'jhericurl',
  'kalaupapa': 'kisscurl',
  'katmai': 'kisscurl',
  'kavir': 'kisscurl',
  'kinglake': 'kisscurl',
  'kluane': 'kisscurl',
  'maria': 'mullet',
  'marine': 'mullet',
  'mebbin': 'mullet',
  'meru': 'mullet',
  'naejangsan': 'number1',
  'nairobi': 'number1',
  'nambung': 'number1',
  'nameri': 'number1',
  'namtok': 'number1',
  'odaesan': 'ombre',
  'oeta': 'ombre',
  'okapi': 'ombre',
}
/**
 * @type {Record<string, [string|{codename: string, otaId: string}]>}
 */
export const machineOtaIdPrefix = {
  'goldfinger': ['HE_DTV_WT1H_AFAA'],
  'm14tv': [{codename: 'afro', otaId: 'HE_DTV_WT1M_AFAA'}, {codename: 'beehive', otaId: 'HE_DTV_W15M_AFAA'}],
  'h15': ['HE_DTV_W15H_AFAD'],
  'lm15u': ['HE_DTV_W15U_AFAD'],
  'lm14a': ['HE_DTV_W15A_AFAD'],
  'lm14alite': ['HE_DTV_W15B_AFAD'],
  'mtka5lr': ['HE_DTV_W15L_AFAA'],
  'm2': ['HE_DTV_W16R_AFAA', 'HE_PJT_W16Z_AAAA'],
  'k2l': ['HE_DTV_W16K_AFAD'],
  'm16': ['HE_DTV_W16M_AFAD', 'HE_IDD_S16A_AHAA'],
  'm16lite': ['HE_DTV_W16N_AFAD'],
  'k2lp': ['HE_DTV_W16P_AFAD'],
  'm16p': ['HE_DTV_W17H_AFAD', 'HE_IDD_H17H_AHAA'],
  'm16plite': ['HE_DTV_W17M_AFAD', 'HE_PJT_W17W_AAAA', 'HE_PJT_W17V_AAAA'],
  'm16pbno': ['HE_DTV_W17B_AFAD'],
  'k3lp': ['HE_DTV_W17P_AFAD'],
  'm2r': ['HE_DTV_W17R_AFAA', 'HE_PJT_W17X_AAAA'],
  'o18': [{codename: 'goldilocks', otaId: 'HE_DTV_W18O_AFAB'}, {codename: 'goldilocks2', otaId: 'HE_DTV_W19O_AFAB'}],
  'o18k': ['HE_DTV_W19K_AFAD'],
  'm16pplite': ['HE_DTV_W18M_AFAD'],
  'm16pp': ['HE_DTV_W18H_AFAD'],
  'm3': ['HE_DTV_W18R_AFAA'],
  'lm18a': ['HE_DTV_W18A_AFAD', 'HE_PJT_W18Z_AAAA'],
  'm16p3': ['HE_DTV_W19H_AFAD', 'HE_DTV_W19T_AFAD'],
  'm3r': ['HE_DTV_W19R_AFAA'],
  'k5lp': ['HE_DTV_W19P_AFAD', 'HE_PJT_W19Z_AAAA'],
  'k6lpfhd': ['HE_DTV_W20L_AFAA'],
  'k6lpwee': ['HE_DTV_C20P_AFAD'],
  'k6hp': ['HE_DTV_W20H_AFAD'],
  'k6hpstb': ['HE_IDD_H20H_AHAA'],
  'o20': ['HE_DTV_W20O_AFAB'],
  'o208k': ['HE_DTV_W20K_AFAD'],
  'e60': ['HE_DTV_W20K_AFAD' /*I guess?*/],
  'k6lp': ['HE_DTV_W20P_AFAD', 'HE_PJT_W20Z_AAAA'],
  'lm21ut': ['HE_DTV_N21D_AFAA'],
  'k7lp': ['HE_DTV_W21P_AFAD'],
  'lm21a': ['HE_DTV_W21A_AFAD'],
  'lm21u': ['HE_DTV_W21U_AFAD', 'HE_IDD_H21U_AHAA'],
  'e60n': ['HE_DTV_W21K_AFAD'],
  'o20n': ['HE_DTV_W21O_AFAB'],
  'lm21an': ['HE_DTV_W22A_AFAD'],
  'k8ap': ['HE_DTV_W22L_AFAA'],
  'k8lp': ['HE_DTV_W22P_AFAD'],
  'k8hp': [{codename: 'mullet', otaId: 'HE_DTV_W22H_AFAD'}, {codename: 'number1', otaId: 'HE_DTV_W22H_AFAB'}],
  'k8hpt': ['HE_DTV_N22D_AFAA'],
  'k8apwee': ['HE_DTV_C22L_AFAA'],
  'k8lpwee': ['HE_DTV_C22P_AFAD'],
  'k8hpwee': ['HE_DTV_C22H_AFAB'],
  'o22': ['HE_DTV_W22O_AFAB'],
  'o228k': ['HE_DTV_W22K_AFAD'],
  'o22n': ['HE_DTV_W23O_AFAB'],
  'o22n8k': ['HE_DTV_W23K_AFAD'],
  'k8hpp': ['HE_DTV_W23H_AFAD'],
  'k8lpn': ['HE_DTV_W23P_AFAD'],
  'm23': ['HE_DTV_W23M_AFAD', 'HE_DTV_W23U_AFAD'/* only appear in test images */],
  'lm21ann': ['HE_DTV_W23A_AFAD'],
  'o24': ['HE_DTV_W24O_AFAB'],
  'k8lpn2': ['HE_DTV_W24P_AFAD'],
  'o22n2': ['HE_DTV_W24G_AFAB'],
  'k24': ['HE_DTV_W24H_AFAD'],
};

/**
 * @type {Record<string, Partial<DeviceModelData>>}
 */
export const otaIdUpgrades = {
  'HE_DTV_W22H_AFADATAA': {otaId: 'HE_DTV_W22H_AFABATPU', codename: 'number1'},
  'HE_DTV_W22O_AFABATAA': {otaId: 'HE_DTV_W22O_AFABATPU', codename: 'number1'},
};

/** @type {Record<string, string>} */
export const regionBroadcasts = {
  'US': 'atsc',
  'CA': 'atsc',
  'JP': 'arib',
  'KR': 'atsc',
  'UK': 'dvb',
  'DE': 'dvb',
  'NZ': 'dvb',
  'IN': 'dvb',
  'HK': 'dvb',
};