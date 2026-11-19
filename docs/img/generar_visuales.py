"""Regenera las figuras públicas del README con Pillow, Matplotlib y rsvg-convert."""

import subprocess
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from matplotlib import get_data_path
from PIL import Image, ImageDraw, ImageFont

OUTPUT = Path(__file__).resolve().parent
PUBLIC = OUTPUT.parents[1] / "app" / "public"
FONTS = Path(get_data_path()) / "fonts" / "ttf"
NAVY = "#0B2532"
INK = "#133744"
TEAL = "#006A63"
MINT = "#70E6CC"
PAPER = "#F2F7F6"
MUTED = "#4B646A"
GRID = "#D4E2E2"


@lru_cache
def font(size, family):
    return ImageFont.truetype(str(FONTS / f"DejaVu{family}.ttf"), size)


def text(draw, point, value, size, color, family="Sans", anchor="lt"):
    draw.text(point, value, font=font(size, family), fill=color, anchor=anchor)


def rule(draw, coords, color, width=2):
    draw.line(coords, fill=color, width=width)


def banner():
    canvas = Image.new("RGB", (1600, 600), NAVY)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((1050, 0, 1599, 599), fill="#103444")
    for column in range(1070, 1600, 48):
        rule(draw, ((column, 0), (column, 600)), "#194252", 1)
    for row in range(24, 600, 48):
        rule(draw, ((1050, row), (1600, row)), "#194252", 1)

    pulse = (
        (1050, 330),
        (1110, 330),
        (1168, 275),
        (1235, 402),
        (1301, 225),
        (1367, 345),
        (1458, 296),
        (1527, 330),
    )
    rule(draw, pulse, "#215565", 25)
    rule(draw, pulse, MINT, 7)
    for cx, cy in (pulse[2], pulse[4], pulse[-1]):
        draw.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), fill=NAVY, outline=MINT, width=4)
    text(draw, (1090, 450), "FLUJO ASISTENCIAL", 23, "#A6C5CA", "SansMono")

    mark = subprocess.check_output(
        [
            "rsvg-convert",
            "--width",
            "80",
            "--height",
            "80",
            str(PUBLIC / "mediflow-mark.svg"),
        ]
    )
    with Image.open(BytesIO(mark)) as loaded:
        canvas.paste(loaded, (75, 57), loaded)
    with Image.open(PUBLIC / "logo-hospital-universidad-del-norte-light.png") as loaded:
        hospital = loaded.crop(loaded.getbbox())
        hospital.thumbnail((265, 85), Image.Resampling.LANCZOS)
        canvas.paste(hospital, (1527 - hospital.width, 56), hospital)

    text(draw, (180, 64), "MediFlow", 43, "#F2FBFA", "Sans-Bold")
    text(draw, (182, 115), "EQUIPO MEDIFLOW / DATA CHALLENGE HUN 2026", 20, MINT, "SansMono")
    text(draw, (75, 211), "Anticipar la demanda.", 70, "#F2FBFA", "Sans-Bold")
    text(draw, (75, 299), "Decidir el turno.", 70, MINT, "Sans-Bold")
    text(draw, (79, 402), "Pronóstico y decisiones al alcance de todo el hospital.", 31, "#C7DEE1")
    rule(draw, ((75, 491), (1527, 491)), "#3F616D")
    for offset, label in [(75, "01  ENTENDER"), (401, "02  PREDECIR"), (727, "03  DECIDIR")]:
        text(draw, (offset, 527), label, 24, "#E0F4F2", "SansMono-Bold")
    canvas.save(OUTPUT / "banner-mediflow.png", optimize=True)


def panel(draw, left, right, number, label, title, subtitle):
    draw.rounded_rectangle((left, 208, right, 768), 26, fill="white", outline=GRID, width=2)
    text(draw, (left + 40, 241), f"{number} / {label}", 23, TEAL, "SansMono-Bold")
    text(draw, (left + 40, 282), title, 43, NAVY, "Sans-Bold")
    text(draw, (left + 40, 343), subtitle, 25, MUTED)


def chart(draw, left, baseline, step, rows, maximum, ticks, decimals):
    chart_width = 560
    for tick in ticks:
        tick_x = left + round(chart_width * tick / maximum)
        for index in range(len(rows)):
            row = baseline + index * step
            rule(draw, ((tick_x, row + 37), (tick_x, row + 75)), GRID)
        text(draw, (tick_x, baseline + 298), f"{tick}%", 23, MUTED, "SansMono", "mt")
    for index, (label, value, color) in enumerate(rows):
        row = baseline + index * step
        text(draw, (left, row), label, 27, INK, "Sans-Bold")
        bar_width = round(chart_width * value / maximum)
        draw.rounded_rectangle((left, row + 42, left + bar_width, row + 68), 7, fill=color)
        text(
            draw,
            (left + bar_width + 15, row + 43),
            f"{value:.{decimals}f}%",
            23,
            INK,
            "SansMono-Bold",
        )


def summary():
    canvas = Image.new("RGB", (1600, 880), PAPER)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1599, 11), fill=TEAL)
    text(draw, (60, 47), "MEDIFLOW / RESULTADOS", 25, TEAL, "SansMono-Bold")
    text(draw, (57, 90), "De anticipar a actuar", 68, NAVY, "Sans-Bold")
    text(
        draw,
        (62, 166),
        "Dos resultados, dos tipos de evidencia: evaluación predictiva y simulación histórica.",
        27,
        MUTED,
    )

    panel(
        draw,
        60,
        786,
        "01",
        "PRONÓSTICO",
        "Escalera de modelos",
        "Error diario (WAPE) · menos es mejor",
    )
    models = [
        ("Línea base", 18.0, "#81999E"),
        ("Poisson estratificado", 15.6, "#4F858C"),
        ("LightGBM final", 10.5, TEAL),
    ]
    chart(draw, 100, 393, 96, models, 20, (0, 5, 10, 15, 20), 1)
    text(draw, (100, 719), "41.6% menos error relativo frente a la base", 25, TEAL, "Sans-Bold")

    panel(
        draw,
        814,
        1540,
        "02",
        "DECISIÓN",
        "Altas antes del mediodía",
        "Hospitalización · porcentaje de horas en rojo",
    )
    scenarios = [
        ("Horario original", 9.32, "#B96648"),
        ("Con el 35% de altas adelantadas", 6.26, TEAL),
    ]
    chart(draw, 854, 393, 96, scenarios, 10, (0, 2, 4, 6, 8, 10), 2)
    draw.rounded_rectangle((854, 600, 1461, 659), 12, fill=PAPER)
    text(draw, (873, 617), "Pico de censo sin cambio: 359 pacientes", 25, INK)
    text(draw, (854, 719), "32.8% menos horas rojas en simulación", 25, TEAL, "Sans-Bold")

    text(draw, (62, 801), "Fuente: Informe Final MediFlow · secciones 4 y 5", 24, MUTED)
    text(draw, (62, 836), "La simulación no mide un efecto clínico observado.", 24, MUTED)
    canvas.save(OUTPUT / "resumen_escalera_optimizacion.png", optimize=True)


if __name__ == "__main__":
    banner()
    summary()
