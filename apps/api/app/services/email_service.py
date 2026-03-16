"""Send emails via Resend. Used for verification codes."""

import logging

import httpx

from app.core.settings import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _build_verification_html(code: str, recipient_name: str | None) -> str:
    """Build HTML body for verification email. Uses TRYL brand template (no image)."""
    name = (recipient_name or "").strip() or "there"
    if len(name) > 60:
        name = name[:57] + "..."

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&display=swap');
    .email-shell {{ background: #f5f3ee; padding: 2.5rem 1rem; font-family: 'Jost', sans-serif; }}
    .email-card {{ max-width: 560px; margin: 0 auto; background: #ffffff; border: 0.5px solid #ddd9d0; border-radius: 4px; overflow: hidden; }}
    .email-header {{ background: #0d0d0d; padding: 2rem 2.5rem 1.75rem; text-align: center; }}
    .email-header .brand {{ font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; letter-spacing: 0.35em; color: #c9a84c; margin: 0 0 6px; text-transform: uppercase; }}
    .email-header .tagline {{ font-size: 11px; font-weight: 300; letter-spacing: 0.2em; color: #8a8070; text-transform: uppercase; margin: 0; }}
    .email-body {{ padding: 2.5rem 2.5rem 2rem; }}
    .greeting {{ font-size: 18px; font-weight: 500; color: #1a1a1a; margin: 0 0 1rem; font-family: 'Cormorant Garamond', serif; letter-spacing: 0.01em; }}
    .body-text {{ font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 1.75rem; font-weight: 300; }}
    .otp-section {{ background: #0d0d0d; border-radius: 3px; padding: 1.5rem 2rem; text-align: center; margin: 0 0 1.75rem; }}
    .otp-label {{ font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #8a8070; margin: 0 0 10px; font-weight: 400; }}
    .otp-code {{ font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 600; letter-spacing: 0.2em; color: #c9a84c; margin: 0 0 10px; line-height: 1; }}
    .otp-note {{ font-size: 11px; color: #6b6355; letter-spacing: 0.05em; margin: 0; }}
    .divider {{ border: none; border-top: 0.5px solid #e8e4de; margin: 0 0 1.75rem; }}
    .sign-off {{ font-size: 14px; color: #555; line-height: 1.8; font-weight: 300; }}
    .sign-off .name {{ font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 500; color: #1a1a1a; display: block; margin-top: 4px; }}
    .sign-off .title {{ font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #c9a84c; }}
    .email-footer {{ background: #f9f7f3; border-top: 0.5px solid #e8e4de; padding: 1rem 2.5rem; text-align: center; }}
    .footer-text {{ font-size: 11px; color: #aaa; letter-spacing: 0.04em; margin: 0; line-height: 1.6; }}
  </style>
</head>
<body>
<div class="email-shell">
  <div class="email-card">
    <div class="email-header">
      <p class="brand">TRYL</p>
      <p class="tagline">AI Fashion Try-On</p>
    </div>
    <div class="email-body">
      <p class="greeting">Hello {name},</p>
      <p class="body-text">Just one more step before you get started. Please confirm your identity using the one-time passcode below.</p>
      <div class="otp-section">
        <p class="otp-label">Your verification code</p>
        <p class="otp-code">{code}</p>
        <p class="otp-note">This code will expire in 10 minutes.</p>
      </div>
      <hr class="divider" />
      <div class="sign-off">
        <span>Sincerely,</span>
        <span class="name">Alexander, Founder of TRYL</span>
        <span class="title">AI Fashion Try-On</span>
      </div>
    </div>
    <div class="email-footer">
      <p class="footer-text">You're receiving this email because you created an account at TRYL.<br />If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</div>
</body>
</html>"""


def send_verification_email(to_email: str, code: str, *, recipient_name: str | None = None) -> bool:
    """
    Send 6-digit verification code to email via Resend (HTML + plain text fallback).
    recipient_name: display name for "Hello {name}," (e.g. from sign-up name field). If None, uses "there".
    Returns True if sent, False if skipped (no API key) or failed.
    """
    if not (settings.resend_api_key or "").strip():
        logger.warning("Resend API key not set; skipping verification email to %s", to_email)
        return False
    subject = "Verify your email for Tryl"
    html_body = _build_verification_html(code, recipient_name)
    text_body = f"{code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email."
    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=payload,
            )
        if r.status_code >= 400:
            logger.error("Resend API error %s: %s", r.status_code, r.text)
            return False
        return True
    except Exception as e:
        logger.exception("Failed to send verification email: %s", e)
        return False
