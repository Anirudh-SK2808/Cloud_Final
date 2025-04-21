document.addEventListener('DOMContentLoaded', function() {
  const questionsContainer = document.getElementById('questionsContainer');
  const surveyForm = document.getElementById('surveyForm');
  const completion = document.getElementById('completion');
  const errorMessage = document.getElementById('errorMessage');  // Add a div for error message display

  // Survey questions
  const questions = [
    "Enjoy working with others",
    "Comfort in sharing your ideas to group",
    "Working Individually",
    "Awareness of strength",
    "Detailed Attention",
    "Grasping Concepts",
    "Taking Challenges",
    "Analytical Thinking Skills",
    "Logical Thinking Skills",
    "Soft Skills",
    "Communication Skills",
    "Leadership skills",
    "Vivid Imagination",
    "Coming up with new Ideas",
    "Helping Others",
    "Learning New Things",
    "Creating New Things",
    "Teaching People",
    "Completing work on time",
    "Comfort with people around you"
  ];

  // Generate questions dynamically
  questions.forEach((question, index) => {
    const questionNumber = index + 1;
    const questionId = `question-${questionNumber}`;
    
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';

    const questionHeader = document.createElement('div');
    questionHeader.className = 'question-header';

    const numberElement = document.createElement('div');
    numberElement.className = 'question-number';
    numberElement.textContent = questionNumber;

    const textElement = document.createElement('h3');
    textElement.className = 'question-text';
    textElement.textContent = question;

    questionHeader.appendChild(numberElement);
    questionHeader.appendChild(textElement);

    const ratingContainer = document.createElement('div');
    ratingContainer.className = 'rating-container';

    const ratingLabels = document.createElement('div');
    ratingLabels.className = 'rating-labels';

    const stronglyDisagree = document.createElement('span');
    stronglyDisagree.textContent = 'Strongly Disagree';

    const stronglyAgree = document.createElement('span');
    stronglyAgree.textContent = 'Strongly Agree';

    ratingLabels.appendChild(stronglyDisagree);
    ratingLabels.appendChild(stronglyAgree);

    const ratingOptions = document.createElement('div');
    ratingOptions.className = 'rating-options';

    for (let i = 1; i <= 5; i++) {
      const optionId = `${questionId}-option-${i}`;

      const ratingOption = document.createElement('div');
      ratingOption.className = 'rating-option';

      const radioInput = document.createElement('input');
      radioInput.type = 'radio';
      radioInput.id = optionId;
      radioInput.name = questionId;
      radioInput.value = i;

      const label = document.createElement('label');
      label.htmlFor = optionId;
      label.textContent = i;

      ratingOption.appendChild(radioInput);
      ratingOption.appendChild(label);
      ratingOptions.appendChild(ratingOption);
    }

    ratingContainer.appendChild(ratingLabels);
    ratingContainer.appendChild(ratingOptions);

    questionCard.appendChild(questionHeader);
    questionCard.appendChild(ratingContainer);

    questionsContainer.appendChild(questionCard);
  });

  // Form submission handler
  surveyForm.addEventListener('submit', function(event) {
    event.preventDefault();

    // Clear previous error messages
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');

    // Validate if all questions are answered
    const totalQuestions = questions.length;
    let answeredQuestions = 0;
    let allAnswered = true;

    for (let i = 1; i <= totalQuestions; i++) {
      const questionName = `question-${i}`;
      const selectedOption = document.querySelector(`input[name="${questionName}"]:checked`);

      const questionCard = document.querySelector(`input[name="${questionName}"]`)?.closest('.question-card');
      if (selectedOption) {
        answeredQuestions++;
        questionCard.style.borderColor = '';  // Reset border if answered
      } else {
        questionCard.style.borderColor = 'var(--error)';  // Highlight unanswered question
        allAnswered = false;  // Track if all questions are answered
      }
    }

    if (!allAnswered) {
      // Show alert message
      alert('Please answer all questions before submitting the survey.');
      
      // Also show the error message at the top
      errorMessage.textContent = 'Please answer all questions before submitting the survey.';
      errorMessage.classList.remove('hidden');
      return;  // Prevent form submission if there are unanswered questions
    }

    if (answeredQuestions === totalQuestions) {
      const formData = new FormData(surveyForm);
      const surveyData = {};

      for (const [name, value] of formData.entries()) {
        surveyData[name] = value;
      }

      console.log('Survey completed:', surveyData);

      // Hide the form and show completion message
      surveyForm.style.display = 'none';
      completion.classList.remove('hidden');

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Now send data to the server
      const values = Object.values(surveyData);
      fetch('http://localhost:3000/submit-survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: values })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Server returned an error');
        }
        return response.json();
      })
      .then(data => {
        console.log('Final result from Node server:', data);
        if (data.success) {
          // Handle success (optional success message)
        } else {
          throw new Error('Survey submission failed');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        errorMessage.textContent = 'An error occurred while submitting the survey. Please try again later.';
        errorMessage.classList.remove('hidden');
      });
    }
  });
});
