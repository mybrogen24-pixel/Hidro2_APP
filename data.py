"""Casos de referência e carregamento resiliente dos dados DTC."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DTC_PATH = BASE_DIR / "data" / "dtc.csv"

REFERENCE_INPUTS = {
    "case_name": "Exercício acadêmico de validação",
    "Lm": 4.3,
    "Sm": 3.75,
    "lambda": 30.0,
    "k": 0.15,
    "rho_m": 1000.0,
    "nu_m": 1.14e-6,
    "rho_p": 1025.0,
    "nu_p": 1.19e-6,
    "g": 9.81,
    "Lp_manual": None,
    "Sp_manual": None,
}

REFERENCE_DATA = pd.DataFrame({"Vm (m/s)": [1.5], "RTm (N)": [18.0]})

DTC_INPUTS = {
    "case_name": "Duisburg Test Case - DTC",
    "Lm": 5.976,
    "Sm": 6.243,
    "lambda": 59.407,
    "k": 0.094,
    "rho_m": 998.8,
    "nu_m": 1.09e-6,
    "rho_p": 1025.0,
    "nu_p": 1.19e-6,
    "g": 9.81,
    "Lp_manual": None,
    "Sp_manual": None,
}

_DTC_FALLBACK = pd.DataFrame(
    {
        "Vm (m/s)": [1.335, 1.401, 1.469, 1.535, 1.602, 1.668],
        "RTm (N)": [20.34, 22.06, 24.14, 26.46, 28.99, 31.83],
    }
)


def load_dtc_data() -> pd.DataFrame:
    """Carrega data/dtc.csv ou usa os valores embarcados caso o arquivo falhe."""
    try:
        table = pd.read_csv(DTC_PATH)
        if {"Vm", "RTm"}.issubset(table.columns):
            table = table.rename(columns={"Vm": "Vm (m/s)", "RTm": "RTm (N)"})
        if {"Vm (m/s)", "RTm (N)"}.issubset(table.columns) and not table.empty:
            return table[["Vm (m/s)", "RTm (N)"]].copy()
    except (OSError, pd.errors.ParserError, UnicodeDecodeError):
        pass
    return _DTC_FALLBACK.copy()

