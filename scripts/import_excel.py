import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

WORKBOOK_PATH = Path("/Users/praga/Desktop/Svc Escalation Log.xlsx")
OUTPUT_PATH = Path("/Users/praga/Desktop/Partssource/Codex/data.js")
SHEET_PATH = "xl/worksheets/sheet1.xml"
NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").replace("\u200b", "").replace("\xa0", " ")).strip()


def col_to_idx(cell_ref: str) -> int:
    col = ""
    for char in cell_ref:
        if char.isalpha():
            col += char
        else:
            break

    number = 0
    for char in col:
        number = number * 26 + ord(char.upper()) - 64
    return number - 1


def excel_serial_to_date(value: str) -> str | None:
    try:
        serial = float(value)
    except ValueError:
        return None

    base = datetime(1899, 12, 30)
    return (base + timedelta(days=serial)).date().isoformat()


def parse_date(value: str) -> str | None:
    value = clean(value)
    if not value or value in {"-", "Open", "Closed", "Multiple"}:
        return None

    if re.fullmatch(r"\d+(\.\d+)?", value):
        return excel_serial_to_date(value)

    for fmt in ("%m.%d.%Y", "%m.%d.%y", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue

    return None


def first_sentence(text: str) -> str:
    text = clean(text)
    if not text:
        return "Imported escalation"
    return re.split(r"(?<=[.!?])\s+", text)[0][:120].strip()


def normalize_status(date_closed: str, action_status: str) -> str:
    closed = clean(date_closed).lower()
    action = clean(action_status).lower()

    if action in {"closed", "completed"} or closed == "closed":
        return "Closed"
    if closed and parse_date(closed):
        return "Closed"
    if action == "open" or closed == "open":
        return "Open"
    if action in {"ongoing", "scheduled"}:
        return "Pending"
    if action:
        return "Pending"
    return "Open"


def infer_severity(reason: str, description: str, actions: str) -> str:
    haystack = " ".join([clean(reason).lower(), clean(description).lower(), clean(actions).lower()])
    critical = ["safety", "patient", "shutdown", "shut down", "cancelled contract", "hazmat", "excessive downtime"]
    high = ["quality", "complaint", "performance", "communication", "cost", "billing", "escalated"]

    if any(word in haystack for word in critical):
        return "Critical"
    if any(word in haystack for word in high):
        return "High"
    return "Medium"


def load_rows() -> list[list[str]]:
    with zipfile.ZipFile(WORKBOOK_PATH) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", NS):
                shared_strings.append("".join(text.text or "" for text in item.iterfind(".//a:t", NS)))

        sheet = ET.fromstring(archive.read(SHEET_PATH))
        rows = []

        for row in sheet.find("a:sheetData", NS).findall("a:row", NS):
            values = defaultdict(str)
            for cell in row.findall("a:c", NS):
                idx = col_to_idx(cell.attrib.get("r", ""))
                cell_type = cell.attrib.get("t")
                raw = cell.find("a:v", NS)
                value = ""

                if raw is not None and raw.text is not None:
                    value = shared_strings[int(raw.text)] if cell_type == "s" else raw.text
                else:
                    inline = cell.find("a:is", NS)
                    if inline is not None:
                        value = "".join(text.text or "" for text in inline.iterfind(".//a:t", NS))

                values[idx] = clean(value)

            if values:
                rows.append([values[i] for i in range(max(values) + 1)])

        return rows


def build_record(row: list[str], index: int) -> dict:
    row = row + [""] * (17 - len(row))
    (
        line,
        date_initiated,
        date_closed,
        function,
        ticket_number,
        customer,
        equipment,
        vendor,
        reason_code,
        description,
        resulting_actions,
        action_status,
        notes,
        _empty_1,
        _empty_2,
        reason_code_fallback,
        action_status_fallback,
    ) = row[:17]

    reason = reason_code or reason_code_fallback
    action = action_status or action_status_fallback
    status = normalize_status(date_closed, action)
    created = parse_date(date_initiated) or "2026-03-16"
    closed = parse_date(date_closed)

    if status == "Closed" and not closed:
        closed = created

    due = closed or (datetime.fromisoformat(created) + timedelta(days=7)).date().isoformat()

    return {
        "id": f"ESC-{line.zfill(4)}" if line else f"ESC-UNK-{index}",
        "customer": customer or "Unknown customer",
        "vendor": vendor or "Unknown vendor",
        "category": reason if reason and reason.lower() != "all" else (function or "General"),
        "severity": infer_severity(reason, description, resulting_actions),
        "status": status,
        "owner": "Unassigned",
        "summary": first_sentence(description),
        "description": description or resulting_actions or "Imported from service escalation workbook.",
        "createdAt": f"{created}T09:00:00",
        "dueDate": due,
        "closedAt": f"{closed}T17:00:00" if closed else None,
        "ticketNumber": ticket_number or "NA",
        "equipment": equipment or "Unspecified",
        "sourceFunction": function or "Unknown",
        "sourceLine": line or "",
        "attachments": [],
        "actions": [
            {
                "id": f"action-{index}",
                "title": (resulting_actions or "Review escalation")[:180],
                "owner": "Unassigned",
                "dueDate": due,
                "done": status == "Closed",
            }
        ],
        "notes": [
            {
                "id": f"note-{index}",
                "content": notes,
                "createdAt": f"{created}T12:00:00",
            }
        ]
        if notes
        else [],
        "history": [
            {
                "id": f"history-{index}",
                "type": "Imported",
                "message": "Imported from PS Svc Escalation Log",
                "createdAt": f"{created}T09:00:00",
            }
        ],
    }


def main() -> None:
    rows = load_rows()
    records = [build_record(row, idx) for idx, row in enumerate(rows[1:], start=1)]
    payload = "window.ESCALATION_SOURCE_DATA = " + json.dumps(records, indent=2) + ";\n"
    OUTPUT_PATH.write_text(payload, encoding="utf-8")
    print(f"Wrote {len(records)} records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
