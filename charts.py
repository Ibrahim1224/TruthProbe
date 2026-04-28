"""
charts.py — All Plotly and Matplotlib visualisation helpers.

Every function returns a figure object ready for st.plotly_chart() or
st.pyplot(). Colour palettes are consistent across charts.
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import matplotlib.pyplot as plt
import matplotlib

matplotlib.rcParams.update({"figure.facecolor": "#0e1117", "axes.facecolor": "#0e1117"})

# ── Colour palette ──────────────────────────────────────────────────────────
PALETTE = [
    "#667eea", "#764ba2", "#e84393", "#00b894",
    "#fdcb6e", "#e17055", "#0984e3", "#6c5ce7",
]


def response_length_bar(df: pd.DataFrame) -> go.Figure:
    """Plotly bar chart — response word-count by demographic."""
    fig = go.Figure(
        go.Bar(
            x=df["demographic"],
            y=df["response_length"],
            marker_color=PALETTE[: len(df)],
            text=df["response_length"],
            textposition="outside",
            textfont=dict(size=13, color="#fff"),
        )
    )
    fig.update_layout(
        title=dict(text="Response Length by Demographic", font=dict(size=18, color="#fff")),
        xaxis=dict(title="", tickfont=dict(color="#b8b8d0", size=11)),
        yaxis=dict(title="Word Count", title_font=dict(color="#b8b8d0"), tickfont=dict(color="#b8b8d0")),
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        margin=dict(t=60, b=80),
        height=420,
    )
    return fig


def sentiment_bar(df: pd.DataFrame) -> go.Figure:
    """Plotly bar chart — sentiment polarity by demographic."""
    colors = ["#38ef7d" if s > 0.1 else "#ff416c" if s < -0.1 else "#fdcb6e" for s in df["sentiment"]]
    fig = go.Figure(
        go.Bar(
            x=df["demographic"],
            y=df["sentiment"],
            marker_color=colors,
            text=df["sentiment"].round(3),
            textposition="outside",
            textfont=dict(size=13, color="#fff"),
        )
    )
    fig.update_layout(
        title=dict(text="Sentiment Score by Demographic", font=dict(size=18, color="#fff")),
        xaxis=dict(title="", tickfont=dict(color="#b8b8d0", size=11)),
        yaxis=dict(title="Polarity (−1 to +1)", title_font=dict(color="#b8b8d0"), tickfont=dict(color="#b8b8d0")),
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        margin=dict(t=60, b=80),
        height=420,
    )
    return fig


def encouragement_discouragement_bar(df: pd.DataFrame) -> go.Figure:
    """Grouped bar — encouragement vs discouragement counts per demographic."""
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            name="Encouragement",
            x=df["demographic"],
            y=df["encouragement"],
            marker_color="#38ef7d",
            text=df["encouragement"],
            textposition="outside",
            textfont=dict(color="#fff"),
        )
    )
    fig.add_trace(
        go.Bar(
            name="Discouragement",
            x=df["demographic"],
            y=df["discouragement"],
            marker_color="#ff416c",
            text=df["discouragement"],
            textposition="outside",
            textfont=dict(color="#fff"),
        )
    )
    fig.update_layout(
        barmode="group",
        title=dict(text="Encouragement vs Discouragement", font=dict(size=18, color="#fff")),
        xaxis=dict(title="", tickfont=dict(color="#b8b8d0", size=11)),
        yaxis=dict(title="Keyword Count", title_font=dict(color="#b8b8d0"), tickfont=dict(color="#b8b8d0")),
        legend=dict(font=dict(color="#b8b8d0"), bgcolor="rgba(0,0,0,0)"),
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        margin=dict(t=60, b=80),
        height=420,
    )
    return fig


def metrics_heatmap(df: pd.DataFrame) -> plt.Figure:
    """Matplotlib heatmap — all numeric metrics across demographics."""
    metrics_cols = ["response_length", "sentiment", "encouragement", "discouragement"]
    data = df.set_index("demographic")[metrics_cols].copy()

    # Normalize each column to 0-1 for colour mapping
    normed = (data - data.min()) / (data.max() - data.min() + 1e-9)

    fig, ax = plt.subplots(figsize=(8, max(3.5, 0.8 * len(data))))
    im = ax.imshow(normed.values, aspect="auto", cmap="RdYlGn", vmin=0, vmax=1)

    ax.set_xticks(range(len(metrics_cols)))
    ax.set_xticklabels(
        ["Response\nLength", "Sentiment", "Encourage-\nment", "Discourage-\nment"],
        fontsize=10, color="#b8b8d0",
    )
    ax.set_yticks(range(len(data)))
    ax.set_yticklabels(data.index, fontsize=10, color="#b8b8d0")

    # Annotate cells with raw values
    for i in range(len(data)):
        for j in range(len(metrics_cols)):
            val = data.iloc[i, j]
            txt = f"{val:.2f}" if isinstance(val, float) else str(val)
            ax.text(j, i, txt, ha="center", va="center", fontsize=10, fontweight="bold",
                    color="#000" if normed.iloc[i, j] > 0.5 else "#fff")

    ax.set_title("Metrics Heatmap — All Groups", fontsize=14, fontweight="bold",
                 color="#fff", pad=14)
    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.04)
    cbar.ax.tick_params(colors="#b8b8d0")
    fig.tight_layout()
    return fig


def fairness_gauge(score: float, label: str) -> go.Figure:
    """Single gauge chart for a fairness score (0-10)."""
    if score >= 8:
        bar_color = "#38ef7d"
    elif score >= 6:
        bar_color = "#fdcb6e"
    else:
        bar_color = "#ff416c"

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=score,
            title=dict(text=label, font=dict(size=14, color="#b8b8d0")),
            number=dict(font=dict(size=28, color="#fff")),
            gauge=dict(
                axis=dict(range=[0, 10], tickfont=dict(color="#b8b8d0")),
                bar=dict(color=bar_color),
                bgcolor="#1e1e2f",
                borderwidth=0,
                steps=[
                    dict(range=[0, 4], color="rgba(255,65,108,0.15)"),
                    dict(range=[4, 7], color="rgba(253,203,110,0.15)"),
                    dict(range=[7, 10], color="rgba(56,239,125,0.15)"),
                ],
            ),
        )
    )
    fig.update_layout(
        paper_bgcolor="#0e1117",
        height=220,
        margin=dict(t=50, b=20, l=30, r=30),
    )
    return fig


def overall_verdict_gauge(score: float) -> go.Figure:
    """Large gauge for the overall fairness verdict."""
    if score >= 8:
        color = "#38ef7d"
    elif score >= 6:
        color = "#fdcb6e"
    else:
        color = "#ff416c"

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number+delta",
            value=score,
            title=dict(text="Overall Fairness Score", font=dict(size=20, color="#fff")),
            number=dict(font=dict(size=48, color="#fff"), suffix="/10"),
            gauge=dict(
                axis=dict(range=[0, 10], tickfont=dict(color="#b8b8d0", size=12)),
                bar=dict(color=color, thickness=0.7),
                bgcolor="#1e1e2f",
                borderwidth=0,
                steps=[
                    dict(range=[0, 4], color="rgba(255,65,108,0.18)"),
                    dict(range=[4, 7], color="rgba(253,203,110,0.18)"),
                    dict(range=[7, 10], color="rgba(56,239,125,0.18)"),
                ],
                threshold=dict(line=dict(color="#fff", width=2), thickness=0.8, value=score),
            ),
        )
    )
    fig.update_layout(
        paper_bgcolor="#0e1117",
        height=300,
        margin=dict(t=80, b=30),
    )
    return fig
