import { useState, useRef } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);

  // NOVA VOICE RESPONSE
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-IN";
    speech.rate = 1;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  // SEND MESSAGE TO GEMINI
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setError("");
    setReply("");

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode: "nova",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "NOVA could not respond.");
      }

      const answer = data.reply || data.message || "No response received.";

      setReply(answer);
      speak(answer);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // VOICE INPUT
  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice recognition is not supported. Please use Chrome.");
      return;
    }

    setError("");

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;

      setMessage(text);
      sendMessage(text);
    };

    recognition.onerror = () => {
      setListening(false);
      setError("Voice recognition failed. Please try again.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="nova-app">

      <nav className="navbar">
        <div className="brand">
          <span className="brand-symbol">✦</span>
          <span>NOVA</span>
          <span className="brand-divider">×</span>
          <span className="brand-light">VOICE AI</span>
        </div>

        <div className="nav-status">
          <span className="status-dot"></span>
          PERSONAL INTELLIGENCE
        </div>

        <button className="menu-button">☰</button>
      </nav>

      <main className="hero">

        <div className="hero-label">
          <span className="label-line"></span>
          YOUR WORLD, IN YOUR VOICE
          <span className="label-line"></span>
        </div>

        <h1>
          Meet the voice
          <br />
          <span>of your future.</span>
        </h1>

        <p className="hero-description">
          An intelligence that listens, understands,
          <br />
          and moves with you.
        </p>

        <div className={`nova-orb ${listening ? "listening" : ""}`}>

          <div className="orb-ring ring-one"></div>
          <div className="orb-ring ring-two"></div>
          <div className="orb-ring ring-three"></div>

          <div className="orb-core">
            <div className="orb-light"></div>
            <span>✦</span>
          </div>

          <div className="orb-caption">
            {listening
              ? "LISTENING..."
              : loading
              ? "THINKING..."
              : "NOVA IS HERE"}
          </div>

        </div>

        <button
          className="talk-button"
          onClick={startVoice}
          disabled={listening || loading}
        >
          <span className="mic-icon">🎙</span>

          {listening
            ? "Listening..."
            : loading
            ? "Thinking..."
            : "Talk to NOVA"}

          <span className="button-arrow">↗</span>
        </button>

        <div className="hero-note">
          <span className="note-dot"></span>

          {listening
            ? "Speak naturally. NOVA is listening."
            : loading
            ? "NOVA is thinking..."
            : "Your personal AI · Always ready"}
        </div>

        <div className="feature-row">

          <div className="feature">
            <span className="feature-icon">◉</span>
            <div>
              <h3>Understands</h3>
              <p>Your voice, your way</p>
            </div>
          </div>

          <div className="feature">
            <span className="feature-icon">✧</span>
            <div>
              <h3>Thinks</h3>
              <p>Beyond the ordinary</p>
            </div>
          </div>

          <div className="feature">
            <span className="feature-icon">⌁</span>
            <div>
              <h3>Responds</h3>
              <p>With intelligent answers</p>
            </div>
          </div>

        </div>

        {message && (
          <div className="voice-response">
            <p>You said:</p>
            <div>{message}</div>
          </div>
        )}

        {reply && (
          <div className="voice-response">
            <p>✦ NOVA</p>
            <div>{reply}</div>
          </div>
        )}

        {error && (
          <div className="voice-response">
            <p>Error</p>
            <div>{error}</div>
          </div>
        )}

      </main>

      <footer className="footer">
        <span>NOVA × EMPTY AI</span>
        <span>INTELLIGENCE, IN YOUR HANDS</span>
      </footer>

    </div>
  );
}