"""Interface Streamlit do HydroScale."""

from __future__ import annotations

from typing import Any, Callable

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from data import DTC_INPUTS, REFERENCE_DATA, REFERENCE_INPUTS, load_dtc_data
from hydrodynamics import calculate_extrapolation
from utils import (
    format_br,
    normalize_experimental_data,
    parse_ptbr_number,
    results_to_csv,
    results_to_xlsx,
    validate_experimental_data,
)

st.set_page_config(page_title="HydroScale", page_icon="⚓", layout="wide")

NAVIGATION = [
    "Início",
    "Características",
    "Dados experimentais",
    "Resultados",
    "Comparação",
    "Gráficos",
    "Memória de cálculo",
    "Validação",
    "Estudo de caso",
]

INPUT_FIELDS = [
    ("case_name", "Nome do caso", "Ex.: Ensaio de reboque"),
    ("Lm", "Comprimento do modelo, Lm (m)", "5,976"),
    ("Sm", "Área molhada do modelo, Sm (m²)", "6,243"),
    ("lambda", "Escala, λ", "59,407"),
    ("k", "Fator de forma, k", "0,094"),
    ("rho_m", "Densidade do fluido do modelo, ρm (kg/m³)", "998,8"),
    ("nu_m", "Viscosidade cinemática do modelo, νm (m²/s)", "1,09e-6"),
    ("rho_p", "Densidade do fluido do protótipo, ρp (kg/m³)", "1025"),
    ("nu_p", "Viscosidade cinemática do protótipo, νp (m²/s)", "1,19e-6"),
    ("g", "Aceleração da gravidade, g (m/s²)", "9,81"),
]


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    return f"{float(value):.15g}" if isinstance(value, (int, float)) else str(value)


def _initial_state() -> None:
    state = st.session_state
    state.setdefault("input_text", {key: "" for key, _, _ in INPUT_FIELDS})
    state["input_text"].setdefault("case_name", "Novo cálculo")
    state.setdefault("experimental_data", pd.DataFrame(columns=["Vm (m/s)", "RTm (N)"]))
    # Esta atribuição protege sessões antigas, presets e importações contra
    # listas/dicionários chegarem ao st.data_editor.
    state["experimental_data"] = normalize_experimental_data(
        state.get("experimental_data")
    )
    state.setdefault("results", None)
    state.setdefault("inputs", None)
    state.setdefault("geometry", None)
    state.setdefault("calculated", False)
    state.setdefault("selected_case", "Novo cálculo")
    state.setdefault("form_nonce", 0)
    state.setdefault("messages", [])
    state.setdefault("last_imported_file", None)


def _queue_page(page: str) -> None:
    st.session_state["requested_page"] = page


def start_new_calculation() -> None:
    """Limpa somente o estado de trabalho, sem tocar em arquivos ou no motor."""
    st.session_state["input_text"] = {
        key: ("Novo cálculo" if key == "case_name" else "")
        for key, _, _ in INPUT_FIELDS
    }
    st.session_state["experimental_data"] = normalize_experimental_data(None)
    st.session_state.pop("experimental_data_editor", None)
    st.session_state["results"] = None
    st.session_state["inputs"] = None
    st.session_state["geometry"] = None
    st.session_state["calculated"] = False
    st.session_state["selected_case"] = "Novo cálculo"
    st.session_state["form_nonce"] += 1
    _queue_page("Características")


def _load_case(
    name: str,
    inputs: dict[str, Any],
    points: pd.DataFrame,
    page: str,
    *,
    calculate_now: bool = False,
) -> None:
    experimental_data = normalize_experimental_data(points)
    st.session_state["input_text"] = {
        key: _as_text(inputs.get(key, "")) for key, _, _ in INPUT_FIELDS
    }
    st.session_state["experimental_data"] = experimental_data
    # A chave pertence somente ao widget; removê-la antes da próxima renderização
    # evita que o estado interno de uma tabela anterior sobreponha um preset novo.
    st.session_state.pop("experimental_data_editor", None)
    st.session_state["form_nonce"] += 1
    st.session_state["selected_case"] = name
    st.session_state["results"] = None
    st.session_state["inputs"] = None
    st.session_state["geometry"] = None
    st.session_state["calculated"] = False
    if calculate_now:
        results, geometry = calculate_extrapolation(inputs, experimental_data)
        st.session_state["results"] = results
        st.session_state["inputs"] = inputs.copy()
        st.session_state["geometry"] = geometry
        st.session_state["calculated"] = True
        st.session_state["messages"] = [f"{name} carregado e calculado com sucesso."]
    else:
        st.session_state["messages"] = [f"{name} carregado. Revise os dados e calcule quando desejar."]
    _queue_page(page)


