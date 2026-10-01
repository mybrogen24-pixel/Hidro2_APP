"""Motor de extrapolação hidrodinâmica modelo-protótipo.

Todas as funções deste módulo trabalham com unidades SI e mantêm precisão de
ponto flutuante até a camada de apresentação. A interface Streamlit apenas
formata os resultados — nunca reutiliza valores já arredondados.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import math

import pandas as pd

KNOTS_PER_METRE_PER_SECOND = 1.9438444924406048


def _finite(value: float, label: str) -> float:
    """Valida um número finito e o devolve como float."""
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} deve ser um número válido.") from exc
    if not math.isfinite(number):
        raise ValueError(f"{label} deve ser finito.")
    return number


def _positive(value: float, label: str) -> float:
    number = _finite(value, label)
    if number <= 0:
        raise ValueError(f"{label} deve ser maior que zero.")
    return number


def _non_negative(value: float, label: str) -> float:
    number = _finite(value, label)
    if number < 0:
        raise ValueError(f"{label} deve ser maior ou igual a zero.")
    return number


def calculate_prototype_length(model_length: float, scale: float) -> float:
    """Calcula Lp = lambda * Lm."""
    return _positive(model_length, "Lm") * _positive(scale, "lambda")


def calculate_prototype_area(model_area: float, scale: float) -> float:
    """Calcula Sp = lambda² * Sm."""
    return _positive(model_area, "Sm") * _positive(scale, "lambda") ** 2


def calculate_froude(velocity: float, length: float, gravity: float = 9.81) -> float:
    """Calcula o número de Froude: Fr = V / sqrt(g * L)."""
    return _positive(velocity, "Velocidade") / math.sqrt(
        _positive(gravity, "g") * _positive(length, "Comprimento")
    )


def calculate_prototype_speed(model_speed: float, scale: float) -> float:
    """Calcula a velocidade de semelhança de Froude: Vp = Vm * sqrt(lambda)."""
    return _positive(model_speed, "Vm") * math.sqrt(_positive(scale, "lambda"))


def calculate_reynolds(velocity: float, length: float, viscosity: float) -> float:
    """Calcula Re = V * L / nu com viscosidade cinemática."""
    return (
        _positive(velocity, "Velocidade")
        * _positive(length, "Comprimento")
        / _positive(viscosity, "Viscosidade cinemática")
    )


def calculate_friction_coefficient(reynolds: float) -> float:
    """Calcula Cf pela linha de atrito ITTC-1957."""
    reynolds = _positive(reynolds, "Reynolds")
    denominator = (math.log10(reynolds) - 2.0) ** 2
    if denominator == 0:
        raise ValueError("A fórmula ITTC-1957 não é definida para Re = 100.")
    return 0.075 / denominator


def calculate_total_coefficient(
    model_resistance: float,
    model_density: float,
    model_area: float,
    model_speed: float,
) -> float:
    """Calcula Ct_m = RTm / (0,5 * rho_m * Sm * Vm²)."""
    resistance = _non_negative(model_resistance, "RTm")
    density = _positive(model_density, "rho_m")
    area = _positive(model_area, "Sm")
    velocity = _positive(model_speed, "Vm")
    return resistance / (0.5 * density * area * velocity**2)


def calculate_resistance(
    density: float, area: float, velocity: float, coefficient: float
) -> float:
    """Calcula RT = 0,5 * rho * S * V² * Ct em N."""
    return (
        0.5
        * _positive(density, "Densidade")
        * _positive(area, "Área")
        * _positive(velocity, "Velocidade") ** 2
        * _finite(coefficient, "Coeficiente")
    )


def calculate_froude_method(
    ct_model: float, cf_model: float, cf_prototype: float
) -> dict[str, float]:
    """Aplica a extrapolação de Froude, preservando Cr do modelo."""
    ct_model = _finite(ct_model, "Ct_m")
    cf_model = _finite(cf_model, "Cf_m")
    cf_prototype = _finite(cf_prototype, "Cf_p")
    cr_model = ct_model - cf_model
    return {
        "Cr_m": cr_model,
        "Cr_p": cr_model,
        "Ct_p_Froude": cf_prototype + cr_model,
    }


def calculate_hughes_method(
    ct_model: float, cf_model: float, cf_prototype: float, form_factor: float
) -> dict[str, float]:
    """Aplica a decomposição viscosa/ondulatória de Hughes."""
    ct_model = _finite(ct_model, "Ct_m")
    cf_model = _finite(cf_model, "Cf_m")
    cf_prototype = _finite(cf_prototype, "Cf_p")
    form_factor = _finite(form_factor, "k")
    cv_model = (1.0 + form_factor) * cf_model
    cw_model = ct_model - cv_model
    cv_prototype = (1.0 + form_factor) * cf_prototype
    return {
        "Cv_m": cv_model,
        "Cw_m": cw_model,
        "Cw_p": cw_model,
        "Cv_p": cv_prototype,
        "Ct_p_Hughes": cv_prototype + cw_model,
    }


def calculate_effective_power(resistance: float, velocity: float) -> float:
    """Calcula PE = RT * V em W."""
    return _finite(resistance, "RT") * _positive(velocity, "Velocidade")


def _input_number(inputs: Mapping[str, Any], key: str) -> float:
    if key not in inputs:
        raise ValueError(f"Parâmetro obrigatório ausente: {key}.")
    return _finite(inputs[key], key)


def validate_inputs(inputs: Mapping[str, Any]) -> dict[str, float]:
    """Valida e normaliza as características da embarcação."""
    required_positive = ("Lm", "Sm", "lambda", "rho_m", "nu_m", "rho_p", "nu_p", "g")
    normalized = {key: _input_number(inputs, key) for key in required_positive}
    for key in required_positive:
        _positive(normalized[key], key)
    normalized["k"] = _input_number(inputs, "k")

    lp_manual = inputs.get("Lp_manual")
    sp_manual = inputs.get("Sp_manual")
    normalized["Lp"] = (
        _positive(lp_manual, "Lp manual")
        if lp_manual is not None
        else calculate_prototype_length(normalized["Lm"], normalized["lambda"])
    )
    normalized["Sp"] = (
        _positive(sp_manual, "Sp manual")
        if sp_manual is not None
        else calculate_prototype_area(normalized["Sm"], normalized["lambda"])
    )
    return normalized


def _point_values(point: Mapping[str, Any]) -> tuple[float, float]:
    vm = point.get("Vm", point.get("Vm (m/s)"))
    rtm = point.get("RTm", point.get("RTm (N)"))
    return _positive(vm, "Vm"), _non_negative(rtm, "RTm")


def calculate_extrapolation(
    inputs: Mapping[str, Any], experimental_data: pd.DataFrame | Sequence[Mapping[str, Any]]
) -> tuple[pd.DataFrame, dict[str, float]]:
    """Executa Froude e Hughes para cada ponto experimental independentemente.

    Retorna uma tabela completa em unidades coerentes e a geometria utilizada.
    Não há interpolação, suavização ou arredondamento intermediário.
    """
    values = validate_inputs(inputs)
    if isinstance(experimental_data, pd.DataFrame):
        records = experimental_data.to_dict(orient="records")
    else:
        records = list(experimental_data)
    if not records:
        raise ValueError("Informe pelo menos um ponto experimental válido.")

    rows: list[dict[str, float]] = []
    for index, point in enumerate(records, start=1):
        vm, rtm = _point_values(point)
        vp = calculate_prototype_speed(vm, values["lambda"])
        fr = calculate_froude(vm, values["Lm"], values["g"])
        re_m = calculate_reynolds(vm, values["Lm"], values["nu_m"])
        re_p = calculate_reynolds(vp, values["Lp"], values["nu_p"])
        cf_m = calculate_friction_coefficient(re_m)
        cf_p = calculate_friction_coefficient(re_p)
        ct_m = calculate_total_coefficient(rtm, values["rho_m"], values["Sm"], vm)
        froude = calculate_froude_method(ct_m, cf_m, cf_p)
        hughes = calculate_hughes_method(ct_m, cf_m, cf_p, values["k"])
        resistance_froude = calculate_resistance(
            values["rho_p"], values["Sp"], vp, froude["Ct_p_Froude"]
        )
        resistance_hughes = calculate_resistance(
            values["rho_p"], values["Sp"], vp, hughes["Ct_p_Hughes"]
        )
        power_froude = calculate_effective_power(resistance_froude, vp)
        power_hughes = calculate_effective_power(resistance_hughes, vp)
        delta_r = resistance_froude - resistance_hughes
        delta_p = power_froude - power_hughes
        rows.append(
            {
                "Ensaio": index,
                "Vm": vm,
                "RTm": rtm,
                "Fr": fr,
                "Vp": vp,
                "Vp nós": vp * KNOTS_PER_METRE_PER_SECOND,
                "Re_m": re_m,
                "Re_p": re_p,
                "Cf_m": cf_m,
                "Cf_p": cf_p,
                "Ct_m": ct_m,
                "Cr": froude["Cr_m"],
                "Cv_m": hughes["Cv_m"],
                "Cw": hughes["Cw_m"],
                "Ct_p_Froude": froude["Ct_p_Froude"],
                "Ct_p_Hughes": hughes["Ct_p_Hughes"],
                "RT_Froude_N": resistance_froude,
                "RT_Hughes_N": resistance_hughes,
                "RT_Froude_kN": resistance_froude / 1000.0,
                "RT_Hughes_kN": resistance_hughes / 1000.0,
                "PE_Froude_W": power_froude,
                "PE_Hughes_W": power_hughes,
                "PE_Froude_kW": power_froude / 1000.0,
                "PE_Hughes_kW": power_hughes / 1000.0,
                "PE_Froude_MW": power_froude / 1_000_000.0,
                "PE_Hughes_MW": power_hughes / 1_000_000.0,
                "DeltaR_N": delta_r,
                "DeltaR_percent": (delta_r / resistance_froude * 100.0)
                if resistance_froude != 0
                else math.nan,
                "DeltaP_W": delta_p,
                "DeltaP_percent": (delta_p / power_froude * 100.0)
                if power_froude != 0
                else math.nan,
            }
        )

    geometry = {
        "Lp": values["Lp"],
        "Sp": values["Sp"],
        "Lp_calculado": calculate_prototype_length(values["Lm"], values["lambda"]),
        "Sp_calculado": calculate_prototype_area(values["Sm"], values["lambda"]),
    }
    return pd.DataFrame(rows), geometry
