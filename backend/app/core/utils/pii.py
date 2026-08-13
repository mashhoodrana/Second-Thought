import re

# Regex patterns for basic structured PII
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
# Standard international/local phone formats (e.g. +1-234-567-8900, (123) 456-7890, etc.)
PHONE_REGEX = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')

def scrub_pii(text: str) -> str:
    """
    Sanitizes input text by redacting detectable structured PII (emails and phone numbers)
    before performing external searches. It is not a complete privacy/PII detection system.
    """
    if not text:
        return ""
    
    # Redact email addresses
    text = EMAIL_REGEX.sub("[EMAIL]", text)
    
    # Redact phone numbers
    text = PHONE_REGEX.sub("[PHONE]", text)
    
    return text