def load_reference() -> None:
    _load_case(
        "Exercício de referência",
        REFERENCE_INPUTS,
        REFERENCE_DATA,
        "Validação",
        calculate_now=True,
    )


def load_dtc() -> None:
    _load_case("Duisburg Test Case - DTC", DTC_INPUTS, load_dtc_data(), "Estudo de caso")


def _build_inputs(raw: dict[str, str], lp_text: str, sp_text: str) -> tuple[dict[str, Any] | None, list[str]]:
    errors: list[str] = []
    values: dict[str, Any] = {"case_name": raw.get("case_name", "").strip() or "Sem nome"}
    for key, label, _ in INPUT_FIELDS[1:]:
        number = parse_ptbr_number(raw.get(key))
        if number is None:
            errors.append(f"Informe um valor válido para {label}.")
        else:
            values[key] = number
    lp_manual = parse_ptbr_number(lp_text)
    sp_manual = parse_ptbr_number(sp_text)
    if lp_text.strip() and lp_manual is None:
        errors.append("Lp manual não é um número válido.")
    if sp_text.strip() and sp_manual is None:
        errors.append("Sp manual não é um número válido.")
    values["Lp_manual"] = lp_manual
    values["Sp_manual"] = sp_manual
    return (None if errors else values), errors


def _calculate(inputs: dict[str, Any] | None = None) -> bool:
    """Calcula e salva a tabela, sem arredondar as grandezas calculadas."""
    if inputs is None:
        inputs = st.session_state.get("inputs")
    if not inputs:
        st.error("Preencha e salve as características da embarcação antes de calcular.")
        return False
    st.session_state["experimental_data"] = normalize_experimental_data(
        st.session_state.get("experimental_data")
    )
    points, data_errors = validate_experimental_data(
        st.session_state["experimental_data"]
    )
    if data_errors:
        for error in data_errors:
            st.error(error)
        return False
    try:
        results, geometry = calculate_extrapolation(inputs, points)
    except ValueError as exc:
        st.error(f"Não foi possível calcular: {exc}")
        return False
    st.session_state["results"] = results
    st.session_state["geometry"] = geometry
    st.session_state["inputs"] = inputs
    st.session_state["calculated"] = True
    st.session_state["messages"] = ["Cálculos realizados com sucesso."]
    _queue_page("Resultados")
    return True


def _show_messages() -> None:
    for message in st.session_state.pop("messages", []):
        st.success(message)


def _result_or_notice() -> pd.DataFrame | None:
    results = st.session_state.get("results")
    if results is None or results.empty:
        st.info("Ainda não há resultados. Configure as características, informe os ensaios e calcule.")
        return None
    return results


def _show_warning_coefficients(results: pd.DataFrame) -> None:
    if (results["Cr"] < 0).any():
        st.warning("Coeficiente residual negativo. Verifique os dados.")
    if (results["Cw"] < 0).any():
        st.warning(
            "Coeficiente de ondas negativo. Verifique o fator de forma e os dados experimentais."
        )


def _metric(label: str, value: float, suffix: str, decimals: int = 3) -> None:
    st.metric(label, f"{format_br(value, decimals)} {suffix}".strip())


def _formatted_dataframe(results: pd.DataFrame) -> Any:
    formats = {
        "Vm": lambda v: format_br(v, 3),
        "RTm": lambda v: format_br(v, 3),
        "Fr": lambda v: format_br(v, 4),
        "Vp": lambda v: format_br(v, 3),
        "Vp nós": lambda v: format_br(v, 3),
        "Re_m": lambda v: format_br(v, 3, scientific=True),
        "Re_p": lambda v: format_br(v, 3, scientific=True),
    }
    for column in results.columns:
        if column not in formats and column != "Ensaio":
            formats[column] = lambda v: format_br(v, 6)
    return results.style.format(formats)


