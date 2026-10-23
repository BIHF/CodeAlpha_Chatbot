# CodeAlpha Chatbot

A simple FAQ-based chatbot developed using Python and Flask for Task 4 of the CodeAlpha Cloud Computing Internship.

## Features

- Interactive chatbot interface
- Keyword-based responses
- Flask web application
- Health-check endpoint
- Automated tests using pytest

## Technologies Used

- Python
- Flask
- HTML, CSS, and JavaScript
- pytest
- Gunicorn

## Project Structure

```text
CodeAlpha_Chatbot/
├── app.py
├── test_app.py
├── requirements.txt
├── Procfile
├── README.md
└── .gitignore
```

## Installation and Setup

1. Clone the repository:

   ```bash
   git clone YOUR_GITHUB_REPOSITORY_URL
   cd CodeAlpha_Chatbot
   ```

2. Create a virtual environment:

   ```bash
   python -m venv .venv
   ```

3. Activate the environment on Windows:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

4. Install dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

5. Run the application:

   ```bash
   python app.py
   ```

6. Open http://127.0.0.1:5000 in your browser.

## Run Tests

Run the automated tests with:

```bash
python -m pytest -v
```

All five current tests passed during local testing.

## Internship

Developed as part of the CodeAlpha Cloud Computing Internship.

## License

This project is intended for educational purposes.