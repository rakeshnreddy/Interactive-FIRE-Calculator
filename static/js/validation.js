// static/js/validation.js
(function () {
  'use strict';

  const MAX_SCENARIOS = 4; // Used for compareForm

  /**
   * Shows a validation error message for a given input element.
   * @param {HTMLElement} inputElement - The input element to validate.
   * @param {string} message - The error message to display.
   */
  function showValidationMessage(inputElement, message) {
    inputElement.classList.remove('is-valid');
    inputElement.classList.add('is-invalid');

    let feedbackElement = inputElement.parentNode.querySelector('.invalid-feedback');
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.className = 'invalid-feedback';
      if (inputElement.nextSibling) {
        inputElement.parentNode.insertBefore(feedbackElement, inputElement.nextSibling);
      } else {
        inputElement.parentNode.appendChild(feedbackElement);
      }
    }
    feedbackElement.textContent = message;
    feedbackElement.style.display = 'block'; // Ensure it's visible
  }

  /**
   * Clears any validation message for a given input element and optionally sets it as valid.
   * @param {HTMLElement} inputElement - The input element.
   * @param {boolean} [markValid=false] - Whether to add 'is-valid' class.
   */
  function clearValidationMessage(inputElement, markValid = false) {
    inputElement.classList.remove('is-invalid');
    if (markValid) {
      inputElement.classList.add('is-valid');
    } else {
      inputElement.classList.remove('is-valid');
    }
    const feedbackElement = inputElement.parentNode.querySelector('.invalid-feedback');
    if (feedbackElement) {
      feedbackElement.textContent = '';
      feedbackElement.style.display = 'none'; // Hide it
    }
  }

  /**
   * Validates a single input element based on its attributes and context.
   * @param {HTMLElement} inputElement - The input element to validate.
   * @param {object} [context={}] - Contextual information for validation.
   * @param {boolean} [context.isFallbackField=false] - Is this a fallback r, i, T field?
   * @param {boolean} [context.formHasPeriodData=false] - Does the relevant form/scenario have active period data?
   * @param {string} [context.periodDurationValue=""] - Value of the corresponding duration field for a period r/i field.
   * @param {string} [context.periodRateValue=""] - Value of the corresponding rate field for a period duration field.
   * @param {string} [context.periodInflationValue=""] - Value of the corresponding inflation field for a period duration field.
   * @returns {boolean} - True if valid, false otherwise.
   */
  function validateInput(inputElement, context = {}) {
    const value = inputElement.value.trim();
    const name = inputElement.name;
    const type = inputElement.type;
    let isRequired = inputElement.hasAttribute('required');

    // --- Conditional Requirement Logic ---
    if (context.isFallbackField && context.formHasPeriodData && value === '') {
      clearValidationMessage(inputElement); // Not required if period data is active and field is empty
      return true;
    }
    // If it's a fallback field AND no period data, it IS required (original 'required' attribute stands)
    // If it's NOT a fallback field, its 'required' attribute stands.

    // For period r or i fields: required if its corresponding duration is > 0
    if (name && (name.endsWith('_r') || name.endsWith('_i')) && context.isPeriodRateField) {
        const duration = parseFloat(context.periodDurationValue);
        if (duration > 0 && value === '') {
            showValidationMessage(inputElement, 'Required if period duration is set and > 0.');
            return false;
        }
    }

    // For period duration fields: required and > 0 if its corresponding r or i has a value
    if (name && name.endsWith('_duration') && context.isPeriodDurationField) {
        const hasRate = context.periodRateValue !== '';
        const hasInflation = context.periodInflationValue !== '';
        if ((hasRate || hasInflation) && (value === '' || parseFloat(value) <= 0)) {
            showValidationMessage(inputElement, 'Duration required (>0) if rate or inflation for this period is set.');
            return false;
        }
    }
    
    // --- Standard Validation ---
    if (isRequired && value === '') {
      showValidationMessage(inputElement, 'This field is required.');
      return false;
    }

    if (type === 'number' && value !== '') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        showValidationMessage(inputElement, 'Please enter a valid number.');
        return false;
      }
      const min = inputElement.hasAttribute('min') ? parseFloat(inputElement.getAttribute('min')) : null;
      const max = inputElement.hasAttribute('max') ? parseFloat(inputElement.getAttribute('max')) : null;

      if (min !== null && numValue < min) {
        showValidationMessage(inputElement, `Value must be ${min} or greater.`);
        return false;
      }
      if (max !== null && numValue > max) {
        showValidationMessage(inputElement, `Value must be ${max} or less.`);
        return false;
      }
    }
    
    if (inputElement.tagName === 'SELECT' && isRequired && value === '') {
        showValidationMessage(inputElement, 'Please select an option.');
        return false;
    }

    clearValidationMessage(inputElement, value !== ''); // Mark as valid if it has a value and passed all checks
    return true;
  }

  window.addEventListener('load', function () {
    const forms = document.querySelectorAll('.needs-validation');

    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener('submit', function (event) {
        let formIsValidOverall = true;
        let firstInvalidField = null;

        // --- Handling for index.html form (calculatorForm) ---
        if (form.id === 'calculatorForm') {
            const W = form.querySelector('[name="W"]');
            const D = form.querySelector('[name="D"]');
            const fallbackR = form.querySelector('[name="r"]');
            const fallbackI = form.querySelector('[name="i"]');
            const fallbackT = form.querySelector('[name="T"]');
            
            if (!validateInput(W)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = W; }
            if (!validateInput(D)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = D; }

            let mainFormHasPeriodData = false;
            for (let k = 1; k <= 3; k++) {
                const durField = form.querySelector(`[name="period${k}_duration"]`);
                if (durField && durField.value.trim() !== '' && parseFloat(durField.value.trim()) > 0) {
                    mainFormHasPeriodData = true;
                    break;
                }
            }

            for (let k = 1; k <= 3; k++) {
                const durField = form.querySelector(`[name="period${k}_duration"]`);
                const rField = form.querySelector(`[name="period${k}_r"]`);
                const iField = form.querySelector(`[name="period${k}_i"]`);

                if (durField && !validateInput(durField, { isPeriodDurationField: true, periodRateValue: rField ? rField.value : '', periodInflationValue: iField ? iField.value : '' })) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = durField; }
                if (rField && !validateInput(rField, { isPeriodRateField: true, periodDurationValue: durField ? durField.value : '' })) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = rField; }
                if (iField && !validateInput(iField, { isPeriodRateField: true, periodDurationValue: durField ? durField.value : '' })) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = iField; }
            }
            
            // Fallback fields only required if no period data
            const fallbackContext = { isFallbackField: true, formHasPeriodData: mainFormHasPeriodData };
            if (fallbackR && !validateInput(fallbackR, fallbackContext)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = fallbackR;}
            if (fallbackI && !validateInput(fallbackI, fallbackContext)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = fallbackI;}
            if (fallbackT && !validateInput(fallbackT, fallbackContext)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = fallbackT;}

        } 
        // --- Handling for compare.html form ---
        else if (form.id === 'compareForm') {
            for (let n = 1; n <= MAX_SCENARIOS; n++) {
                const scenarioEnabledCheckbox = form.querySelector(`[name="scenario${n}_enabled"]`);
                if (!scenarioEnabledCheckbox || !scenarioEnabledCheckbox.checked) {
                    // Clear validation for disabled scenarios
                    const scenarioInputs = form.querySelectorAll(`[name^="scenario${n}_"]`);
                    scenarioInputs.forEach(input => clearValidationMessage(input));
                    continue; 
                }

                const scenarioW = form.querySelector(`[name="scenario${n}_W"]`);
                const scenarioD = form.querySelector(`[name="scenario${n}_D"]`);
                const scenarioFallbackR = form.querySelector(`[name="scenario${n}_r"]`);
                const scenarioFallbackI = form.querySelector(`[name="scenario${n}_i"]`);
                const scenarioFallbackT = form.querySelector(`[name="scenario${n}_T"]`);

                if (scenarioW && !validateInput(scenarioW)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = scenarioW; }
                if (scenarioD && !validateInput(scenarioD)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = scenarioD; }
                
                let scenarioHasPeriodData = false;
                for (let k = 1; k <= 3; k++) {
                    const durField = form.querySelector(`[name="scenario${n}_period${k}_duration"]`);
                    if (durField && durField.value.trim() !== '' && parseFloat(durField.value.trim()) > 0) {
                        scenarioHasPeriodData = true;
                        break;
                    }
                }

                for (let k = 1; k <= 3; k++) {
                    const durField = form.querySelector(`[name="scenario${n}_period${k}_duration"]`);
                    const rField = form.querySelector(`[name="scenario${n}_period${k}_r"]`);
                    const iField = form.querySelector(`[name="scenario${n}_period${k}_i"]`);
                    
                    if (durField && !validateInput(durField, { isPeriodDurationField: true, periodRateValue: rField ? rField.value : '', periodInflationValue: iField ? iField.value : '' })) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = durField; }
                    if (rField && !validateInput(rField, { isPeriodRateField: true, periodDurationValue: durField ? durField.value : ''})) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = rField; }
                    if (iField && !validateInput(iField, { isPeriodRateField: true, periodDurationValue: durField ? durField.value : ''})) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = iField; }
                }

                const fallbackContextScenario = { isFallbackField: true, formHasPeriodData: scenarioHasPeriodData };
                if (scenarioFallbackR && !validateInput(scenarioFallbackR, fallbackContextScenario)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = scenarioFallbackR; }
                if (scenarioFallbackI && !validateInput(scenarioFallbackI, fallbackContextScenario)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = scenarioFallbackI; }
                if (scenarioFallbackT && !validateInput(scenarioFallbackT, fallbackContextScenario)) { formIsValidOverall = false; if(!firstInvalidField) firstInvalidField = scenarioFallbackT; }
            }
        } 
        // --- Fallback for other forms or if specific ID logic not met ---
        else { 
            const inputsToValidate = form.querySelectorAll(
              'input[required], input[type="number"], select[required], textarea[required]'
            );
            inputsToValidate.forEach(function (input) {
              if (!validateInput(input)) { // Basic validation if context is not specific
                formIsValidOverall = false;
                if (!firstInvalidField) {
                  firstInvalidField = input;
                }
              }
            });
        }

        // --- Finalize Submission ---
        if (!formIsValidOverall) {
          event.preventDefault();
          event.stopPropagation(); // Stop Bootstrap's own event listeners if any were added by 'was-validated'
          if (firstInvalidField) {
            firstInvalidField.focus();
          }
        } else {
          if (form.id === 'compareForm') {
            if (typeof window.updateComparison === 'function') {
              event.preventDefault(); 
              window.updateComparison();
            }
          }
          // For 'calculatorForm' or other forms, if formIsValidOverall is true,
          // default submission is allowed (no preventDefault unless AJAX is used).
        }
      }, false);
    });
  }, false);
})();
