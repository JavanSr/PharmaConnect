import argparse
import json
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

from pypdf import PdfReader


PDF_URL = "https://www.moh.go.tz/storage/app/uploads/public/663/c8f/ceb/663c8fceb418d132695047.pdf"
START_PAGE = 38
END_PAGE = 64

DOSAGE_KEYWORDS = [
    "Powder for solution for injection/infusion",
    "Solution for injection/infusion",
    "Powder for Injection/Infusion",
    "Powder for Solution for Injection",
    "Solution for IV infusion",
    "Solution for infusion",
    "Liquid for inhalation",
    "Dispersible tablet",
    "Powder for suspension",
    "Powder for reconstitution",
    "Powder for injecti on",
    "Powder for injection",
    "Concentrate for infusion",
    "Parenteral solution",
    "Fresh frozen plasma",
    "Whole blood",
    "Rectal capsules",
    "Eye ointment",
    "Ear drops",
    "Nasal drops",
    "Nasal spray",
    "Oral liquid",
    "Oral solution",
    "Oral gel",
    "Vaginal cream",
    "Vaginal Pessaries",
    "Nebulizer solution",
    "Aerosol Inhalation",
    "Sublingual Tablets",
    "Tablet/Capsule",
    "Suppositories/ointment",
    "Suppositories",
    "Suppository",
    "Injection",
    "Tablets",
    "Tablet",
    "Capsules",
    "Capsule",
    "Suspension",
    "Syrup",
    "Drops",
    "Drop",
    "Ointment",
    "Cream",
    "Gel",
    "Spray",
    "Aerosol",
    "Nebulizer",
    "Inhalation",
    "Inhaler",
    "Liquid",
    "Solution",
    "Emulsion",
    "Granules",
    "Implant",
    "Patches",
    "Patch",
    "Pessaries",
    "Lotion",
    "Cylinder",
    "Bags",
    "Bottle",
    "Vial",
    "Infusion",
    "Sachet",
    "Powder",
    "Lozenges",
    "Sublingual",
]

DOSAGE_KEYWORDS_SORTED = sorted(DOSAGE_KEYWORDS, key=len, reverse=True)

FORM_NORMALIZATION = {
    "Tablets": "Tablet",
    "Capsules": "Capsule",
    "Rectal capsules": "Rectal capsule",
    "Drops": "Drops",
    "Ear drops": "Ear drops",
    "Nasal drops": "Nasal drops",
    "Nasal spray": "Nasal spray",
    "Eye ointment": "Eye ointment",
    "Powder for injecti on": "Powder for injection",
}

ROUTE_MAP = {
    "Injection": "Injection",
    "Powder for injection": "Injection",
    "Powder for Injection/Infusion": "Injection",
    "Powder for Solution for Injection": "Injection",
    "Powder for solution for injection/infusion": "Injection",
    "Solution for injection/infusion": "Injection",
    "Solution for infusion": "Injection",
    "Solution for IV infusion": "Injection",
    "Concentrate for infusion": "Injection",
    "Infusion": "Injection",
    "Tablet": "Oral",
    "Capsule": "Oral",
    "Tablet/Capsule": "Oral",
    "Dispersible tablet": "Oral",
    "Oral liquid": "Oral",
    "Oral solution": "Oral",
    "Suspension": "Oral",
    "Syrup": "Oral",
    "Oral gel": "Oral",
    "Sachet": "Oral",
    "Granules": "Oral",
    "Rectal capsule": "Rectal",
    "Suppositories": "Rectal",
    "Suppository": "Rectal",
    "Vaginal cream": "Vaginal",
    "Pessaries": "Vaginal",
    "Vaginal Pessaries": "Vaginal",
    "Cream": "Topical",
    "Ointment": "Topical",
    "Gel": "Topical",
    "Lotion": "Topical",
    "Drops": None,
    "Ear drops": "Otic",
    "Nasal drops": "Nasal",
    "Nasal spray": "Nasal",
    "Eye ointment": "Ophthalmic",
    "Aerosol Inhalation": "Inhalation",
    "Aerosol": "Inhalation",
    "Nebulizer solution": "Inhalation",
    "Nebulizer": "Inhalation",
    "Inhalation": "Inhalation",
    "Inhaler": "Inhalation",
    "Liquid for inhalation": "Inhalation",
    "Implant": "Implant",
    "Patch": "Transdermal",
    "Patches": "Transdermal",
}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def download_pdf(url: str) -> Path:
    local_candidates = [
        Path.cwd() / "tmp_nemlit_2021.pdf",
        Path(__file__).resolve().parents[2] / "tmp_nemlit_2021.pdf",
    ]
    for candidate in local_candidates:
        if candidate.exists():
            return candidate

    tmpdir = Path(tempfile.gettempdir())
    target = tmpdir / "pharmaconnect_nemlit_2021.pdf"
    if not target.exists():
        urllib.request.urlretrieve(url, target)
    return target


