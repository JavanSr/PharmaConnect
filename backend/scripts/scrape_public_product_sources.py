import argparse
import csv
import json
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

from pypdf import PdfReader


USER_AGENT = "PharmaConnectSourceReview/1.0 (+https://pharmaconnect.local; public source review)"
DEFAULT_TIMEOUT_SECONDS = 30
UMOJA_SOURCE_URL = "https://www.umojapharmaceuticals.co.tz/"


@dataclass
class ScrapedProduct:
    sourceKey: str
    sourceName: str
    sourceUrl: str
    productName: str
    genericName: str | None = None
    category: str | None = None
    sku: str | None = None
    strengthText: str | None = None
    dosageFormName: str | None = None
    packSizeLabel: str | None = None
    unitPriceTzs: str | None = None
    currency: str | None = None
    detailUrl: str | None = None
    rawText: str | None = None
    confidence: str = "NEEDS_REVIEW"
    notes: str | None = None


@dataclass
class SourceRun:
    sourceKey: str
    sourceName: str
    sourceUrl: str
    status: str
    recordCount: int
    notes: str
    errors: list[str]


class AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.anchors: list[dict[str, str]] = []
        self._current_href: str | None = None
        self._current_text: list[str] = []
        self.text_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            attr_map = dict(attrs)
            self._current_href = attr_map.get("href")
            self._current_text = []

    def handle_data(self, data: str) -> None:
        text = normalize_space(data)
        if text:
            self.text_chunks.append(text)
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._current_href is not None:
            text = normalize_space(" ".join(self._current_text))
            if text:
                self.anchors.append({"href": self._current_href, "text": text})
            self._current_href = None
            self._current_text = []