def render_home() -> None:
    st.title("HydroScale")
    st.subheader("Extrapolação Hidrodinâmica Modelo–Protótipo")
    st.write(
        "Ferramenta acadêmica para estimar resistência e potência efetiva pelos métodos de Froude e Hughes."
    )
    st.markdown("""
    **Fluxo de trabalho:** escolha um caso → confira as características → informe os ensaios → calcule → compare os métodos.
    """)
    col1, col2, col3 = st.columns(3)
    with col1:
        st.button("Novo cálculo", width="stretch", on_click=start_new_calculation, key="home_new")
    with col2:
        st.button(
            "Carregar exercício de referência",
            width="stretch",
            on_click=load_reference,
            key="home_reference",
        )
    with col3:
        st.button(
            "Carregar estudo de caso DTC",
            width="stretch",
            on_click=load_dtc,
            key="home_dtc",
        )

    with st.expander("Hipóteses e unidades"):
        st.markdown(
            """
            - As resistências são informadas em **N**, áreas em **m²** e velocidades em **m/s**.
            - A potência efetiva é calculada em **W** antes da conversão para kW/MW.
            - Cada ponto experimental é extrapolado independentemente, sem interpolação.
            - Os valores mostrados são arredondados apenas para apresentação.
            """
        )


def render_characteristics() -> None:
    st.title("Características da embarcação")
    st.caption("Use vírgula ou ponto decimal. Os campos começam vazios para evitar o prefixo zero.")
    text_values = st.session_state["input_text"]
    nonce = st.session_state["form_nonce"]
    with st.form(f"characteristics_form_{nonce}"):
        raw: dict[str, str] = {}
        raw["case_name"] = st.text_input(
            "Nome do caso", value=text_values.get("case_name", ""), placeholder="Ex.: DTC"
        )
        left, right = st.columns(2)
        for index, (key, label, placeholder) in enumerate(INPUT_FIELDS[1:]):
            container = left if index % 2 == 0 else right
            with container:
                raw[key] = st.text_input(
                    label,
                    value=text_values.get(key, ""),
                    placeholder=placeholder,
                    key=f"field_{key}_{nonce}",
                )
        st.divider()
        manual_lengths = st.checkbox("Informar Lp manualmente", value=bool(text_values.get("Lp_manual")))
        lp_text = st.text_input(
            "Comprimento do protótipo, Lp (m)",
            value=text_values.get("Lp_manual", "") if manual_lengths else "",
            placeholder="Calculado por λ × Lm quando vazio",
            disabled=not manual_lengths,
            key=f"lp_manual_{nonce}",
        )
        manual_areas = st.checkbox("Informar Sp manualmente", value=bool(text_values.get("Sp_manual")))
        sp_text = st.text_input(
            "Área molhada do protótipo, Sp (m²)",
            value=text_values.get("Sp_manual", "") if manual_areas else "",
            placeholder="Calculada por λ² × Sm quando vazia",
            disabled=not manual_areas,
            key=f"sp_manual_{nonce}",
        )
        submitted = st.form_submit_button("Salvar características", type="primary")

    if submitted:
        if not manual_lengths:
            lp_text = ""
        if not manual_areas:
            sp_text = ""
        raw["Lp_manual"] = lp_text
        raw["Sp_manual"] = sp_text
        inputs, errors = _build_inputs(raw, lp_text, sp_text)
        st.session_state["input_text"] = raw
        if errors:
            for error in errors:
                st.error(error)
        else:
            st.session_state["inputs"] = inputs
            st.session_state["results"] = None
            st.session_state["geometry"] = None
            st.session_state["calculated"] = False
            st.success("Características salvas. Agora informe os dados experimentais.")

    if st.session_state.get("inputs"):
        current = st.session_state["inputs"]
        calculated_lp = current["Lm"] * current["lambda"]
        calculated_sp = current["Sm"] * current["lambda"] ** 2
        c1, c2 = st.columns(2)
        with c1:
            _metric("Lp usado", current.get("Lp_manual") or calculated_lp, "m")
        with c2:
            _metric("Sp usada", current.get("Sp_manual") or calculated_sp, "m²")


