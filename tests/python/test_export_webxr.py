import json
import math
import os
import sys

import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'atlas'))
from export_webxr import ra_dec_to_xyz, export_stars

EPSILON = 1e-9
REQUIRED_FIELDS = ('label', 'ra', 'dec', 'mag', 'spect', 'has_planet', 'n_planets', 'koi_score', 'x', 'y', 'z')


def make_df(rows):
    return pd.DataFrame(rows)


def single_star(**kwargs):
    defaults = dict(
        label='TestStar', ra_deg=0.0, dec=0.0, mag=5.0,
        spect_class='G', has_planet=False, n_planets=0, koi_score=0.0
    )
    defaults.update(kwargs)
    return make_df([defaults])


# ── ra_dec_to_xyz ─────────────────────────────────────────────────────────────

class TestRaDecToXyz:
    def test_ra0_dec0_maps_to_positive_x(self):
        r = ra_dec_to_xyz(0.0, 0.0)
        assert abs(r['x'] - 1.0) < EPSILON
        assert abs(r['y']) < EPSILON
        assert abs(r['z']) < EPSILON

    def test_north_pole_maps_to_positive_y(self):
        r = ra_dec_to_xyz(0.0, 90.0)
        assert abs(r['x']) < EPSILON
        assert abs(r['y'] - 1.0) < EPSILON
        assert abs(r['z']) < EPSILON

    def test_south_pole_maps_to_negative_y(self):
        r = ra_dec_to_xyz(0.0, -90.0)
        assert abs(r['x']) < EPSILON
        assert abs(r['y'] + 1.0) < EPSILON
        assert abs(r['z']) < EPSILON

    def test_ra180_dec0_maps_to_negative_x(self):
        r = ra_dec_to_xyz(180.0, 0.0)
        assert abs(r['x'] + 1.0) < EPSILON
        assert abs(r['y']) < EPSILON
        assert abs(r['z']) < EPSILON

    def test_ra90_dec0_maps_to_negative_z(self):
        # z = -cos(0)*sin(90°) = -1  (Three.js right-hand convention)
        r = ra_dec_to_xyz(90.0, 0.0)
        assert abs(r['x']) < EPSILON
        assert abs(r['y']) < EPSILON
        assert abs(r['z'] + 1.0) < EPSILON

    def test_output_is_unit_vector(self):
        for ra, dec in [(101.29, -16.72), (88.79, 7.41), (344.41, -29.62), (0, 45), (270, -60)]:
            r = ra_dec_to_xyz(ra, dec)
            mag = math.sqrt(r['x']**2 + r['y']**2 + r['z']**2)
            assert abs(mag - 1.0) < 1e-12, f"Non-unit vector for RA={ra}, Dec={dec}: mag={mag}"

    def test_matches_explicit_formula(self):
        ra_deg, dec_deg = 134.5, -23.7
        ra = math.radians(ra_deg)
        dec = math.radians(dec_deg)
        result = ra_dec_to_xyz(ra_deg, dec_deg)
        assert abs(result['x'] - math.cos(dec) * math.cos(ra)) < EPSILON
        assert abs(result['y'] - math.sin(dec)) < EPSILON
        assert abs(result['z'] - (-math.cos(dec) * math.sin(ra))) < EPSILON

    def test_matches_javascript_formula_for_betelgeuse(self):
        # Betelgeuse: RA=88.79°, Dec=7.41°
        r = ra_dec_to_xyz(88.79, 7.41)
        ra = math.radians(88.79)
        dec = math.radians(7.41)
        assert abs(r['x'] - math.cos(dec) * math.cos(ra)) < EPSILON
        assert abs(r['y'] - math.sin(dec)) < EPSILON
        assert abs(r['z'] - (-math.cos(dec) * math.sin(ra))) < EPSILON

    def test_returns_dict_with_xyz_keys(self):
        r = ra_dec_to_xyz(0.0, 0.0)
        assert set(r.keys()) == {'x', 'y', 'z'}


# ── export_stars ──────────────────────────────────────────────────────────────

