from app.core.utils.pii import scrub_pii

def test_scrub_pii_emails():
    text = "Hello, please contact me at john.doe@example.com or support-team@site.org."
    sanitized = scrub_pii(text)
    assert "john.doe@example.com" not in sanitized
    assert "support-team@site.org" not in sanitized
    assert "[EMAIL]" in sanitized

def test_scrub_pii_phones():
    text = "Call me at +1-123-456-7890 or (123) 456-7890."
    sanitized = scrub_pii(text)
    assert "123-456-7890" not in sanitized
    assert "[PHONE]" in sanitized

def test_scrub_pii_no_pii():
    text = "This is a simple text claim about UNESCO."
    sanitized = scrub_pii(text)
    assert sanitized == text

def test_scrub_pii_broad_personal_details_preserved():
    # Verify that general text like names/cities are not scrubbed, as regex only does structured PII
    text = "Ali from Multan received this message."
    sanitized = scrub_pii(text)
    assert "Ali from Multan" in sanitized
