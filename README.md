# HydroScale

Aplicação acadêmica de Engenharia Naval para extrapolação hidrodinâmica modelo–protótipo pelos métodos de Froude e Hughes. A versão é inteiramente executada em Python + Streamlit, sem dependência de React, Node.js, Vite ou npm.

O código React histórico pode permanecer no repositório em `src/`, `public/` e nos arquivos de configuração JavaScript. O deploy no Streamlit Community Cloud utiliza exclusivamente `streamlit_app.py` e os módulos Python na raiz.

## Objetivo

Transformar resultados de ensaios de resistência de um modelo em estimativas de resistência total e potência efetiva do protótipo. A aplicação preserva os cálculos em precisão integral e arredonda somente a apresentação.

## Funcionalidades

- Entrada das características da embarcação com suporte a vírgula decimal e notação científica.
- Tabela editável de ensaios `Vm` × `RTm` e importação de CSV.
- Extrapolação independente de cada ponto pelos métodos de Froude e Hughes.
- Tabela de resultados, comparação numérica, gráficos Plotly e memória de cálculo.
- Alertas para coeficientes residual ou de ondas negativos.
- Exportação para CSV e Excel (`.xlsx`).
- Caso de validação acadêmica e estudo de caso Duisburg Test Case (DTC).
- Organização pronta para repositório público no GitHub e Streamlit Community Cloud.

## Metodologia

Todas as entradas e saídas internas usam unidades SI: comprimento em m, área em m², velocidade em m/s, resistência em N e potência em W.

### Geometria e semelhança de Froude

```text
Lp = λ Lm
Sp = λ² Sm
Fr = Vm / √(g Lm)
Vp = Vm √λ
```

### Reynolds, ITTC-1957 e coeficiente total

```text
Re_m = Vm Lm / νm
Re_p = Vp Lp / νp
Cf = 0,075 / (log10(Re) - 2)²
Ct_m = RTm / (0,5 ρm Sm Vm²)
```

### Froude

```text
Cr_m = Ct_m - Cf_m
Cr_p = Cr_m
Ct_p = Cf_p + Cr_p
RT_p = 0,5 ρp Sp Vp² Ct_p
PE = RT_p Vp
```

### Hughes

```text
Cv_m = (1 + k) Cf_m
Cw_m = Ct_m - Cv_m
Cw_p = Cw_m
Cv_p = (1 + k) Cf_p
Ct_p = Cv_p + Cw_p
RT_p = 0,5 ρp Sp Vp² Ct_p
PE = RT_p Vp
```

## Instalação e execução local

Crie e ative um ambiente virtual:

```bash
python -m venv .venv
```

No Windows:

```powershell
.venv\Scripts\activate
```

No Linux/macOS:

```bash
source .venv/bin/activate
```

Instale as dependências e abra a aplicação:

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Para executar os testes de desenvolvimento:

```bash
pip install -r requirements-dev.txt
pytest
```

## Estrutura

```text
HydroScale/
├── streamlit_app.py          # Entrada exigida pelo Streamlit
├── hydrodynamics.py          # Motor matemático isolado e testável
├── data.py                   # Presets e fallback DTC
├── utils.py                  # Parsing pt-BR e exportação
├── requirements.txt
├── requirements-dev.txt
├── README.md
├── .gitignore
├── data/
│   └── dtc.csv
├── assets/
│   └── .gitkeep
└── tests/
    └── test_hydrodynamics.py
```

## Validação

O menu **Validação** carrega o exercício de referência com `Lm = 4,3 m`, `Sm = 3,75 m`, `λ = 30`, `k = 0,15`, `Vm = 1,5 m/s` e `RTm = 18 N`. Os resultados esperados, sujeitos às diferenças de arredondamento da resolução manual, são aproximadamente:

- `Vp = 8,22 m/s`
- Froude: `RT = 292 kN`, `PE = 2.400 kW`
- Hughes: `RT = 261 kN`, `PE = 2.147 kW`

## Estudo de caso DTC

O menu **Estudo de caso** carrega o Duisburg Test Case. Os dados estão em `data/dtc.csv`; caso o arquivo não esteja disponível, valores equivalentes embarcados em `data.py` mantêm o aplicativo funcional.

## Publicar no GitHub

1. Crie um repositório vazio chamado `HydroScale` no GitHub.
2. Na pasta do projeto, execute:

   ```bash
   git init
   git add .
   git commit -m "Initial HydroScale Streamlit version"
   git branch -M main
   git remote add origin URL_DO_REPOSITORIO
   git push -u origin main
   ```

3. Confirme que arquivos locais e segredos continuam ignorados pelo `.gitignore`.

## Deploy no Streamlit Community Cloud

1. Acesse o [Streamlit Community Cloud](https://share.streamlit.io/).
2. Escolha o repositório `usuario/HydroScale` e a branch `main`.
3. Defina o arquivo principal como `streamlit_app.py`.
4. Clique em **Deploy**.

O projeto não depende de caminhos absolutos, arquivos externos obrigatórios, chaves, tokens ou segredos. Caso seja necessária uma configuração sigilosa no futuro, use `st.secrets` e nunca a versione.
