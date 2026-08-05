from flask import Flask

from middleware.error_handler import register_error_handlers

app = Flask(__name__)

register_error_handlers(app)


@app.route("/")
def home():
    return "CareerCraft"


@app.route("/error")
def error():
    raise Exception("Testing Error Handler")


if __name__ == "__main__":
    app.run(debug=True)