def is_section_heading(line: str) -> bool:
    return bool(re.match(r"^(\d+\.)+(\d+)?\s", line))


def extract_level(line: str):
    if line in {"A", "B", "C", "D", "S"}:
        return line, ""

    match = re.search(r"\b([ABCDS])\b(.*)$", line)
    if not match:
        return None

    prefix = normalize_spaces(line[: match.start()])
    suffix = normalize_spaces(match.group(2))
    if not prefix:
      return None
    remainder = prefix if not suffix else f"{prefix} {suffix}"
    return match.group(1), remainder


def strip_section_prefix(row_text: str, section_heading: str | None) -> str:
    if not section_heading:
        return row_text

    heading_tail = re.sub(r"^(\d+\.)+(\d+)?\s*", "", section_heading).strip()
    if heading_tail and row_text.startswith(heading_tail):
        return normalize_spaces(row_text[len(heading_tail) :])
    return row_text


def split_name_and_variant(text: str):
    clean = normalize_spaces(text.replace("Recto caps", "Rectal capsules"))
    best_match = None
    for keyword in DOSAGE_KEYWORDS_SORTED:
        idx = clean.lower().find(keyword.lower())
        if idx > 0 and (best_match is None or idx < best_match[0]):
            best_match = (idx, keyword)

    if best_match is None:
        return clean, ""

    name = clean[: best_match[0]].strip(" ;:-")
    variant = clean[best_match[0] :].strip(" ;")
    return name, variant


def split_variants(variant_text: str):
    cleaned = normalize_spaces(variant_text)
    if not cleaned:
        return [""]

    primary_parts = [part.strip(" ;") for part in re.split(r"\s*;\s*", cleaned) if part.strip(" ;")]
    variants = []
    current = ""
    for part in primary_parts:
        starts_new = any(
            part.lower().startswith(keyword.lower()) or f" {keyword.lower()}" in part.lower()
            for keyword in DOSAGE_KEYWORDS_SORTED
        )
        if starts_new and current and any(keyword.lower() in current.lower() for keyword in DOSAGE_KEYWORDS_SORTED):
            variants.append(normalize_spaces(current))
            current = part
        else:
            current = part if not current else f"{current}; {part}"

    if current:
        variants.append(normalize_spaces(current))

    exploded = []
    for variant in variants:
        subparts = [part.strip(" ;") for part in re.split(r"\s+AND\s+", variant) if part.strip(" ;")]
        exploded.extend(subparts)

    return exploded or [cleaned]


def normalize_form(variant: str) -> str:
    normalized_variant = normalize_spaces(variant)
    for keyword in DOSAGE_KEYWORDS_SORTED:
        if normalized_variant.lower().startswith(keyword.lower()) or f" {keyword.lower()}" in normalized_variant.lower():
            return FORM_NORMALIZATION.get(keyword, keyword)
    return "Other"


def derive_strength_text(variant: str, form: str) -> str:
    cleaned = normalize_spaces(variant)
    if not cleaned:
        return ""

    pattern = re.compile(rf"^{re.escape(form)}\b", re.IGNORECASE)
    stripped = normalize_spaces(pattern.sub("", cleaned, count=1))
    if stripped:
        return stripped

    for keyword in DOSAGE_KEYWORDS_SORTED:
        pattern = re.compile(rf"^{re.escape(keyword)}\b", re.IGNORECASE)
        stripped = normalize_spaces(pattern.sub("", cleaned, count=1))
        if stripped != cleaned:
            return stripped

    return cleaned


def clean_generic_name(name: str) -> str:
    generic = normalize_spaces(name)
    generic = re.sub(r"\s+\d.*$", "", generic)
    generic = generic.strip(" ;:-")
    return generic


def build_aliases(name: str):
    aliases = {name}
    if "+" in name:
        aliases.add(re.sub(r"\s*\+\s*", " + ", name).strip())
        aliases.add(re.sub(r"\s*\+\s*", "+", name).strip())
    return [alias for alias in sorted(aliases) if alias]


def split_combination_ingredients(name: str):
    parts = [normalize_spaces(part.strip(" ;,:-")) for part in re.split(r"\s*\+\s*", name) if part.strip(" ;,:-")]
    return parts or [name]


