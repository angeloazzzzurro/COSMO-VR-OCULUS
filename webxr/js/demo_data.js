function raDecToXYZ(ra_deg, dec_deg) {
    const ra  = ra_deg  * Math.PI / 180;
    const dec = dec_deg * Math.PI / 180;
    return { x: Math.cos(dec)*Math.cos(ra), y: Math.sin(dec), z: -Math.cos(dec)*Math.sin(ra) };
}

const FAMOUS = [
    // Stelle con esopianeti
    { label:'Fomalhaut', ra:344.41,dec:-29.62,mag:1.16, spect:'A',has_planet:true, n_planets:1,koi_score:0.85 },
    { label:'Kepler-22', ra:291.41,dec: 47.89,mag:11.7, spect:'G',has_planet:true, n_planets:1,koi_score:0.98 },
    { label:'Kepler-442',ra:294.17,dec: 49.30,mag:14.0, spect:'K',has_planet:true, n_planets:1,koi_score:0.97 },
    { label:'Kepler-452',ra:295.47,dec: 44.32,mag:13.7, spect:'G',has_planet:true, n_planets:1,koi_score:0.99 },
    { label:'TRAPPIST-1',ra:346.62,dec: -5.04,mag:18.8, spect:'M',has_planet:true, n_planets:7,koi_score:1.00 },
    { label:'55 Cancri', ra:133.15,dec: 28.33,mag:5.95, spect:'G',has_planet:true, n_planets:5,koi_score:0.95 },
    { label:'HD 209458', ra:330.79,dec: 18.88,mag:7.65, spect:'G',has_planet:true, n_planets:1,koi_score:0.99 },
    { label:'Kepler-186',ra:286.49,dec: 43.57,mag:14.8, spect:'M',has_planet:true, n_planets:5,koi_score:0.96 },
    { label:'tau Ceti',  ra: 26.02,dec:-15.94,mag:3.49, spect:'G',has_planet:true, n_planets:4,koi_score:0.88 },
    // Stelle famose (no pianeti)
    { label:'Sirius',    ra:101.29,dec:-16.72,mag:-1.46,spect:'A',has_planet:false,n_planets:0 },
    { label:'Betelgeuse',ra: 88.79,dec:  7.41,mag:0.42, spect:'M',has_planet:false,n_planets:0 },
    { label:'Rigel',     ra: 78.63,dec: -8.20,mag:0.13, spect:'B',has_planet:false,n_planets:0 },
    { label:'Vega',      ra:279.23,dec: 38.78,mag:0.03, spect:'A',has_planet:false,n_planets:0 },
    { label:'Arcturus',  ra:213.92,dec: 19.18,mag:-0.05,spect:'K',has_planet:false,n_planets:0 },
    { label:'Aldebaran', ra: 68.98,dec: 16.51,mag:0.85, spect:'K',has_planet:false,n_planets:0 },
    { label:'Antares',   ra:247.35,dec:-26.43,mag:1.09, spect:'M',has_planet:false,n_planets:0 },
    { label:'Spica',     ra:201.30,dec:-11.16,mag:1.04, spect:'B',has_planet:false,n_planets:0 },
    { label:'Deneb',     ra:310.36,dec: 45.28,mag:1.25, spect:'A',has_planet:false,n_planets:0 },
    // Orione
    { label:'Bellatrix', ra: 81.28,dec:  6.35,mag:1.64, spect:'B',has_planet:false,n_planets:0 },
    { label:'Saiph',     ra: 86.94,dec: -9.67,mag:2.07, spect:'B',has_planet:false,n_planets:0 },
    { label:'Mintaka',   ra: 83.00,dec: -0.30,mag:2.23, spect:'O',has_planet:false,n_planets:0 },
    { label:'Alnilam',   ra: 84.05,dec: -1.20,mag:1.69, spect:'B',has_planet:false,n_planets:0 },
    { label:'Alnitak',   ra: 85.19,dec: -1.94,mag:1.77, spect:'O',has_planet:false,n_planets:0 },
    // Orsa Maggiore
    { label:'Dubhe',     ra:165.93,dec: 61.75,mag:1.79, spect:'K',has_planet:false,n_planets:0 },
    { label:'Merak',     ra:165.46,dec: 56.38,mag:2.37, spect:'A',has_planet:false,n_planets:0 },
    { label:'Phecda',    ra:178.46,dec: 53.69,mag:2.44, spect:'A',has_planet:false,n_planets:0 },
    { label:'Megrez',    ra:183.86,dec: 57.03,mag:3.31, spect:'A',has_planet:false,n_planets:0 },
    { label:'Alioth',    ra:193.51,dec: 55.96,mag:1.77, spect:'A',has_planet:false,n_planets:0 },
    { label:'Mizar',     ra:200.98,dec: 54.93,mag:2.04, spect:'A',has_planet:false,n_planets:0 },
    { label:'Alkaid',    ra:206.89,dec: 49.31,mag:1.86, spect:'B',has_planet:false,n_planets:0 },
    // Cassiopea
    { label:'Caph',      ra:  2.29,dec: 59.15,mag:2.27, spect:'F',has_planet:false,n_planets:0 },
    { label:'Schedar',   ra: 10.13,dec: 56.54,mag:2.24, spect:'K',has_planet:false,n_planets:0 },
    { label:'Gamma Cas', ra: 14.18,dec: 60.72,mag:2.47, spect:'B',has_planet:false,n_planets:0 },
    { label:'Ruchbah',   ra: 21.45,dec: 60.24,mag:2.68, spect:'A',has_planet:false,n_planets:0 },
    { label:'Segin',     ra: 28.60,dec: 63.67,mag:3.38, spect:'B',has_planet:false,n_planets:0 },
    // Scorpione
    { label:'Graffias',  ra:239.22,dec:-19.81,mag:2.62, spect:'B',has_planet:false,n_planets:0 },
    { label:'Dschubba',  ra:240.08,dec:-22.62,mag:2.32, spect:'B',has_planet:false,n_planets:0 },
    { label:'Tau Sco',   ra:248.97,dec:-28.22,mag:2.82, spect:'B',has_planet:false,n_planets:0 },
    { label:'Shaula',    ra:263.40,dec:-37.10,mag:1.63, spect:'B',has_planet:false,n_planets:0 },
    { label:'Lesath',    ra:264.33,dec:-37.30,mag:2.69, spect:'B',has_planet:false,n_planets:0 },
    // Cigno
    { label:'Sadr',      ra:305.56,dec: 40.26,mag:2.23, spect:'F',has_planet:false,n_planets:0 },
    { label:'Gienah',    ra:311.55,dec: 33.97,mag:2.48, spect:'K',has_planet:false,n_planets:0 },
    { label:'Delta Cyg', ra:296.24,dec: 45.13,mag:2.87, spect:'A',has_planet:false,n_planets:0 },
    { label:'Albireo',   ra:292.68,dec: 27.96,mag:3.08, spect:'K',has_planet:false,n_planets:0 },
];

