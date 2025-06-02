# Planned Enhancements & Future Features

This document outlines potential future enhancements and features for the Interactive FIRE Calculator. These are ideas for further development and are not necessarily in a fixed roadmap.

## Core Functionality Improvements
- **Advanced Input Validation & Error Handling**: More granular feedback for invalid input combinations directly on the forms.
- **Taxation Modeling**:
    - Options to include basic income tax, capital gains tax, and dividend tax considerations.
    - Differentiate between pre-tax and post-tax investment accounts (e.g., 401k, Roth IRA).
- **Social Security / Pension Integration**: Allow users to input expected social security or pension benefits and the age they start, factoring them into withdrawal needs.
- **One-off Large Expenses/Incomes**: Ability to add significant one-time expenses (e.g., buying a house, wedding) or incomes (e.g., inheritance) at specific years.
- **Inflation-Adjusted vs. Nominal Returns**: Clarify and potentially offer explicit modes for nominal vs. real (inflation-adjusted) return inputs.
- **More Sophisticated Withdrawal Strategies**:
    - Percentage of portfolio (e.g., X% of current balance).
    - Guardrail strategies (adjusting withdrawals based on portfolio performance relative to set thresholds).
    - Variable Percentage Withdrawal (VPW).
- **Monte Carlo Simulation**: Add an option to run Monte Carlo simulations to assess the probability of success for a given plan, considering market volatility.
- **Historical Data Analysis**: Allow users to backtest their strategies against historical market performance.

## User Interface & Experience (UI/UX)
- **Internationalization (i18n)**: Support for multiple languages and currency symbols.
- **Accessibility (a11y) Improvements**: Continued focus on WCAG compliance.
- **More Chart Customization**: Options to toggle visibility of certain data series on charts, zoom enhancements.
- **Data Persistence Options**:
    - Allow users to create accounts to save their scenarios server-side (requires backend database and authentication).
    - More robust import/export of scenario data (e.g., JSON format).
- **Guided Tour / Help System**: Interactive guide for new users explaining different features and inputs.
- **Sharable Links**: Generate unique URLs that pre-fill the calculator with specific scenario data for easy sharing.
- **Mobile App**: Potential for a native mobile application version.

## Technical & Performance
- **API Development**: Create a public API for programmatic access to the calculation engine.
- **Performance Optimization**: For very long durations or complex multi-period scenarios, ensure calculations remain fast.
- **Refactor JavaScript**: Further componentization or use of a frontend framework for more complex client-side interactions if needed.
- **Configuration File**: For deployment-specific settings (e.g., if a database is added).

## Content & Information
- **Educational Resources**: Integrate links or sections with more information about FIRE principles, investment strategies, and financial planning concepts.
- **Glossary**: A glossary of financial terms used in the calculator.

## Scenario Comparison Enhancements
- **Sensitivity Analysis**: Automatically show how results change with minor variations in key inputs for a given scenario.
- **More Advanced Charting**: Options for stacked bar charts for asset allocation over time (if asset types are introduced), or probability distributions from Monte Carlo.
- **Delta/Difference View**: Highlight differences between selected scenarios more explicitly.

## Testing Enhancements
- **End-to-End Testing**: Implement more comprehensive E2E tests using frameworks like Selenium or Cypress.
- **CI/CD Pipeline**: Automate testing and deployment processes.

This list is dynamic and will evolve based on user feedback and development priorities.
