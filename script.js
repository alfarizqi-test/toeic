document.addEventListener('DOMContentLoaded', async () => {
  const questionsContainer = document.getElementById('questionsContainer');
  const resultDiv = document.getElementById('result');
  const submitBtn = document.getElementById('submitBtn');

  // We will hide the submit button since the user requested not needing to click submit
  if (submitBtn) submitBtn.style.display = 'none';

  try {
    // Load both JSON files
    const [testRes, projectRes] = await Promise.all([
      fetch('data/test.json'),
      fetch('data/project.json')
    ]);

    const testData = await testRes.json();
    const projectData = await projectRes.json();

    // Extract answers and scores from project.json
    const correctAnswers = [];
    const questionScores = [];

    if (projectData.contentStructure) {
      projectData.contentStructure.forEach(item => {
        if (item.roles && item.roles.question && item.roles.question.correctAnswers) {
          // Extract Correct Answer
          let ans = item.roles.question.correctAnswers[0];
          correctAnswers.push(ans.toUpperCase());
          
          // Extract Score/Weight
          let weight = 1; // Default
          if (item.roles.question.score && item.roles.question.score.weight !== undefined) {
            weight = item.roles.question.score.weight;
          }
          questionScores.push(weight);
        }
      });
    }

    renderQuestions(testData, correctAnswers, questionScores);
  } catch (err) {
    console.error('Failed to load data:', err);
    questionsContainer.innerHTML = '<p style="color:red;">Error loading questions. Jika Anda membuka file ini langsung (file://), browser mungkin memblokir file JSON karena CORS. Disarankan menggunakan local server (misal: Live Server di VSCode).</p>';
  }

  function renderQuestions(questions, correctAnswers, questionScores) {
    if (!Array.isArray(questions)) return;
    
    let questionIndex = 0;
    
    // Create a sticky score banner
    const scoreBanner = document.createElement('div');
    scoreBanner.id = 'liveScore';
    scoreBanner.style.position = 'sticky';
    scoreBanner.style.top = '0';
    scoreBanner.style.background = 'rgba(255, 255, 255, 0.9)';
    scoreBanner.style.color = '#333';
    scoreBanner.style.padding = '1rem';
    scoreBanner.style.borderRadius = '8px';
    scoreBanner.style.marginBottom = '1.5rem';
    scoreBanner.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    scoreBanner.style.fontWeight = 'bold';
    scoreBanner.style.fontSize = '1.2rem';
    scoreBanner.style.zIndex = '1000';
    scoreBanner.style.display = 'flex';
    scoreBanner.style.justifyContent = 'space-between';
    scoreBanner.innerHTML = '<span>Total Score: 0</span><span>Menunggu Pilihan...</span>';
    
    // Insert banner before the questions container
    questionsContainer.parentNode.insertBefore(scoreBanner, questionsContainer);

    let totalScore = 0;
    const maxScore = questionScores.reduce((a, b) => a + b, 0);

    questions.forEach((q, idx) => {
      // Directions don't need rendering as a question
      if (q.type === 'direction') {
        const dirCard = document.createElement('div');
        dirCard.className = 'question-card direction-card';
        dirCard.style.backgroundColor = 'rgba(0,0,0,0.2)';
        
        const dirText = document.createElement('h3');
        dirText.textContent = 'Direction';
        dirCard.appendChild(dirText);

        if (q.audio) {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = q.audio.replace('../assets/', 'assets/');
          audio.style.marginTop = '0.5rem';
          dirCard.appendChild(audio);
        }
        questionsContainer.appendChild(dirCard);
        return;
      }

      const card = document.createElement('div');
      card.className = 'question-card';
      // Add data attributes for live scoring
      card.dataset.qIndex = questionIndex;
      card.dataset.weight = questionScores[questionIndex] || 1;
      card.dataset.correct = correctAnswers[questionIndex] || '';
      
      const header = document.createElement('div');
      header.className = 'question-header';
      header.textContent = q.question || '';
      card.appendChild(header);

      if (q.image) {
        const img = document.createElement('img');
        img.src = q.image.replace('../assets/', 'assets/');
        img.alt = 'Question image';
        img.style.maxWidth = '100%';
        img.style.marginBottom = '0.5rem';
        card.appendChild(img);
      }

      if (q.audio) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = q.audio.replace('../assets/', 'assets/');
        audio.style.display = 'block';
        audio.style.marginBottom = '0.5rem';
        card.appendChild(audio);
      }

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options';
      
      q.options?.forEach((opt, optIdx) => {
        const optionId = `q${idx}_opt${optIdx}`;
        const label = document.createElement('label');
        label.className = 'option-label';
        label.htmlFor = optionId;

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `question_${idx}`;
        radio.id = optionId;
        // The value should be 'A', 'B', 'C', 'D'
        let valLetter = opt.charAt(0).toUpperCase();
        if(!['A','B','C','D'].includes(valLetter)){
           // Fallback in case options aren't prefixed with A)
           valLetter = String.fromCharCode(65 + optIdx);
        }
        radio.value = valLetter;

        // Auto calculate score on change
        radio.addEventListener('change', (e) => {
           updateScore();
        });

        label.appendChild(radio);
        const span = document.createElement('span');
        span.textContent = opt;
        label.appendChild(span);
        optionsDiv.appendChild(label);
      });
      card.appendChild(optionsDiv);

      // Display Correct Answer Below (Requested by user)
      const answerDiv = document.createElement('div');
      answerDiv.className = 'correct-answer';
      answerDiv.style.marginTop = '1rem';
      answerDiv.style.padding = '0.5rem';
      answerDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
      answerDiv.style.borderLeft = '4px solid #28a745';
      answerDiv.style.borderRadius = '4px';
      
      const ans = correctAnswers[questionIndex] || 'N/A';
      const wght = questionScores[questionIndex] || 1;
      answerDiv.innerHTML = `<strong>Jawaban Benar:</strong> ${ans} <br><small>Score Point: ${wght}</small>`;
      card.appendChild(answerDiv);

      questionsContainer.appendChild(card);
      questionIndex++;
    });

    function updateScore() {
       let currentScore = 0;
       let answered = 0;
       const allCards = document.querySelectorAll('.question-card[data-correct]');
       allCards.forEach(card => {
          const radios = card.querySelectorAll('input[type="radio"]');
          let isAnswered = false;
          radios.forEach(r => {
             if(r.checked) {
                isAnswered = true;
                if(r.value === card.dataset.correct) {
                   currentScore += parseFloat(card.dataset.weight);
                }
             }
          });
          if(isAnswered) answered++;
       });
       
       scoreBanner.innerHTML = `<span>Total Score: ${currentScore} / ${maxScore}</span><span>Dijawab: ${answered} / ${allCards.length}</span>`;
    }
    
    // Initial display
    updateScore();
  }
});