export const CONSTELLATIONS = [
    {
        name: 'Orione', color: 0x6699cc,
        lines: [
            ['Betelgeuse','Alnilam'],  ['Betelgeuse','Bellatrix'],
            ['Rigel','Alnitak'],       ['Rigel','Saiph'],
            ['Bellatrix','Mintaka'],   ['Mintaka','Alnilam'],
            ['Alnilam','Alnitak'],     ['Saiph','Alnitak'],
        ]
    },
    {
        name: 'Orsa Maggiore', color: 0x88aadd,
        lines: [
            ['Dubhe','Merak'],   ['Merak','Phecda'],  ['Phecda','Megrez'],
            ['Megrez','Dubhe'],  ['Megrez','Alioth'],  ['Alioth','Mizar'],  ['Mizar','Alkaid'],
        ]
    },
    {
        name: 'Cassiopea', color: 0xaabbee,
        lines: [
            ['Caph','Schedar'], ['Schedar','Gamma Cas'], ['Gamma Cas','Ruchbah'], ['Ruchbah','Segin'],
        ]
    },
    {
        name: 'Scorpione', color: 0xcc7755,
        lines: [
            ['Graffias','Dschubba'], ['Dschubba','Antares'],
            ['Antares','Tau Sco'],   ['Tau Sco','Shaula'],  ['Shaula','Lesath'],
        ]
    },
    {
        name: 'Cigno', color: 0x88ddcc,
        lines: [
            ['Deneb','Sadr'], ['Sadr','Gienah'], ['Sadr','Delta Cyg'], ['Delta Cyg','Albireo'],
        ]
    },
];

export function generateDemoStars() {
    const stars = FAMOUS.map(s => ({ ...s, ...raDecToXYZ(s.ra, s.dec) }));
    const SPECTS = ['O','B','A','F','G','K','M'];
    for (let i = 0; i < 480; i++) {
        const ra=Math.random()*360, dec=(Math.random()-0.5)*180, mag=1.8+Math.random()*4.7;
        stars.push({ label:`HIP ${10000+i}`, ra, dec, mag,
            spect:SPECTS[Math.floor(Math.random()*SPECTS.length)],
            has_planet:false, n_planets:0, ...raDecToXYZ(ra,dec) });
    }
    for (let i = 0; i < 35; i++) {
        const ra=Math.random()*360, dec=(Math.random()-0.5)*180, mag=8+Math.random()*6;
        const n_planets=Math.floor(Math.random()*6)+1;
        stars.push({ label:`KOI-${2000+i}`, ra, dec, mag,
            spect:SPECTS[Math.floor(Math.random()*SPECTS.length)],
            has_planet:true, n_planets, koi_score:0.65+Math.random()*0.35,
            ...raDecToXYZ(ra,dec) });
    }
    return stars;
}
