import re


class Validator:
    """
    Common validation methods used across the application.
    """

    @staticmethod
    def validate_email(email):
        """
        Validate email format.
        """
        pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
        return bool(re.match(pattern, email))


    @staticmethod
    def validate_password(password):
        """
        Password Requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        """

        if len(password) < 8:
            return False

        if not re.search(r"[A-Z]", password):
            return False

        if not re.search(r"[a-z]", password):
            return False

        if not re.search(r"\d", password):
            return False

        return True


    @staticmethod
    def validate_phone(phone):
        """
        Validate phone number.
        Supports 10-digit Indian numbers.
        """

        pattern = r"^[6-9]\d{9}$"
        return bool(re.match(pattern, phone))


    @staticmethod
    def validate_required_fields(data, required_fields):
        """
        Check whether all required fields are present.
        """

        missing = []

        for field in required_fields:

            if field not in data:
                missing.append(field)

            elif str(data[field]).strip() == "":
                missing.append(field)

        return missing
    