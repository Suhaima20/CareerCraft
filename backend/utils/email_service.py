import os

import resend


def send_email(
    to_email,
    subject,
    html,
):
    """
    Send an email using Resend.

    Returns:
        True  -> email sent successfully
        False -> email failed
    """

    api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv(
        "EMAIL_FROM",
        "CareerCraft <onboarding@resend.dev>",
    )

    if not api_key:
        print("Email error: RESEND_API_KEY is not configured.")
        return False

    if not to_email:
        print("Email error: recipient email is missing.")
        return False

    try:
        resend.api_key = api_key

        response = resend.Emails.send(
            {
                "from": email_from,
                "to": [to_email],
                "subject": subject,
                "html": html,
            }
        )

        print(
            f"CareerCraft email sent successfully to {to_email}: "
            f"{response}"
        )

        return True

    except Exception as e:
        print(
            f"CareerCraft email sending failed for {to_email}: "
            f"{e}"
        )
        return False