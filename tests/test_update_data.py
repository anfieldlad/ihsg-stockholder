from datetime import datetime, date
from scripts.update_data import _parse_date_components, _format_date


def test_parse_date_components_various_formats():
    # Standard DD-Mon-YYYY
    assert _parse_date_components("30-Sep-2026") == ("30", "Sep", "2026")
    
    # Slash format DD/MM/YYYY
    assert _parse_date_components("30/09/2026") == ("30", "Sep", "2026")
    assert _parse_date_components("05/10/2026") == ("05", "Oct", "2026")

    # Slash with month name DD/Mon/YYYY
    assert _parse_date_components("30/Sep/2026") == ("30", "Sep", "2026")

    # ISO format YYYY-MM-DD
    assert _parse_date_components("2026-09-30") == ("30", "Sep", "2026")

    # Datetime / date object
    dt = datetime(2026, 9, 30, 10, 0, 0)
    assert _parse_date_components(dt) == ("30", "Sep", "2026")
    d = date(2026, 9, 30)
    assert _parse_date_components(d) == ("30", "Sep", "2026")


def test_format_date_tolerance():
    assert _format_date("30-Sep-2026") == "30-Sep-2026"
    assert _format_date("30/09/2026") == "30-Sep-2026"
    assert _format_date(datetime(2026, 9, 30)) == "30-Sep-2026"


def test_float_string_shares_casting():
    # Simulates row[columns["TOTAL_HOLDING_SHARES"]] being "12345.0" or 12345.0 or 12345
    for val in ("12345.0", 12345.0, 12345, "12345"):
        shares = int(float(val or 0))
        assert shares == 12345