def render_experimental_data() -> None:
    st.title("Dados experimentais")
    st.write("Edite, adicione ou exclua ensaios de resistência do modelo.")
    with st.expander("Importar CSV", expanded=False):
        uploaded = st.file_uploader("Arquivo CSV", type=["csv"])
        st.caption("Formato esperado: `Vm,RTm` com uma linha por ensaio.")
        upload_id = (
            getattr(uploaded, "file_id", None) or f"{uploaded.name}:{uploaded.size}"
            if uploaded is not None
            else None
        )
        if uploaded is not None and upload_id != st.session_state.get("last_imported_file"):
            try:
                uploaded_table = pd.read_csv(uploaded)
                clean = normalize_experimental_data(uploaded_table)
                if not clean.dropna(how="all").empty:
                    st.session_state["experimental_data"] = clean
                    st.session_state.pop("experimental_data_editor", None)
                    st.session_state["last_imported_file"] = upload_id
                    st.success("Dados CSV importados.")
                else:
                    st.error(
                        "O CSV precisa das colunas Vm e RTm (ou seus nomes equivalentes) e ao menos uma linha válida."
                    )
            except (UnicodeDecodeError, pd.errors.ParserError, ValueError) as exc:
                st.error(f"Não foi possível ler o CSV: {exc}")

    df = normalize_experimental_data(st.session_state.get("experimental_data"))
    edited = st.data_editor(
        df,
        num_rows="dynamic",
        width="stretch",
        hide_index=True,
        key="experimental_data_editor",
        column_config={
            "Vm (m/s)": st.column_config.NumberColumn(
                "Velocidade do modelo Vm (m/s)",
                min_value=0.0,
                step=0.001,
                format="%.4f",
            ),
            "RTm (N)": st.column_config.NumberColumn(
                "Resistência total medida RTm (N)",
                min_value=0.0,
                step=0.01,
                format="%.4f",
            ),
        },
    )
    st.session_state["experimental_data"] = normalize_experimental_data(edited)
    if st.button(
        "Calcular e ver resultados",
        type="primary",
        width="stretch",
        key="calculate_results",
    ):
        if _calculate():
            render_results(summary_only=True)


def render_results(summary_only: bool = False) -> None:
    if not summary_only:
        st.title("Resultados")
    results = _result_or_notice()
    if results is None:
        return
    geometry = st.session_state["geometry"] or {}
    top = st.columns(4)
    with top[0]:
        _metric("Lp", geometry["Lp"], "m")
    with top[1]:
        _metric("Sp", geometry["Sp"], "m²")
    with top[2]:
        _metric("Fn mínimo", results["Fr"].min(), "", 4)
    with top[3]:
        _metric("Fn máximo", results["Fr"].max(), "", 4)
    bottom = st.columns(4)
    with bottom[0]:
        _metric("Vp máxima", results["Vp"].max(), "m/s")
    with bottom[1]:
        _metric("R máxima · Froude", results["RT_Froude_kN"].max(), "kN")
    with bottom[2]:
        _metric("R máxima · Hughes", results["RT_Hughes_kN"].max(), "kN")
    with bottom[3]:
        _metric("P máxima · Froude", results["PE_Froude_kW"].max(), "kW")

    _show_warning_coefficients(results)
    if not summary_only:
        st.subheader("Tabela final")
        st.dataframe(_formatted_dataframe(results), width="stretch", hide_index=True)
        c1, c2 = st.columns(2)
        with c1:
            st.download_button(
                "Baixar resultados em CSV",
                data=results_to_csv(results),
                file_name="hydroscale_resultados.csv",
                mime="text/csv",
                width="stretch",
            )
        with c2:
            st.download_button(
                "Baixar resultados em XLSX",
                data=results_to_xlsx(results, st.session_state["inputs"]),
                file_name="hydroscale_resultados.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                width="stretch",
            )


