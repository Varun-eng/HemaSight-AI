"""
Wright-Giemsa style microscopic blood smear image generator.
Python port of microscopicImageGenerator.ts using Pillow.
"""
import math
import random
from PIL import Image, ImageDraw, ImageFont


class MicroscopicImageGenerator:
    def __init__(self, width: int = 512, height: int = 512):
        self.width = width
        self.height = height
        # Seeded RNG for consistent images per CBC
        self._seed = 42

    def _pseudo_random(self):
        self._seed = (self._seed * 9301 + 49297) % 233280
        return self._seed / 233280

    def generate(
        self,
        cbc: dict,
        cell_type: str = "auto",           # "normal" | "leukemic" | "auto"
        magnification: str = "100x",       # "100x" | "400x" | "1000x"
        show_annotations: bool = True,
    ) -> Image.Image:
        """
        Generate a synthetic microscopic blood smear image.

        cbc = {
            "wbc": float, "rbc": float, "hgb": float, "plt": float,
            "anc": float, "blasts": float, "rdw": float,
        }
        """
        # Reset seed based on CBC values for consistency
        self._seed = int(
            (cbc.get("wbc", 7) * 100
             + cbc.get("hgb", 14) * 10
             + cbc.get("plt", 250)) * 1000
        ) % 1000000

        scale = {"100x": 1.0, "400x": 1.4, "1000x": 2.0}.get(magnification, 1.0)

        if cell_type == "auto":
            is_leukemic = cbc.get("blasts", 0) > 1.0 or cbc.get("wbc", 7) > 12.0
        else:
            is_leukemic = cell_type == "leukemic"

        # Create base image (Wright-Giemsa pinkish plasma)
        img = Image.new("RGB", (self.width, self.height), (244, 235, 241))
        draw = ImageDraw.Draw(img, "RGBA")

        # ---- Background noise / texture ----
        noise_count = (self.width * self.height) // 300
        for _ in range(noise_count):
            x = self._pseudo_random() * self.width
            y = self._pseudo_random() * self.height
            color = (
                (220, 200, 210, 50)
                if self._pseudo_random() > 0.5
                else (255, 255, 255, 75)
            )
            draw.rectangle([x, y, x + 2, y + 2], fill=color)

        # ---- 1. Red Blood Cells ----
        rbc_count = cbc.get("rbc", 4.5)
        rbc_density = min(rbc_count / 5.5, 0.8) * (0.6 if scale > 1.5 else 1.0)
        total_rbcs = int(70 * rbc_density)

        for _ in range(total_rbcs):
            cx = self._pseudo_random() * (self.width - 40) + 20
            cy = self._pseudo_random() * (self.height - 40) + 20
            radius = (8 + self._pseudo_random() * 4) * scale

            # Outer membrane
            draw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(220, 80, 80, 210),
                outline=(185, 40, 40, 230),
                width=max(1, int(1.5 * scale)),
            )

            # Central pallor (biconcave center)
            inner = radius * 0.38
            draw.ellipse(
                [cx - inner, cy - inner, cx + inner, cy + inner],
                fill=(248, 185, 185, 240),
            )

        # ---- 2. White Blood Cells ----
        wbc_val = cbc.get("wbc", 7.0)
        wbc_density = min(wbc_val / 15.0, 0.5)
        total_wbcs = max(2, int(8 * wbc_density))

        for _ in range(total_wbcs):
            cx = self._pseudo_random() * (self.width - 80) + 40
            cy = self._pseudo_random() * (self.height - 80) + 40
            radius = (18 + self._pseudo_random() * 10) * scale

            if is_leukemic:
                self._draw_myeloblast(draw, cx, cy, radius, scale, cbc)
            else:
                self._draw_normal_leukocyte(draw, cx, cy, radius, scale)

        # ---- 3. Platelets ----
        plt_count = cbc.get("plt", 250)
        plt_density = min(plt_count / 400, 0.1)
        total_plt = int(35 * plt_density)

        for _ in range(total_plt):
            px = self._pseudo_random() * (self.width - 20) + 10
            py = self._pseudo_random() * (self.height - 20) + 10
            r = 2.2 * scale
            draw.ellipse([px - r, py - r, px + r, py + r], fill=(88, 28, 135, 255))

        # ---- 4. Annotations ----
        if show_annotations and is_leukemic:
            try:
                font = ImageFont.truetype("arial.ttf", 14)
            except Exception:
                font = ImageFont.load_default()

            # Title
            text = "MYELOBLAST (High N:C Ratio)"
            draw.text((20, 15), text, fill=(190, 18, 60), font=font)

            if cbc.get("blasts", 0) > 10:
                text2 = "AUER ROD DETECTED"
                draw.text((20, 35), text2, fill=(190, 18, 60), font=font)

        return img

    def _draw_myeloblast(self, draw, cx, cy, radius, scale, cbc):
        """Draw a leukemic myeloblast cell."""
        # Irregular cell outline
        num_points = 8
        points = []
        for j in range(num_points):
            angle = (j * math.pi * 2) / num_points
            r_var = radius * (0.85 + 0.35 * self._pseudo_random())
            x = cx + r_var * math.cos(angle)
            y = cy + r_var * math.sin(angle)
            points.append((x, y))

        draw.polygon(points, fill=(120, 80, 180, 165),
                     outline=(75, 25, 120, 230))

        # Large nucleus
        nx = cx + (self._pseudo_random() * 4 - 2)
        ny = cy + (self._pseudo_random() * 4 - 2)
        nr = radius * 0.72
        draw.ellipse(
            [nx - nr, ny - nr, nx + nr, ny + nr],
            fill=(59, 7, 100, 255),
        )

        # Nucleoli
        n1 = radius * 0.15
        draw.ellipse(
            [cx - 4 * scale - n1, cy - 4 * scale - n1,
             cx - 4 * scale + n1, cy - 4 * scale + n1],
            fill=(168, 85, 247, 255),
        )
        n2 = radius * 0.12
        draw.ellipse(
            [cx + 5 * scale - n2, cy + 3 * scale - n2,
             cx + 5 * scale + n2, cy + 3 * scale + n2],
            fill=(168, 85, 247, 255),
        )

        # Auer rod
        if cbc.get("blasts", 0) > 10:
            draw.line(
                [cx - 10 * scale, cy + 8 * scale,
                 cx + 8 * scale, cy + 14 * scale],
                fill=(190, 18, 60, 255),
                width=max(1, int(2.5 * scale)),
            )

    def _draw_normal_leukocyte(self, draw, cx, cy, radius, scale):
        """Draw a normal segmented neutrophil / lymphocyte."""
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(147, 100, 200, 128),
            outline=(90, 40, 140, 204),
            width=max(1, int(1.5 * scale)),
        )

        # Multi-lobed nucleus
        for l in range(3):
            lx = cx + (l - 1) * (radius * 0.35)
            ly = cy + (-2 if l % 2 == 0 else 3) * scale
            lr = radius * 0.32
            draw.ellipse(
                [lx - lr, ly - lr, lx + lr, ly + lr],
                fill=(76, 29, 149, 255),
            )


# Singleton for reuse
_generator = MicroscopicImageGenerator()


def generate_microscopic_image(
    cbc: dict,
    cell_type: str = "auto",
    magnification: str = "100x",
    show_annotations: bool = True,
) -> Image.Image:
    """Convenience wrapper."""
    return _generator.generate(cbc, cell_type, magnification, show_annotations)