class TestExportStars:
    def test_creates_output_file(self, tmp_path):
        out = str(tmp_path / 'stars.json')
        export_stars(single_star(), out)
        assert os.path.isfile(out)

    def test_returned_records_match_input_count(self, tmp_path):
        rows = [dict(label=f'Star{i}', ra_deg=float(i*10), dec=0.0, mag=5.0,
                     spect_class='G', has_planet=False, n_planets=0, koi_score=0.0)
                for i in range(7)]
        records = export_stars(make_df(rows), str(tmp_path / 'out.json'))
        assert len(records) == 7

    def test_record_has_all_required_fields(self, tmp_path):
        out = str(tmp_path / 'out.json')
        records = export_stars(single_star(label='Sirius', ra_deg=101.29, dec=-16.72, mag=-1.46, spect_class='A'), out)
        for field in REQUIRED_FIELDS:
            assert field in records[0], f"Missing field: {field}"

    def test_nan_koi_score_becomes_zero(self, tmp_path):
        out = str(tmp_path / 'out.json')
        df = single_star(label='TRAPPIST-1', ra_deg=346.62, dec=-5.04, mag=18.8,
                         spect_class='M', has_planet=True, n_planets=7, koi_score=float('nan'))
        records = export_stars(df, out)
        assert records[0]['koi_score'] == 0.0

    def test_numpy_nan_koi_score_becomes_zero(self, tmp_path):
        out = str(tmp_path / 'out.json')
        df = single_star(koi_score=np.nan, has_planet=True, n_planets=1)
        records = export_stars(df, out)
        assert records[0]['koi_score'] == 0.0

    def test_xyz_coordinates_match_ra_dec_to_xyz(self, tmp_path):
        ra, dec = 88.79, 7.41  # Betelgeuse
        out = str(tmp_path / 'out.json')
        records = export_stars(single_star(ra_deg=ra, dec=dec), out)
        expected = ra_dec_to_xyz(ra, dec)
        assert abs(records[0]['x'] - expected['x']) < EPSILON
        assert abs(records[0]['y'] - expected['y']) < EPSILON
        assert abs(records[0]['z'] - expected['z']) < EPSILON

    def test_spect_class_truncated_to_one_character(self, tmp_path):
        out = str(tmp_path / 'out.json')
        records = export_stars(single_star(spect_class='G2V'), out)
        assert records[0]['spect'] == 'G'

    def test_json_file_is_valid_and_parseable(self, tmp_path):
        out = str(tmp_path / 'out.json')
        export_stars(single_star(label='Vega', ra_deg=279.23, dec=38.78, mag=0.03, spect_class='A'), out)
        with open(out, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert len(data) == 1
        assert data[0]['label'] == 'Vega'

    def test_has_planet_and_n_planets_are_preserved(self, tmp_path):
        out = str(tmp_path / 'out.json')
        df = single_star(has_planet=True, n_planets=5, koi_score=0.95)
        records = export_stars(df, out)
        assert records[0]['has_planet'] is True
        assert records[0]['n_planets'] == 5

    def test_host_star_count_is_correct(self, tmp_path):
        rows = [dict(label=f'S{i}', ra_deg=float(i * 15), dec=0.0, mag=6.0,
                     spect_class='K', has_planet=(i < 3), n_planets=(2 if i < 3 else 0), koi_score=0.8)
                for i in range(6)]
        out = str(tmp_path / 'out.json')
        records = export_stars(make_df(rows), out)
        assert sum(1 for r in records if r['has_planet']) == 3

    def test_koi_score_is_rounded_to_4_decimal_places(self, tmp_path):
        out = str(tmp_path / 'out.json')
        records = export_stars(single_star(koi_score=0.987654321, has_planet=True, n_planets=1), out)
        assert records[0]['koi_score'] == round(0.987654321, 4)

    def test_missing_koi_score_column_defaults_to_zero(self, tmp_path):
        df = pd.DataFrame([dict(label='X', ra_deg=0.0, dec=0.0, mag=5.0,
                                spect_class='G', has_planet=False, n_planets=0)])
        out = str(tmp_path / 'out.json')
        records = export_stars(df, out)
        assert records[0]['koi_score'] == 0.0