def render_comparison() -> None:
    st.title("Comparação Froude × Hughes")
    results = _result_or_notice()
    if results is None:
        return
    comparison = results[["Ensaio", "Fr", "RT_Froude_kN", "RT_Hughes_kN", "DeltaR_N", "DeltaR_percent", "PE_Froude_kW", "PE_Hughes_kW", "DeltaP_W", "DeltaP_percent"]]
    st.dataframe(_formatted_dataframe(comparison), width="stretch", hide_index=True)
    c1, c2 = st.columns(2)
    with c1:
        _metric("Maior diferença de resistência", comparison["DeltaR_percent"].abs().max(), "%")
    with c2:
        _metric("Maior diferença de potência", comparison["DeltaP_percent"].abs().max(), "%")
    st.caption("Δ = resultado Froude − resultado Hughes. Percentuais usam Froude como referência.")


def _comparison_figure(
    x: pd.Series, froude: pd.Series, hughes: pd.Series, title: str, x_label: str, y_label: str
) -> go.Figure:
    figure = go.Figure()
    figure.add_trace(go.Scatter(x=x, y=froude, mode="lines+markers", name="Froude"))
    figure.add_trace(go.Scatter(x=x, y=hughes, mode="lines+markers", name="Hughes"))
    figure.update_layout(
        title=title,
        xaxis_title=x_label,
        yaxis_title=y_label,
        template="plotly_white",
        hovermode="x unified",
        legend_title_text="Método",
    )
    return figure


def render_charts() -> None:
    st.title("Gráficos")
    results = _result_or_notice()
    if results is None:
        return
    df = results.sort_values("Fr").copy()
    st.plotly_chart(
        _comparison_figure(
            df["Fr"], df["RT_Froude_kN"], df["RT_Hughes_kN"],
            "Comparação da resistência total",
            "Número de Froude (Fn)",
            "Resistência total do protótipo (kN)",
        ),
        width="stretch",
    )
    power_unit = st.radio("Unidade de potência", ["MW", "kW"], horizontal=True)
    if power_unit == "MW":
        froude_power = df["PE_Froude_MW"]
        hughes_power = df["PE_Hughes_MW"]
    else:
        froude_power = df["PE_Froude_kW"]
        hughes_power = df["PE_Hughes_kW"]
    st.plotly_chart(
        _comparison_figure(
            df["Fr"], froude_power, hughes_power,
            "Potência efetiva × número de Froude", "Número de Froude (Fn)", f"Potência efetiva ({power_unit})",
        ),
        width="stretch",
    )
    speed_unit = st.radio("Unidade de velocidade do protótipo", ["m/s", "nós"], horizontal=True)
    speed_column = "Vp" if speed_unit == "m/s" else "Vp nós"
    st.plotly_chart(
        _comparison_figure(
            df[speed_column], df["RT_Froude_kN"], df["RT_Hughes_kN"],
            "Resistência total × velocidade do protótipo", f"Vp ({speed_unit})", "Resistência total (kN)",
        ),
        width="stretch",
    )
    st.plotly_chart(
        _comparison_figure(
            df[speed_column], froude_power, hughes_power,
            "Potência efetiva × velocidade do protótipo", f"Vp ({speed_unit})", f"Potência efetiva ({power_unit})",
        ),
        width="stretch",
    )


