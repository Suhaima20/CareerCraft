from werkzeug.exceptions import HTTPException

from utils.response import error_response


def register_error_handlers(app):
    """
    Register global error handlers for the Flask application.
    """

    @app.errorhandler(404)
    def not_found(error):
        return error_response(
            message="Resource not found.",
            status_code=404
        )

    @app.errorhandler(405)
    def method_not_allowed(error):
        return error_response(
            message="Method not allowed.",
            status_code=405
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return error_response(
            message=error.description,
            status_code=error.code
        )

    @app.errorhandler(Exception)
    def handle_exception(error):
        # Replace print() with proper logging in Phase 2 Step 7
        print(f"Unexpected Error: {error}")

        return error_response(
            message="Internal Server Error",
            errors=str(error),
            status_code=500
        )