def normalize_space(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def strip_tags(html: str) -> list[str]:
    text = re.sub(r"<(br|/p|/div|/li|/tr|/h[1-6])\b[^>]*>", "\n", html, flags=re.I)
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return [normalize_space(unescape(line)) for line in text.splitlines() if normalize_space(unescape(line))]


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def fetch_binary(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        return response.read()


def absolute_url(base_url: str, href: str | None) -> str | None:
    if not href:
        return None
    return urllib.parse.urljoin(base_url, href)


def parse_price_tzs(value: str) -> str | None:
    match = re.search(r"(?:Tsh|T[Zz][Ss])\s*([0-9][0-9,\.]*)", value, flags=re.I)
    if not match:
        return None
    return match.group(1).replace(",", "")


def infer_strength(value: str) -> str | None:
    matches = re.findall(
        r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|i\.u|%)(?:\s*/\s*\d+(?:\.\d+)?\s*(?:ml|mg|g))?\b",
        value,
        flags=re.I,
    )
    return " + ".join(matches) if matches else None


def infer_dosage_form(value: str) -> str | None:
    candidates = [
        "Powder for suspension",
        "Powder for injection",
        "Dry powder for injection",
        "Suspension",
        "Injection",
        "Capsules",
        "Capsule",
        "Tablets",
        "Tablet",
        "Syrup",
        "Cream",
        "Ointment",
        "Drops",
        "Gel",
        "Solution",
        "Inhaler",
        "Spray",
        "Lotion",
    ]
    lower = value.lower()
    for candidate in candidates:
        if candidate.lower() in lower:
            return candidate
    return None


def dedupe_products(products: Iterable[ScrapedProduct]) -> list[ScrapedProduct]:
    by_key: dict[str, ScrapedProduct] = {}
    for product in products:
        key = "::".join(
            [
                product.sourceKey,
                normalize_space(product.productName).lower(),
                normalize_space(product.genericName).lower(),
            ],
        )
        existing = by_key.get(key)
        if not existing:
            by_key[key] = product
            continue
        if not existing.detailUrl and product.detailUrl:
            existing.detailUrl = product.detailUrl
        if not existing.unitPriceTzs and product.unitPriceTzs:
            existing.unitPriceTzs = product.unitPriceTzs
        if not existing.sku and product.sku:
            existing.sku = product.sku
        if not existing.category and product.category:
            existing.category = product.category
        if not existing.strengthText and product.strengthText:
            existing.strengthText = product.strengthText
        if not existing.dosageFormName and product.dosageFormName:
            existing.dosageFormName = product.dosageFormName
        if not existing.rawText and product.rawText:
            existing.rawText = product.rawText
    return sorted(by_key.values(), key=lambda item: (item.sourceKey, item.productName.lower()))


def parse_tmdapi_page(url: str) -> tuple[list[ScrapedProduct], str]:
    html = fetch_text(url)
    records: list[ScrapedProduct] = []
    row_pattern = re.compile(r"<tr\b[^>]*>(.*?)</tr>", re.I | re.S)
    link_pattern = re.compile(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)
    cell_pattern = re.compile(r"<td\b[^>]*>(.*?)</td>", re.I | re.S)
    for row_html in row_pattern.findall(html):
        link_match = link_pattern.search(row_html)
        if not link_match:
            continue
        href, product_html = link_match.groups()
        cells = cell_pattern.findall(row_html)
        if len(cells) < 3:
            continue
        product_name = normalize_space(unescape(re.sub(r"<[^>]+>", " ", product_html)))
        generic_name = normalize_space(unescape(re.sub(r"<[^>]+>", " ", cells[-1])))
        if not product_name or not generic_name:
            continue
        if len(product_name) < 2 or product_name.lower() in {"home", "view all"}:
            continue
        if not re.search(r"\b(tablet|capsule|injection|syrup|cream|ointment|suspension|mg|ml|g|drops)\b", generic_name, re.I):
            continue
        records.append(
            ScrapedProduct(
                sourceKey="TMDA_APPROVED_PRODUCT_INFO",
                sourceName="TMDA Approved Medicines Product Information",
                sourceUrl=url,
                productName=product_name,
                genericName=generic_name,
                strengthText=infer_strength(generic_name),
                dosageFormName=infer_dosage_form(generic_name),
                detailUrl=absolute_url(url, href),
                rawText=f"{product_name} {generic_name}",
                confidence="SOURCE_LISTED",
                notes="Selected TMDA SmPC/TPAR listing, not the full registered medicines universe.",
            ),
        )
    return dedupe_products(records), "Scraped selected TMDA SmPC/TPAR product listing."


def crawl_umoja(start_urls: list[str], max_pages: int = 80) -> tuple[list[ScrapedProduct], str]:
    host = "www.umojapharmaceuticals.co.tz"
    queue = list(dict.fromkeys(start_urls))
    seen: set[str] = set()
    records: list[ScrapedProduct] = []

    while queue and len(seen) < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            html = fetch_text(url)
        except (urllib.error.URLError, TimeoutError) as error:
            records.append(
                ScrapedProduct(
                    sourceKey="UMOJA_PUBLIC_SHOP",
                    sourceName="Umoja Pharmaceuticals public product pages",
                    sourceUrl=url,
                    productName="SCRAPE_ERROR",
                    rawText=str(error),
                    confidence="ERROR",
                    notes="Page could not be fetched during crawl.",
                ),
            )
            continue

        parser = AnchorParser()
        parser.feed(html)
        for anchor in parser.anchors:
            href = absolute_url(url, anchor["href"])
            if not href:
                continue
            parsed = urllib.parse.urlparse(href)
            if parsed.netloc != host:
                continue
            if "/products/" in parsed.path or "/productDetails/" in parsed.path:
                if href not in seen and href not in queue:
                    queue.append(href)

        for record in parse_umoja_listing_page(url, html):
            records.append(record)

        time.sleep(0.15)

    return dedupe_products([record for record in records if record.productName != "SCRAPE_ERROR"]), (
        f"Crawled {len(seen)} Umoja public pages. Rows are retail/B2B shop observations, not regulatory records."
    )


def parse_umoja_listing_page(url: str, html: str) -> list[ScrapedProduct]:
    parser = AnchorParser()
    parser.feed(html)
    lines = strip_tags(html)
    records: list[ScrapedProduct] = []
    product_links = [
        anchor for anchor in parser.anchors if "/productDetails/" in (anchor.get("href") or "") and anchor["text"].strip()
    ]
    line_text = "\n".join(lines)

    for anchor in product_links:
        product_name = normalize_space(anchor["text"])
        if len(product_name) < 3 or product_name.lower() in {"home", "shop"}:
            continue
        product_index = next((index for index, line in enumerate(lines) if normalize_space(line) == product_name), -1)
        nearby = lines[max(0, product_index - 5): product_index + 8] if product_index >= 0 else []
        nearby_text = " ".join(nearby)
        sku_match = re.search(r"\b(?:MP|NC)-\d+\b", nearby_text)
        category = extract_umoja_category(lines)
        records.append(
            ScrapedProduct(
                sourceKey="UMOJA_PUBLIC_SHOP",
                sourceName="Umoja Pharmaceuticals public product pages",
                sourceUrl=UMOJA_SOURCE_URL,
                productName=product_name,
                category=category,
                sku=sku_match.group(0) if sku_match else None,
                strengthText=infer_strength(product_name),
                dosageFormName=infer_dosage_form(product_name),
                unitPriceTzs=None,
                currency=None,
                detailUrl=absolute_url(url, anchor["href"]),
                rawText=nearby_text or product_name,
                confidence="PUBLIC_SHOP_LISTING",
                notes="Public Umoja listing; use as commercial/onboarding source, not TMDA verification. Prices are intentionally not captured because nearby recommendation blocks can make static extraction unreliable.",
            ),
        )

    if not records:
        # Some category pages expose products as plain text in the static HTML without useful product detail anchors.
        for index, line in enumerate(lines):
            if line == "IN STOCK" and index + 2 < len(lines):
                sku = lines[index + 1] if re.match(r"^(?:MP|NC)-\d+$", lines[index + 1]) else None
                product_name = lines[index + 2] if sku else lines[index + 1]
                if len(product_name) < 3:
                    continue
                window = lines[index: index + 6]
                records.append(
                    ScrapedProduct(
                        sourceKey="UMOJA_PUBLIC_SHOP",
                        sourceName="Umoja Pharmaceuticals public product pages",
                        sourceUrl=UMOJA_SOURCE_URL,
                        productName=product_name,
                        category=extract_umoja_category(lines),
                        sku=sku,
                        strengthText=infer_strength(product_name),
                        dosageFormName=infer_dosage_form(product_name),
                        unitPriceTzs=None,
                        currency=None,
                        rawText=" ".join(window),
                        confidence="PUBLIC_SHOP_LISTING",
                        notes="Public Umoja listing; use as commercial/onboarding source, not TMDA verification. Prices are intentionally not captured because nearby recommendation blocks can make static extraction unreliable.",
                    ),
                )

    return records


def extract_umoja_category(lines: list[str]) -> str | None:
    for index, line in enumerate(lines):
        if line.upper() == line and 8 <= len(line) <= 80 and any(
            word in line.lower() for word in ["anti", "asthmatic", "hypoglycemic", "multivitamins", "gout", "dyslipidemics"]
        ):
            return line.title()
    return None


def parse_vital_page(url: str) -> tuple[list[ScrapedProduct], str]:
    html = fetch_text(url)
    parser = AnchorParser()
    parser.feed(html)
    lines = strip_tags(html)
    records = []
    ignored = {
        "home",
        "about us",
        "our products",
        "market strategy",
        "contact us",
        "cosmetics products",
        "pharmaceutical products",
        "fmcg products",
    }
    for line in lines:
        normalized = line.lower()
        if normalized in ignored or len(line) < 3 or len(line) > 90:
            continue
        if not re.search(
            r"\b(tablet|capsule|injection|syrup|cream|ointment|lotion|drops|gel|solution|calamine|bp|b\.p)\b",
            normalized,
        ):
            continue
        if re.search(r"address|copyright|nyerere|dar es salaam|quick links|follow us|\+255", normalized):
            continue
        records.append(
            ScrapedProduct(
                sourceKey="VITAL_PUBLIC_PRODUCTS",
                sourceName="Vital International public product page",
                sourceUrl=url,
                productName=line,
                rawText=line,
                confidence="LOW_CONFIDENCE_PUBLIC_LISTING",
                notes="Vital page mixes cosmetics/FMCG/pharmaceuticals and lacks structured medicine metadata.",
            ),
        )
    return dedupe_products(records), "Scraped public product names; many rows may not be medicines."


def parse_unichem_pdf(url: str) -> tuple[list[ScrapedProduct], str]:
    pdf_bytes = fetch_binary(url)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as handle:
        handle.write(pdf_bytes)
        pdf_path = Path(handle.name)

    reader = PdfReader(str(pdf_path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    lines = [normalize_space(line) for line in text.splitlines() if normalize_space(line)]
    records: list[ScrapedProduct] = []
    combined = " ".join(lines)

    row_pattern = re.compile(r"\b(\d{1,3})\s+([A-Z][A-Za-z0-9+\-/ ]{2,80}?)\s+(?=(?:[A-Z][a-z]+|[A-Z]{2,}|&))([A-Za-z0-9&,+\-/(). ]{5,130}?)(?=\s+\d{1,3}\s+[A-Z]|Last updated|$)")
    for _, product_name, generic_name in row_pattern.findall(combined):
        product_name = normalize_space(product_name)
        generic_name = normalize_space(generic_name)
        generic_name = re.sub(r"\bTANZANIA PRODUCT LIST\b", "", generic_name, flags=re.I)
        generic_name = normalize_space(generic_name)
        leading_form = re.match(r"^(Tablets|Tablet|Capsules|Capsule|Injection|Syrup|Powder for suspension)\s+(.+)$", generic_name, flags=re.I)
        if leading_form and not re.search(leading_form.group(1), product_name, flags=re.I):
            product_name = normalize_space(f"{product_name} {leading_form.group(1)}")
            generic_name = normalize_space(leading_form.group(2))
        if not product_name or not generic_name or product_name.lower().startswith("sr no"):
            continue
        records.append(
            ScrapedProduct(
                sourceKey="UNICHEM_TANZANIA_PDF",
                sourceName="Unichem Tanzania Product List",
                sourceUrl=url,
                productName=product_name,
                genericName=generic_name,
                strengthText=infer_strength(product_name) or infer_strength(generic_name),
                dosageFormName=infer_dosage_form(product_name) or infer_dosage_form(generic_name),
                rawText=f"{product_name} {generic_name}",
                confidence="MANUFACTURER_PRODUCT_LIST",
                notes="Manufacturer Tanzania product list; useful for brand-generic mapping, not wholesaler stock or TMDA verification.",
            ),
        )

    return dedupe_products(records), "Parsed manufacturer PDF product list."


def scrape_company_profile(url: str, source_key: str, source_name: str) -> tuple[list[ScrapedProduct], str]:
    html = fetch_text(url)
    lines = strip_tags(html)
    productish = [
        line for line in lines
        if 3 <= len(line) <= 80 and re.search(r"pharmaceutical|tablet|capsule|injection|syrup|product range|medicines", line, re.I)
    ]
    records = [
        ScrapedProduct(
            sourceKey=source_key,
            sourceName=source_name,
            sourceUrl=url,
            productName="NO_PUBLIC_STRUCTURED_PRODUCT_LIST",
            rawText=" | ".join(productish[:8]),
            confidence="NO_PRODUCT_ROWS",
            notes="Public site confirms supplier/wholesaler presence but did not expose a structured drug list.",
        ),
    ]
    return records, "No structured public product rows found; captured source evidence only."


def run_source(source_key: str) -> tuple[list[ScrapedProduct], SourceRun]:
    sources = {
        "tmda": (
            "TMDA_APPROVED_PRODUCT_INFO",
            "TMDA Approved Medicines Product Information",
            "https://www.tmda.go.tz/index.php/pages/approved-product-information",
            lambda url: parse_tmdapi_page(url),
        ),
        "umoja": (
            "UMOJA_PUBLIC_SHOP",
            "Umoja Pharmaceuticals public product pages",
            "https://www.umojapharmaceuticals.co.tz/",
            lambda url: crawl_umoja([url]),
        ),
        "vital": (
            "VITAL_PUBLIC_PRODUCTS",
            "Vital International public product page",
            "https://www.vil.co.tz/product.php",
            lambda url: parse_vital_page(url),
        ),
        "unichem": (
            "UNICHEM_TANZANIA_PDF",
            "Unichem Tanzania Product List",
            "https://www.unichemlabs.com/pdf/Tanzania.pdf",
            lambda url: parse_unichem_pdf(url),
        ),
        "global": (
            "GLOBAL_PHARMA_PROFILE",
            "Global Pharma Group Tanzania",
            "https://www.globalgrouptz.com/",
            lambda url: scrape_company_profile(url, "GLOBAL_PHARMA_PROFILE", "Global Pharma Group Tanzania"),
        ),
        "bariki": (
            "BARIKI_PROFILE",
            "Bariki Pharma Group",
            "https://barikipharmacy.co.tz/",
            lambda url: scrape_company_profile(url, "BARIKI_PROFILE", "Bariki Pharma Group"),
        ),
        "infinicare": (
            "INFINICARE_PROFILE",
            "Infinicare Tanzania",
            "https://infinicare.co.tz/",
            lambda url: scrape_company_profile(url, "INFINICARE_PROFILE", "Infinicare Tanzania"),
        ),
    }

    internal_key, name, url, scraper = sources[source_key]
    try:
        records, notes = scraper(url)
        return records, SourceRun(internal_key, name, url, "OK", len(records), notes, [])
    except Exception as error:  # noqa: BLE001 - source runs should continue independently
        return [], SourceRun(internal_key, name, url, "ERROR", 0, "Source scrape failed.", [str(error)])


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape public Tanzania medicine/product sources into reviewable JSON.")
    parser.add_argument(
        "--sources",
        nargs="+",
        default=["tmda", "umoja", "vital", "unichem", "global", "bariki", "infinicare"],
        help="Source keys to scrape.",
    )
    parser.add_argument(
        "--output",
        default="data/public-source-scrapes/public-product-scrape-latest.json",
        help="Output JSON path relative to backend directory.",
    )
    parser.add_argument(
        "--csv-output",
        default="data/public-source-scrapes/public-product-scrape-latest.csv",
        help="Output CSV path relative to backend directory.",
    )
    args = parser.parse_args()

    all_records: list[ScrapedProduct] = []
    source_runs: list[SourceRun] = []
    for source in args.sources:
        records, run = run_source(source)
        all_records.extend(records)
        source_runs.append(run)

    all_records = dedupe_products(all_records)
    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Reviewable public-source product scrape for onboarding/catalog matching. Not regulatory verification.",
        "sources": [asdict(run) for run in source_runs],
        "recordCount": len(all_records),
        "records": [asdict(record) for record in all_records],
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    csv_path = Path(args.csv_output)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = list(asdict(all_records[0]).keys()) if all_records else list(ScrapedProduct.__dataclass_fields__.keys())
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in all_records:
            writer.writerow(asdict(record))

    print(
        json.dumps(
            {
                "output": str(output_path),
                "csvOutput": str(csv_path),
                "recordCount": len(all_records),
                "sources": output["sources"],
            },
            indent=2,
        ),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