def render_memory() -> None:
    st.title("Memória de cálculo")
    results = _result_or_notice()
    if results is None:
        return
    inputs = st.session_state["inputs"]
    selected = st.selectbox("Selecione o ensaio", results["Ensaio"].tolist())
    row = results.loc[results["Ensaio"] == selected].iloc[0]
    st.caption(f"Caso: {inputs['case_name']} · valores internos sem arredondamento")

    with st.container(border=True):
        st.subheader("Semelhança geométrica e cinemática")
        st.latex(r"L_p = \lambda L_m \qquad ; \qquad S_p = \lambda^2 S_m")
        st.write(
            f"Lp = {format_br(inputs['lambda'])} × {format_br(inputs['Lm'])} = {format_br(st.session_state['geometry']['Lp'])} m"
        )
        st.write(
            f"Sp = {format_br(inputs['lambda'])}² × {format_br(inputs['Sm'])} = {format_br(st.session_state['geometry']['Sp'])} m²"
        )
        st.latex(r"Fr = \frac{V_m}{\sqrt{gL_m}} \qquad ; \qquad V_p = V_m\sqrt{\lambda}")
        st.write(f"Fr = {format_br(row.Fr, 6)} · Vp = {format_br(row.Vp, 6)} m/s ({format_br(row['Vp nós'], 3)} nós)")

    with st.container(border=True):
        st.subheader("Reynolds e linha de atrito ITTC-1957")
        st.latex(r"Re = \frac{VL}{\nu} \qquad ; \qquad C_f = \frac{0.075}{(\log_{10}Re - 2)^2}")
        st.write(f"Re_m = {format_br(row.Re_m, 5, scientific=True)} · Re_p = {format_br(row.Re_p, 5, scientific=True)}")
        st.write(f"Cf_m = {format_br(row.Cf_m, 8)} · Cf_p = {format_br(row.Cf_p, 8)}")

    with st.container(border=True):
        st.subheader("Coeficiente total do modelo")
        st.latex(r"C_{t,m} = \frac{RT_m}{0.5\rho_mS_mV_m^2}")
        st.write(f"Ct_m = {format_br(row.Ct_m, 8)}")

    with st.container(border=True):
        st.subheader("Método de Froude")
        st.latex(r"C_{r,m}=C_{t,m}-C_{f,m};\quad C_{r,p}=C_{r,m};\quad C_{t,p}=C_{f,p}+C_{r,p}")
        st.write(f"Cr = {format_br(row.Cr, 8)} · Ct,p,Froude = {format_br(row.Ct_p_Froude, 8)}")
        st.write(f"RT,p,Froude = {format_br(row.RT_Froude_kN, 5)} kN · PE = {format_br(row.PE_Froude_kW, 5)} kW")

    with st.container(border=True):
        st.subheader("Método de Hughes")
        st.latex(r"C_{v,m}=(1+k)C_{f,m};\quad C_{w,m}=C_{t,m}-C_{v,m};\quad C_{t,p}=C_{v,p}+C_{w,p}")
        st.write(f"Cv,m = {format_br(row.Cv_m, 8)} · Cw = {format_br(row.Cw, 8)} · Ct,p,Hughes = {format_br(row.Ct_p_Hughes, 8)}")
        st.write(f"RT,p,Hughes = {format_br(row.RT_Hughes_kN, 5)} kN · PE = {format_br(row.PE_Hughes_kW, 5)} kW")


def render_validation() -> None:
    st.title("Validação do exercício do professor")
    st.write("Caso de referência com Lm = 4,3 m, escala 30 e um ensaio a 1,5 m/s.")
    st.button(
        "Carregar exercício de referência",
        type="primary",
        on_click=load_reference,
        key="validation_reference",
    )
    results = _result_or_notice()
    if results is None:
        return
    if st.session_state["selected_case"] != "Exercício de referência":
        st.info("Carregue o exercício de referência para confrontar os valores publicados.")
        return
    row = results.iloc[0]
    comparison = pd.DataFrame(
        {
            "Grandeza": ["Vp", "RT Froude", "PE Froude", "RT Hughes", "PE Hughes"],
            "HydroScale": [
                f"{format_br(row.Vp)} m/s",
                f"{format_br(row.RT_Froude_kN)} kN",
                f"{format_br(row.PE_Froude_kW)} kW",
                f"{format_br(row.RT_Hughes_kN)} kN",
                f"{format_br(row.PE_Hughes_kW)} kW",
            ],
            "Referência aproximada": ["8,22 m/s", "292 kN", "2.400 kW", "261 kN", "2.147 kW"],
        }
    )
    st.dataframe(comparison, width="stretch", hide_index=True)
    st.info("Pequenas diferenças em relação à resolução manual podem ocorrer por arredondamentos intermediários.")


def render_case_study() -> None:
    st.title("Estudo de caso · Duisburg Test Case (DTC)")
    st.write("Conjunto de seis ensaios carregado de `data/dtc.csv`, com valores de reserva no código.")
    st.button(
        "Carregar estudo de caso DTC",
        type="primary",
        on_click=load_dtc,
        key="case_dtc",
    )
    if st.session_state["selected_case"] == "Duisburg Test Case - DTC":
        st.dataframe(st.session_state["experimental_data"], width="stretch", hide_index=True)
        if st.button("Calcular DTC", width="stretch"):
            if st.session_state["inputs"] is None:
                st.session_state["inputs"] = DTC_INPUTS.copy()
            _calculate(st.session_state["inputs"])
            render_results(summary_only=True)


