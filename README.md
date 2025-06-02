# Interactive FIRE Calculator

## Overview
The Interactive FIRE (Financial Independence, Retire Early) Calculator is a web application designed to help users plan and visualize their path to financial independence. It allows for detailed scenario analysis, including multi-period rate configurations, and provides clear visual feedback through interactive charts and tables.

## Features
- **Dynamic Calculations**: Instantly see the impact of changing financial variables.
- **Expense Mode**: Calculate the total portfolio (FIRE number) needed based on desired annual expenses.
- **FIRE Mode**: Determine the maximum sustainable annual expense from a target FIRE number.
- **Multi-Period Analysis**: Define different expected investment returns and inflation rates for various periods within your financial plan (e.g., early accumulation, pre-retirement, retirement).
- **Scenario Comparison**: Analyze and compare up to four different financial scenarios side-by-side.
- **Data Visualization**: Interactive charts for portfolio balance and annual withdrawals over time.
- **Yearly Data Table**: Detailed year-by-year breakdown of financial projections.
- **Desired Final Portfolio Value**: Option to specify a target amount to remain at the end of the term.
- **Withdrawal Timing**: Choose between start-of-year or end-of-year withdrawals.
- **Responsive Design**: User-friendly interface adaptable to different screen sizes.
- **Theme Customization**: Light, Dark, and System theme options, with settings for font size and panel opacity.
- **Data Export**: Export calculation results to CSV and plots/tables to PDF (via print-to-PDF).
- **Save/Load Scenarios**: Save comparison scenario configurations to local browser storage.
- **Informative Tooltips**: Helpful hints and explanations for various input fields.

## Technologies Used
- **Backend**: Python (Flask)
- **Frontend**: HTML, CSS, JavaScript
- **Charting**: Plotly.js
- **Styling**: Bootstrap 5

## Getting Started

### Prerequisites
- Python 3.8+
- pip (Python package installer)

### Installation & Running
1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```
2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    (Note: Ensure `requirements.txt` includes Flask, NumPy, and Plotly.)

4.  **Run the application:**
    ```bash
    flask run
    # Or, for development mode:
    # flask --app project --debug run
    ```
    The application will typically be available at `http://127.0.0.1:5000/`.

## Usage
- **Home Page**: Input your financial details, choose between Expense Mode or FIRE Mode, and configure single or multi-period rates. Click "Calculate" to see results.
- **Results Page**: Adjust common parameters (return, inflation, duration, withdrawal timing) and see both modes update in real-time. Explore interactive plots and yearly data tables. Export data as needed.
- **Compare Page**: Set up multiple scenarios with different parameters to compare their outcomes, including combined plots and a summary table.
- **Settings Page**: Customize the application theme (Light, Dark, System), base font size, and UI panel opacity.
- **Navigation**: Use the header navigation links (Home, Compare, Settings) and footer links (About, FAQ) to move between pages.

## File Structure
```
/your-repo-root
|-- project/
|   |-- __init__.py             # Initializes the Flask application
|   |-- routes.py               # Defines application routes and view logic
|   |-- financial_calcs.py      # Core financial calculation functions
|   |-- constants.py            # Application-wide constants
|   |-- static/
|   |   |-- css/main.css        # Custom CSS styles
|   |   |-- js/theme.js         # Theme management (light/dark/system)
|   |   |-- js/validation.js    # Form validation logic (if any)
|   |-- templates/
|   |   |-- base.html           # Base template with header, footer, navigation
|   |   |-- index.html          # Main calculator input form
|   |   |-- result.html         # Page to display calculation results
|   |   |-- compare.html        # Scenario comparison page
|   |   |-- settings.html       # Application settings page
|   |   |-- about.html          # About page
|   |   |-- faq.html            # FAQ page
|-- venv/                       # Virtual environment directory (if created)
|-- requirements.txt            # Python package dependencies
|-- README.md                   # This file
|-- PLANNED_ENHANCEMENTS.md     # Document outlining future features
|-- LICENSE                     # Project license file
|-- run.py                      # Script to run the Flask application (alternative to `flask run`)
```

## Contributing
Contributions are welcome! Please feel free to submit issues, fork the repository, and create pull requests.
For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License - see the `LICENSE` file for details.
(If a `LICENSE` file does not exist, one should be added, typically containing the standard MIT License text.)