def split_combination_strengths(strength_text: str, ingredient_count: int):
    cleaned = normalize_spaces(strength_text)
    if ingredient_count <= 1:
        return [cleaned.upper() or None]

    if "+" not in cleaned:
        return [None] * ingredient_count

    parts = [normalize_spaces(part.strip(" ;,")) for part in re.split(r"\s*\+\s*", cleaned) if part.strip(" ;,")]
    if len(parts) != ingredient_count:
        return [None] * ingredient_count

    return [part.upper() or None for part in parts]


def format_product_name(generic_name: str, form: str, strength_text: str) -> str:
    parts = [generic_name.upper(), form.upper()]
    if strength_text:
        parts.append(strength_text.upper())
    return normalize_spaces(" ".join(parts))


def build_rows(pdf_path: Path):
    reader = PdfReader(str(pdf_path))
    rows = []
    current_category = None
    buffer = []

    for page_number in range(START_PAGE, END_PAGE + 1):
        text = reader.pages[page_number - 1].extract_text() or ""
        for raw_line in text.splitlines():
            line = normalize_spaces(raw_line)
            if not line:
                continue
            if line.startswith("The National Essential Medicines List"):
                continue
            if line == "Name of drug Dosage forms and Strengths Level":
                continue
            if re.fullmatch(r"\d+", line):
                continue
            if is_section_heading(line):
                if buffer:
                    buffer = []
                current_category = line
                continue

            level_info = extract_level(line)
            if level_info and line in {"A", "B", "C", "D", "S"}:
                if buffer:
                    rows.append((current_category, normalize_spaces(" ".join(buffer)), level_info[0]))
                    buffer = []
                continue

            if level_info and level_info[1] and buffer:
                buffer.append(level_info[1])
                rows.append((current_category, normalize_spaces(" ".join(buffer)), level_info[0]))
                buffer = []
                continue

            if level_info and level_info[1] and not buffer:
                rows.append((current_category, level_info[1], level_info[0]))
                continue

            buffer.append(line)

    return rows


def parse_records(pdf_path: Path):
    rows = build_rows(pdf_path)
    category_name = None
    last_generic_name = None
    records = []

    for section_heading, row_text, level in rows:
        category_name = re.sub(r"^(\d+\.)+(\d+)?\s*", "", section_heading or "").strip()
        clean_text = strip_section_prefix(row_text, section_heading)
        name, variant_text = split_name_and_variant(clean_text)
        name = normalize_spaces(name)
        variant_text = normalize_spaces(variant_text)

        continuation = bool(re.match(r"^\d", name)) or not variant_text
        if continuation and last_generic_name:
            variant_text = normalize_spaces(f"{name} {variant_text}")
            name = last_generic_name
        else:
            name = clean_generic_name(name)
            if name:
                last_generic_name = name

        if not name:
            continue

        for variant in split_variants(variant_text):
            form = normalize_form(variant)
            strength_text = derive_strength_text(variant, form)
            route_name = ROUTE_MAP.get(form)
            product_name = format_product_name(name, form, strength_text or variant)
            ingredient_names = split_combination_ingredients(name)
            ingredient_strengths = split_combination_strengths(strength_text or "", len(ingredient_names))

            records.append(
                {
                    "productName": product_name,
                    "genericName": name,
                    "therapeuticClassName": category_name or "NEMLIT medicine",
                    "category": section_heading or category_name or "NEMLIT medicine",
                    "dosageFormName": form,
                    "routeName": route_name,
                    "strengthText": (strength_text or variant or form).upper(),
                    "packSizeLabel": "NEMLIT",
                    "sourceUrl": PDF_URL,
                    "sourceNotes": f"NEMLIT 2021 listing at level {level}.",
                    "reviewNotes": f"Imported from NEMLIT 2021 at level {level}; TMDA registration metadata still needs verification.",
                    "aliases": build_aliases(name),
                    "ingredients": [
                        {
                            "name": ingredient_name,
                            "strengthText": ingredient_strengths[index],
                        }
                        for index, ingredient_name in enumerate(ingredient_names)
                    ],
                }
            )

    deduped = []
    seen = set()
    for record in records:
        key = (
            record["productName"].lower(),
            record["genericName"].lower(),
            record["strengthText"].lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(record)

    return deduped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-url", default=PDF_URL)
    args = parser.parse_args()

    pdf_path = download_pdf(args.pdf_url)
    records = parse_records(pdf_path)
    json.dump(records, sys.stdout)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="ignore")
    main()