def main() -> None:
    _initial_state()
    st.markdown(
        """
        <style>
        .stApp { background: #F7F9FC; color: #0F172A; }
        .stApp h1, .stApp h2, .stApp h3 { color: #0F3D66; }
        .stApp p, .stApp li, .stApp label, .stApp [data-testid="stCaptionContainer"] { color: #0F172A; }
        [data-testid="stMetric"] { background: #FFFFFF; border: 1px solid #DCE3EA; border-radius: 0.6rem; padding: 0.75rem; }
        [data-testid="stSidebar"] { background: #111827; }
        [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3,
        [data-testid="stSidebar"] p, [data-testid="stSidebar"] label,
        [data-testid="stSidebar"] [data-testid="stCaptionContainer"],
        [data-testid="stSidebar"] [data-testid="stSidebarNav"] a { color: #E5E7EB !important; }
        .stButton > button { background: #FFFFFF; border-color: #DCE3EA; color: #0F3D66 !important; }
        .stButton > button p { color: #0F3D66 !important; }
        .stButton > button[kind="primary"] { background: #0EA5E9; border-color: #0EA5E9; color: #FFFFFF !important; }
        .stButton > button[kind="primary"] p { color: #FFFFFF !important; }
        [data-testid="stSidebar"] .stButton > button { border-color: #475569; color: #E5E7EB !important; background: #1F2937; }
        [data-testid="stSidebar"] .stButton > button p { color: #E5E7EB !important; }
        </style>
        """,
        unsafe_allow_html=True,
    )
    renderers: dict[str, Callable[[], None]] = {
        "Início": render_home,
        "Características": render_characteristics,
        "Dados experimentais": render_experimental_data,
        "Resultados": render_results,
        "Comparação": render_comparison,
        "Gráficos": render_charts,
        "Memória de cálculo": render_memory,
        "Validação": render_validation,
        "Estudo de caso": render_case_study,
    }
    with st.sidebar:
        st.title("⚓ HydroScale")
        st.caption("Extrapolação modelo–protótipo")
        st.divider()
        st.button("Novo cálculo", width="stretch", on_click=start_new_calculation, key="sidebar_new")
        st.button(
            "Exercício de referência",
            width="stretch",
            on_click=load_reference,
            key="sidebar_reference",
        )
        st.button("DTC", width="stretch", on_click=load_dtc, key="sidebar_dtc")
        st.divider()
        st.caption(f"Caso ativo: {st.session_state['selected_case']}")

    # Streamlit moderno recebe navegação multipágina nativa; o fallback mantém
    # a experiência em instalações mais antigas sem dependências extras.
    if hasattr(st, "navigation") and hasattr(st, "Page"):
        page_objects = {
            "Início": st.Page(render_home, title="Início", icon="🏠", default=True),
            "Características": st.Page(render_characteristics, title="Características", icon="⚙️"),
            "Dados experimentais": st.Page(render_experimental_data, title="Dados experimentais", icon="📋"),
            "Resultados": st.Page(render_results, title="Resultados", icon="📊"),
            "Comparação": st.Page(render_comparison, title="Comparação", icon="⚖️"),
            "Gráficos": st.Page(render_charts, title="Gráficos", icon="📈"),
            "Memória de cálculo": st.Page(render_memory, title="Memória de cálculo", icon="🧮"),
            "Validação": st.Page(render_validation, title="Validação", icon="✅"),
            "Estudo de caso": st.Page(render_case_study, title="Estudo de caso", icon="⚓"),
        }
        selected_page = st.navigation(list(page_objects.values()), position="sidebar")
        requested_page = st.session_state.pop("requested_page", None)
        if requested_page in page_objects:
            st.switch_page(page_objects[requested_page])
        _show_messages()
        selected_page.run()
        return

    if "requested_page" in st.session_state:
        st.session_state["navigation"] = st.session_state.pop("requested_page")
    with st.sidebar:
        page = st.radio("Menu", NAVIGATION, key="navigation")
    _show_messages()
    renderers[page]()


if __name__ == "__main__":
    main()
