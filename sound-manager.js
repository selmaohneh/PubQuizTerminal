/**
 * Sound Manager Component
 * Handles playing audio effects throughout the pub quiz application
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.audioContext = null;
        this.isEnabled = true;
        this.volume = 0.7;
        this.audioUnlocked = false;
        this.initializeSounds();
        this.setupAudioUnlock();
    }

    initializeSounds() {
        // Define available sound effects with proper paths for Electron app
        // Detect the current location and adjust paths accordingly
        const currentPath = window.location.pathname;
        let pathPrefix = '';
        
        // For Electron apps, we need to handle file:// protocol paths
        if (currentPath.includes('/topicquiz/')) {
            pathPrefix = '../';
        }
        
        // Alternative: try absolute paths from app root if relative fails
        const soundFiles = {
            ding: `${pathPrefix}sound-effects/ding.mp3`,
            correct: `${pathPrefix}sound-effects/correct.mp3`,
            buzzer: `${pathPrefix}sound-effects/buzzer.mp3`,
            error: `${pathPrefix}sound-effects/error.mp3`,
            completed: `${pathPrefix}sound-effects/completed.mp3`
        };
        
        console.log('Current path:', currentPath);
        console.log('Path prefix:', pathPrefix);

        // Pre-load audio objects for better performance
        Object.keys(soundFiles).forEach(soundName => {
            this.sounds[soundName] = new Audio(soundFiles[soundName]);
            this.sounds[soundName].volume = this.volume;
            this.sounds[soundName].preload = 'auto';
            
            // Handle loading errors gracefully
            this.sounds[soundName].addEventListener('error', (e) => {
                console.warn(`Failed to load sound: ${soundName} from path: ${soundFiles[soundName]}`, e);
            });
            
            // Log successful loading
            this.sounds[soundName].addEventListener('canplaythrough', () => {
                console.log(`Sound loaded successfully: ${soundName}`);
            });
        });
        
        console.log('Sound Manager initialized with paths:', soundFiles);
    }

    setupAudioUnlock() {
        // Set up event listeners to unlock audio on first user interaction
        const unlockAudio = () => {
            if (!this.audioUnlocked) {
                // Try to play a silent sound to unlock audio
                Object.values(this.sounds).forEach(sound => {
                    const originalVolume = sound.volume;
                    sound.volume = 0;
                    sound.play().then(() => {
                        sound.pause();
                        sound.currentTime = 0;
                        sound.volume = originalVolume;
                    }).catch(() => {
                        // Ignore errors for unlock attempt
                    });
                });
                this.audioUnlocked = true;
                console.log('Audio unlocked after user interaction');
                
                // Remove event listeners after first unlock
                document.removeEventListener('keydown', unlockAudio);
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
            }
        };

        // Listen for any user interaction to unlock audio
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
    }

    /**
     * Play a sound effect
     * @param {string} soundName - Name of the sound to play ('ding', 'correct', 'buzzer', 'error', 'completed')
     * @param {number} volume - Optional volume override (0.0 to 1.0)
     */
    play(soundName, volume = null) {
        console.log(`Attempting to play sound: ${soundName}`);
        
        if (!this.isEnabled) {
            console.log('Sound manager is disabled');
            return;
        }

        const sound = this.sounds[soundName];
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        try {
            // Set volume if provided
            if (volume !== null) {
                sound.volume = Math.max(0, Math.min(1, volume));
            } else {
                sound.volume = this.volume;
            }

            // Reset playback position and play
            sound.currentTime = 0;
            const playPromise = sound.play();
            
            // Handle play promise for better browser compatibility
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log(`Successfully played sound: ${soundName}`);
                    })
                    .catch(error => {
                        console.warn(`Failed to play sound: ${soundName}`, error);
                        // If autoplay is blocked, provide user feedback
                        if (error.name === 'NotAllowedError') {
                            console.log('Autoplay blocked - user interaction required first');
                        }
                    });
            }
        } catch (error) {
            console.warn(`Error playing sound: ${soundName}`, error);
        }
    }

    /**
     * Set the global volume for all sounds
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }

    /**
     * Enable or disable sound effects
     * @param {boolean} enabled - Whether sounds should be enabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Get current volume level
     * @returns {number} Current volume (0.0 to 1.0)
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Check if sounds are enabled
     * @returns {boolean} Whether sounds are enabled
     */
    isAudioEnabled() {
        return this.isEnabled;
    }

    /**
     * Play the ding sound (for topic selection/question display)
     */
    playDing() {
        this.play('ding');
    }

    /**
     * Play the correct sound (for correct answer reveal)
     */
    playCorrect() {
        this.play('correct');
    }

    /**
     * Play the buzzer sound (for wrong answers or errors)
     */
    playBuzzer() {
        this.play('buzzer');
    }

    /**
     * Play the error sound (for system errors)
     */
    playError() {
        this.play('error');
    }

    /**
     * Play the completed sound (for quiz completion)
     */
    playCompleted() {
        this.play('completed');
    }

    /**
     * Test function to play all sounds in sequence (for debugging)
     */
    testAllSounds() {
        console.log('Testing all sounds...');
        const sounds = ['ding', 'correct', 'buzzer', 'error', 'completed'];
        let index = 0;
        
        const playNext = () => {
            if (index < sounds.length) {
                console.log(`Testing sound: ${sounds[index]}`);
                this.play(sounds[index]);
                index++;
                setTimeout(playNext, 1000); // Wait 1 second between sounds
            } else {
                console.log('Sound test completed');
            }
        };
        
        playNext();
    }
}

// Create a global instance for easy access
const soundManager = new SoundManager();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}
