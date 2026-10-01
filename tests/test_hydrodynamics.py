from __future__ import annotations

import math

import pandas as pd
import pytest

from data import DTC_INPUTS, REFERENCE_DATA, REFERENCE_INPUTS, load_dtc_data
from hydrodynamics import (
    calculate_extrapolation,
    calculate_friction_coefficient,
    calculate_froude,
    calculate_froude_method,
    calculate_hughes_method,
    calculate_prototype_area,
    calculate_prototype_length,
    calculate_prototype_speed,
    calculate_reynolds,
    calculate_total_coefficient,
)
from utils import normalize_experimental_data, validate_experimental_data


def test_geometric_scale_relations() -> None:
    assert calculate_prototype_length(4.3, 30) == 129
    assert calculate_prototype_area(3.75, 30) == 3375


def test_froude_and_prototype_speed_preserve_similarity() -> None:
    model_speed = 1.5
    prototype_speed = calculate_prototype_speed(model_speed, 30)
    assert prototype_speed == pytest.approx(model_speed * math.sqrt(30))
    assert calculate_froude(model_speed, 4.3) == pytest.approx(
        calculate_froude(prototype_speed, 129)
    )


def test_reynolds_ittc_and_total_coefficient() -> None:
    reynolds = calculate_reynolds(1.5, 4.3, 1.14e-6)
    assert reynolds == pytest.approx(1.5 * 4.3 / 1.14e-6)
    assert calculate_friction_coefficient(reynolds) == pytest.approx(
        0.075 / (math.log10(reynolds) - 2) ** 2
    )
    assert calculate_total_coefficient(18, 1000, 3.75, 1.5) == pytest.approx(
        18 / (0.5 * 1000 * 3.75 * 1.5**2)
    )


def test_froude_and_hughes_coefficients() -> None:
    froude = calculate_froude_method(0.004267, 0.00332, 0.001553)
    assert froude["Cr_m"] == pytest.approx(0.000947)
    assert froude["Cr_p"] == pytest.approx(froude["Cr_m"])
    assert froude["Ct_p_Froude"] == pytest.approx(0.0025)

    hughes = calculate_hughes_method(0.004267, 0.00332, 0.001553, 0.15)
    assert hughes["Cv_m"] == pytest.approx(1.15 * 0.00332)
    assert hughes["Cw_p"] == pytest.approx(hughes["Cw_m"])
    assert hughes["Ct_p_Hughes"] == pytest.approx(hughes["Cv_p"] + hughes["Cw_p"])


def test_reference_exercise_matches_published_rounding() -> None:
    results, geometry = calculate_extrapolation(REFERENCE_INPUTS, REFERENCE_DATA)
    row = results.iloc[0]
    assert geometry["Lp"] == pytest.approx(129)
    assert geometry["Sp"] == pytest.approx(3375)
    assert row["Fr"] == pytest.approx(0.23, abs=0.002)
    assert row["Vp"] == pytest.approx(8.22, abs=0.01)
    assert row["RT_Froude_kN"] == pytest.approx(292, abs=0.5)
    assert row["PE_Froude_kW"] == pytest.approx(2400, abs=5)
    assert row["RT_Hughes_kN"] == pytest.approx(261, abs=0.5)
    assert row["PE_Hughes_kW"] == pytest.approx(2147, abs=5)


def test_first_dtc_point_is_extrapolated_independently() -> None:
    dtc = load_dtc_data()
    results, geometry = calculate_extrapolation(DTC_INPUTS, dtc)
    first = results.iloc[0]
    assert len(results) == 6
    assert geometry["Lp"] == pytest.approx(355.016232)
    assert first["Vm"] == pytest.approx(1.335)
    assert first["RTm"] == pytest.approx(20.34)
    assert first["Fr"] == pytest.approx(0.1744, abs=0.0001)
    assert first["Vp"] == pytest.approx(10.288, abs=0.002)
    assert first["Ct_m"] == pytest.approx(
        calculate_total_coefficient(20.34, 998.8, 6.243, 1.335)
    )


def test_negative_coefficients_are_preserved_for_warning_layer() -> None:
    # O motor não mascara resultados físicos/questionáveis; a interface alerta o usuário.
    result, _ = calculate_extrapolation(
        REFERENCE_INPUTS, [{"Vm": 1.5, "RTm": 1.0}]
    )
    assert result.iloc[0]["Cr"] < 0
    assert result.iloc[0]["Cw"] < 0


def test_experimental_data_normalizer_always_returns_the_editor_dataframe() -> None:
    expected_columns = ["Vm (m/s)", "RTm (N)"]
    from_list = normalize_experimental_data([{"Vm": 1.5, "RTm": 18.0}])
    from_dict = normalize_experimental_data({"velocidade_modelo": [1.335], "rtm": [20.34]})
    from_dataframe = normalize_experimental_data(
        pd.DataFrame({"Vm (m/s)": [1.401], "RTm (N)": [22.06], "extra": [1]})
    )

    for dataframe in (normalize_experimental_data(None), from_list, from_dict, from_dataframe):
        assert isinstance(dataframe, pd.DataFrame)
        assert dataframe.columns.tolist() == expected_columns
    assert from_list.iloc[0].to_dict() == {"Vm (m/s)": 1.5, "RTm (N)": 18.0}
    assert from_dict.iloc[0].to_dict() == {"Vm (m/s)": 1.335, "RTm (N)": 20.34}


def test_experimental_validation_keeps_incomplete_rows_visible_and_blocks_calculation() -> None:
    incomplete = normalize_experimental_data([{"Vm": 1.5, "RTm": None}])
    points, errors = validate_experimental_data(incomplete)
    assert points.empty
    assert errors == ["Existem ensaios incompletos. Preencha Vm e RTm antes de calcular."]

    negative_resistance = normalize_experimental_data([{"Vm": 1.5, "RTm": -1}])
    _, errors = validate_experimental_data(negative_resistance)
    assert errors == ["RTm não pode ser negativo."]
