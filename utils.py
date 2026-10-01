"""Utilitários de entrada, apresentação e exportação do HydroScale."""

from __future__ import annotations

from io import BytesIO
from typing import Any

import math

import pandas as pd

EXPERIMENTAL_COLUMNS = ["Vm (m/s)", "RTm (N)"]

# Alias aceitos em importações. O estado interno sempre usa EXPERIMENTAL_COLUMNS.
COLUMN_ALIASES = {
    "Vm": "Vm (m/s)",
    "vm": "Vm (m/s)",
    "velocidade_modelo": "Vm (m/s)",
    "RTm": "RTm (N)",
    "rtm": "RTm (N)",
    "resistencia_modelo": "RTm (N)",
    "resistencia_total_modelo": "RTm (N)",
}


def parse_ptbr_number(value: Any) -> float | None:
    """Aceita números brasileiros, ponto decimal e notação científica.

    Campos vazios continuam vazios; a validação de obrigatoriedade fica na
    camada que conhece o contexto do campo.
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(" ", "")
    # Trata milhares brasileiros (22.032,75) e US (22,032.75), sem perder 1,19e-6.
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    else:
        text = text.replace(",", ".")
    try:
        number = float(text)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def format_br(value: Any, decimals: int = 3, scientific: bool = False) -> str:
    """Formata números somente para visualização, no padrão pt-BR."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "—"
    if not math.isfinite(number):
        return "—"
    if scientific:
        mantissa, exponent = f"{number:.{decimals}e}".split("e")
        return f"{mantissa.replace('.', ',')}e{int(exponent):+d}"
    formatted = f"{number:,.{decimals}f}"
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _empty_experimental_data() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "Vm (m/s)": pd.Series(dtype="float64"),
            "RTm (N)": pd.Series(dtype="float64"),
        }
    )


def _canonical_column_name(column: object) -> str | None:
    """Resolve cabeçalhos comuns, inclusive variações sem espaços."""
    text = str(column).strip()
    if text in EXPERIMENTAL_COLUMNS:
        return text
    if text in COLUMN_ALIASES:
        return COLUMN_ALIASES[text]
    normalized = text.lower().replace(" ", "").replace("_", "")
    aliases = {
        "vm": "Vm (m/s)",
        "vm(m/s)": "Vm (m/s)",
        "velocidademodelo": "Vm (m/s)",
        "velocidade": "Vm (m/s)",
        "rtm": "RTm (N)",
        "rtm(n)": "RTm (N)",
        "resistenciamodelo": "RTm (N)",
        "resistenciatotalmodelo": "RTm (N)",
        "resistencia": "RTm (N)",
    }
    return aliases.get(normalized)


def normalize_experimental_data(data: Any) -> pd.DataFrame:
    """Retorna sempre um DataFrame canônico para o editor de ensaios.

    A função aceita DataFrames, listas de registros e dicionários. Linhas e
    campos incompletos são preservados como ``NaN`` para que a interface possa
    informar o erro ao usuário antes de calcular; eles nunca chegam ao motor.
    """
    if data is None:
        return _empty_experimental_data()
    if isinstance(data, pd.DataFrame):
        source = data.copy()
    elif isinstance(data, (list, tuple)):
        source = pd.DataFrame(data)
    elif isinstance(data, dict):
        try:
            source = pd.DataFrame(data)
        except ValueError:
            source = pd.DataFrame([data])
    else:
        return _empty_experimental_data()

    canonical = _empty_experimental_data().reindex(source.index)
    for source_column in source.columns:
        target_column = _canonical_column_name(source_column)
        if target_column is None:
            continue
        values = source[source_column]
        if canonical[target_column].isna().all():
            canonical[target_column] = values
        else:
            canonical[target_column] = canonical[target_column].combine_first(values)

    for column in EXPERIMENTAL_COLUMNS:
        canonical[column] = canonical[column].map(parse_ptbr_number)
    return canonical[EXPERIMENTAL_COLUMNS].copy()


def validate_experimental_data(data: Any) -> tuple[pd.DataFrame, list[str]]:
    """Valida a tabela canônica sem ocultar linhas parcialmente preenchidas."""
    dataframe = normalize_experimental_data(data).dropna(how="all").copy()
    if dataframe.empty:
        return pd.DataFrame(columns=["Vm", "RTm"]), [
            "Informe pelo menos um ensaio com Vm e RTm."
        ]
    if dataframe.isna().any(axis=None):
        return pd.DataFrame(columns=["Vm", "RTm"]), [
            "Existem ensaios incompletos. Preencha Vm e RTm antes de calcular."
        ]
    if (dataframe["Vm (m/s)"] <= 0).any():
        return pd.DataFrame(columns=["Vm", "RTm"]), [
            "Vm deve ser maior que zero em todos os ensaios."
        ]
    if (dataframe["RTm (N)"] < 0).any():
        return pd.DataFrame(columns=["Vm", "RTm"]), [
            "RTm não pode ser negativo."
        ]
    return dataframe.rename(columns={"Vm (m/s)": "Vm", "RTm (N)": "RTm"}), []


def results_to_csv(results: pd.DataFrame) -> bytes:
    return results.to_csv(index=False, sep=";", decimal=",").encode("utf-8-sig")


def results_to_xlsx(results: pd.DataFrame, inputs: dict[str, Any]) -> bytes:
    """Gera uma planilha portátil, com resultados e parâmetros em abas separadas."""
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        results.to_excel(writer, index=False, sheet_name="Resultados")
        pd.DataFrame(
            {"Parâmetro": list(inputs.keys()), "Valor": list(inputs.values())}
        ).to_excel(writer, index=False, sheet_name="Características")
    return output.getvalue()

