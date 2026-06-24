import csv
import io
import json
from typing import Any, Dict, Optional


def to_csv(data: Dict[str, Any], filename: Optional[str] = None) -> bytes:
    """Flatten a dict to two-column CSV (Key, Value)."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Key", "Value"])
    for key, value in data.items():
        writer.writerow([key, value])
    return output.getvalue().encode("utf-8")


def to_json(data: Dict[str, Any]) -> bytes:
    return json.dumps(data, indent=2, default=str).encode("utf-8")