/**
 * Question View Logic
 * Handles question display and navigation
 */

class QuestionController {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadQuestion();
    }

    initializeElements() {
        this.questionText = document.getElementById('question-text');
        this.topicName = document.getElementById('topic-name');
        this.questionNumber = document.getElementById('question-number');
    }

    bindEvents() {
        // Handle keyboard navigation
        document.addEventListener('keydown', (event) => {
            this.handleKeyNavigation(event);
        });
    }

    handleKeyNavigation(event) {
        switch(event.key) {
            case 'Enter':
                event.preventDefault();
                this.showAnswer();
                break;
        }
    }

    loadQuestion() {
        // Get topic and question data from URL parameters or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const topicId = urlParams.get('topic') || localStorage.getItem('selectedTopic');

        // Get a random question for this topic
        const questions = this.getQuestionsForTopic(topicId);
        const randomIndex = Math.floor(Math.random() * questions.length);
        const currentQuestion = questions[randomIndex];

        if (currentQuestion) {
            this.questionText.textContent = currentQuestion.question;
            this.topicName.textContent = currentQuestion.topic;
            
            // Store the answer for the answer view
            localStorage.setItem('currentAnswer', currentQuestion.answer);
            localStorage.setItem('currentQuestion', currentQuestion.question);
            localStorage.setItem('currentTopic', currentQuestion.topic);
        } else {
            // No questions available for this topic
            this.questionText.textContent = "No questions available for this topic.";
            this.topicName.textContent = "Unknown Topic";
        }
    }

    getQuestionsForTopic(topicId) {
        const questionBank = {
            '1': [ // Geography
                { question: "What is the capital city of France?", topic: "Geography", answer: "Paris" },
                { question: "Which is the longest river in the world?", topic: "Geography", answer: "The Nile" },
                { question: "What is the smallest country in the world?", topic: "Geography", answer: "Vatican City" },
                { question: "Which continent is known as the 'Dark Continent'?", topic: "Geography", answer: "Africa" }
            ],
            '2': [ // History
                { question: "In which year did World War II end?", topic: "History", answer: "1945" },
                { question: "Who was the first person to walk on the moon?", topic: "History", answer: "Neil Armstrong" },
                { question: "Which ancient wonder was located in Alexandria?", topic: "History", answer: "The Lighthouse of Alexandria" },
                { question: "What year did the Berlin Wall fall?", topic: "History", answer: "1989" }
            ],
            '3': [ // Science
                { question: "What is the chemical symbol for gold?", topic: "Science", answer: "Au" },
                { question: "How many bones are in the human body?", topic: "Science", answer: "206" },
                { question: "What is the speed of light in a vacuum?", topic: "Science", answer: "299,792,458 meters per second" },
                { question: "Which planet is known as the Red Planet?", topic: "Science", answer: "Mars" }
            ],
            '4': [ // Sports
                { question: "How many players are on a basketball team?", topic: "Sports", answer: "5" },
                { question: "Which country won the 2018 FIFA World Cup?", topic: "Sports", answer: "France" },
                { question: "What is the maximum score in a single frame of snooker?", topic: "Sports", answer: "147" },
                { question: "In which sport would you perform a slam dunk?", topic: "Sports", answer: "Basketball" }
            ],
            '5': [ // Movies
                { question: "Who directed the movie 'Pulp Fiction'?", topic: "Movies", answer: "Quentin Tarantino" },
                { question: "Which movie won the Academy Award for Best Picture in 2020?", topic: "Movies", answer: "Parasite" },
                { question: "What is the highest-grossing movie of all time?", topic: "Movies", answer: "Avatar" },
                { question: "Who played Jack in the movie 'Titanic'?", topic: "Movies", answer: "Leonardo DiCaprio" }
            ],
            '6': [ // Music
                { question: "Which band released the album 'Abbey Road'?", topic: "Music", answer: "The Beatles" },
                { question: "What is the most streamed song on Spotify?", topic: "Music", answer: "Blinding Lights by The Weeknd" },
                { question: "Which instrument has 88 keys?", topic: "Music", answer: "Piano" },
                { question: "Who is known as the 'King of Pop'?", topic: "Music", answer: "Michael Jackson" }
            ],
            '7': [ // Literature
                { question: "Who wrote 'To Kill a Mockingbird'?", topic: "Literature", answer: "Harper Lee" },
                { question: "Which Shakespeare play features the character Hamlet?", topic: "Literature", answer: "Hamlet" },
                { question: "What is the first book in the Harry Potter series?", topic: "Literature", answer: "Harry Potter and the Philosopher's Stone" },
                { question: "Who wrote '1984'?", topic: "Literature", answer: "George Orwell" }
            ],
            '8': [ // Art
                { question: "Who painted the Mona Lisa?", topic: "Art", answer: "Leonardo da Vinci" },
                { question: "Which art movement was led by Pablo Picasso?", topic: "Art", answer: "Cubism" },
                { question: "What is the most expensive painting ever sold?", topic: "Art", answer: "Salvator Mundi by Leonardo da Vinci" },
                { question: "Who sculpted 'The Thinker'?", topic: "Art", answer: "Auguste Rodin" }
            ],
            '9': [ // Technology
                { question: "What does CPU stand for?", topic: "Technology", answer: "Central Processing Unit" },
                { question: "Which company developed the iPhone?", topic: "Technology", answer: "Apple" },
                { question: "What is the most popular programming language?", topic: "Technology", answer: "JavaScript" },
                { question: "What does AI stand for?", topic: "Technology", answer: "Artificial Intelligence" }
            ],
            '10': [ // Food & Drink
                { question: "What is the main ingredient in hummus?", topic: "Food & Drink", answer: "Chickpeas" },
                { question: "Which country is known for inventing pizza?", topic: "Food & Drink", answer: "Italy" },
                { question: "What is the most consumed beverage in the world?", topic: "Food & Drink", answer: "Water" },
                { question: "Which spice is known as 'black gold'?", topic: "Food & Drink", answer: "Black pepper" }
            ],
            '11': [ // Nature
                { question: "What is the largest mammal in the world?", topic: "Nature", answer: "Blue whale" },
                { question: "Which tree is known for its red autumn leaves?", topic: "Nature", answer: "Maple tree" },
                { question: "What is the fastest land animal?", topic: "Nature", answer: "Cheetah" },
                { question: "Which flower is associated with the Netherlands?", topic: "Nature", answer: "Tulip" }
            ],
            '12': [ // Politics
                { question: "How many members are in the US Senate?", topic: "Politics", answer: "100" },
                { question: "Which country has the oldest written constitution?", topic: "Politics", answer: "United States" },
                { question: "What is the capital of Australia?", topic: "Politics", answer: "Canberra" },
                { question: "Which organization has 193 member countries?", topic: "Politics", answer: "United Nations" }
            ],
            '13': [ // Fashion
                { question: "Which designer created the little black dress?", topic: "Fashion", answer: "Coco Chanel" },
                { question: "What is the most expensive fabric in the world?", topic: "Fashion", answer: "Vicuna wool" },
                { question: "Which country is known for haute couture?", topic: "Fashion", answer: "France" },
                { question: "What does 'prêt-à-porter' mean?", topic: "Fashion", answer: "Ready to wear" }
            ],
            '14': [ // Travel
                { question: "Which city is known as the 'City of Light'?", topic: "Travel", answer: "Paris" },
                { question: "What is the most visited country in the world?", topic: "Travel", answer: "France" },
                { question: "Which airline is the largest in the world?", topic: "Travel", answer: "American Airlines" },
                { question: "What is the longest river cruise route?", topic: "Travel", answer: "The Nile" }
            ],
            '15': [ // Games
                { question: "What is the most sold video game of all time?", topic: "Games", answer: "Minecraft" },
                { question: "Which game uses 32 pieces on a 64-square board?", topic: "Games", answer: "Chess" },
                { question: "What is the highest possible score in bowling?", topic: "Games", answer: "300" },
                { question: "Which card game is known as '21'?", topic: "Games", answer: "Blackjack" }
            ],
            '16': [ // Miscellaneous
                { question: "What is the most common surname in the world?", topic: "Miscellaneous", answer: "Wang" },
                { question: "Which animal is known for its ability to change colors?", topic: "Miscellaneous", answer: "Chameleon" },
                { question: "What is the most expensive element on Earth?", topic: "Miscellaneous", answer: "Francium" },
                { question: "Which planet has the most moons?", topic: "Miscellaneous", answer: "Saturn" }
            ]
        };

        return questionBank[topicId] || [{ question: "No questions available for this topic.", topic: "Unknown", answer: "N/A" }];
    }

    showAnswer() {
        // Navigate to answer view
        window.location.href = 'answer.html';
    }
}

// Initialize question controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuestionController();
});
