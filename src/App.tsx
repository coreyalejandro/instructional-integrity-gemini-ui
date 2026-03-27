import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { Info, Volume2, Square, Undo2 } from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
type Step = 1 | 2 | 3 | 4;

interface DimensionScore {
  name: string;
  score: number;
  evidence: string;
  remediation: string;
}

interface EvaluationResult {
  dimensions: DimensionScore[];
  frictionPoints: string[];
  overallAssessment: string;
}

interface AppError {
  type: 'network' | 'api' | 'validation' | 'unknown';
  title: string;
  message: string;
  solution: string;
}

// --- Constants ---
const MIN_WORDS = 10;
const MAX_WORDS = 2000;

// --- Main Component ---
export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [inputText, setInputText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isPacing, setIsPacing] = useState(false);
  const [highlightedEvidence, setHighlightedEvidence] = useState<number | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem('instructional_integrity_draft');
    if (savedDraft) {
      setInputText(savedDraft);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const wordCount = inputText.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isInputValid = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;

  // --- Handlers ---
  const handleNextStep = () => {
    if (currentStep < 4) {
      if (currentStep === 1) {
        setIsPacing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          setIsPacing(false);
          setCurrentStep(2);
        }, 3500);
      } else {
        setCurrentStep((prev) => (prev + 1) as Step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (!isTypingRef.current) {
      setUndoHistory(prev => [...prev, inputText]);
      isTypingRef.current = true;
    }

    setInputText(newValue);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 1000);
  };

  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previousText = undoHistory[undoHistory.length - 1];
      setUndoHistory(prev => prev.slice(0, -1));
      setInputText(previousText);
      isTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const startEvaluation = async () => {
    handleNextStep(); // Move to step 3 (Processing)
    setIsEvaluating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are the Instructional Integrity Studio backend.
You evaluate instructional text for 'Cognitive Safety'—whether the explanation produces correct understanding in the learner, not just if it is factually true.
Analyze the provided text and return a JSON object with the following structure.

CRITICAL TONE INSTRUCTIONS:
- Ensure the tone is objective, supportive, gentle, and extremely clear.
- NEVER use high-stakes terminology, alarmist language, or mention "legal consequences", "reputational damage", "danger", or "catastrophe".
- Frame remediations as gentle adjustments and supportive guidance rather than urgent warnings.
- Do not use sarcasm or ambiguity.

Text to review:
"""
${inputText}
"""`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dimensions: {
                type: Type.ARRAY,
                description: "Exactly 10 dimensions of cognitive safety evaluation.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the dimension (e.g., 'Prerequisite Clarity', 'Concept Sequencing')" },
                    score: { type: Type.NUMBER, description: "Score from 1 to 10. 1 is very unsafe, 10 is very safe." },
                    evidence: { type: Type.STRING, description: "Specific quote or evidence from the text." },
                    remediation: { type: Type.STRING, description: "Clear, step-by-step instruction on how to fix this issue." }
                  },
                  required: ["name", "score", "evidence", "remediation"]
                }
              },
              frictionPoints: {
                type: Type.ARRAY,
                description: "List of identified cognitive friction points, e.g., 'Concept Overload', 'Missing Prerequisite'. Empty array if none.",
                items: { type: Type.STRING }
              },
              overallAssessment: {
                type: Type.STRING,
                description: "A clear, unambiguous summary of the text's cognitive safety. Use simple, direct language."
              }
            },
            required: ["dimensions", "frictionPoints", "overallAssessment"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("No response from the evaluation service.");
      
      const parsedResult = JSON.parse(resultText) as EvaluationResult;
      setEvaluationResult(parsedResult);
      handleNextStep(); // Move to step 4 (Results)
    } catch (err: any) {
      console.error("Evaluation Error:", err);
      
      let appError: AppError = {
        type: 'unknown',
        title: 'Unexpected Error',
        message: 'An unexpected error occurred during the review process.',
        solution: 'Please try submitting your text again. If the problem persists, save your draft and refresh the page.'
      };

      const errorMessage = err?.message?.toLowerCase() || '';

      if (errorMessage.includes('network') || errorMessage.includes('fetch') || !navigator.onLine) {
        appError = {
          type: 'network',
          title: 'Connection Lost',
          message: 'We could not reach the review servers. This is usually due to a temporary internet connection issue.',
          solution: 'Please check your internet connection and try again. Your draft has been saved.'
        };
      } else if (errorMessage.includes('api key') || errorMessage.includes('401') || errorMessage.includes('403')) {
        appError = {
          type: 'api',
          title: 'Authentication Error',
          message: 'There was an issue authenticating with the review service.',
          solution: 'Please ensure the system is properly configured with a valid API key.'
        };
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        appError = {
          type: 'api',
          title: 'Service Busy',
          message: 'The review service is currently receiving too many requests.',
          solution: 'Please wait a few moments and try your request again.'
        };
      } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
         appError = {
          type: 'api',
          title: 'Service Unavailable',
          message: 'The review service is temporarily down or experiencing issues.',
          solution: 'Please try again later. Your draft is safe.'
        };
      } else if (errorMessage.includes('parse') || errorMessage.includes('json')) {
         appError = {
          type: 'validation',
          title: 'Processing Error',
          message: 'The system received an unexpected response format from the review service.',
          solution: 'Please try modifying your text slightly and submit again.'
        };
      }

      setError(appError);
      setCurrentStep(2); // Go back to input step
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleStartOver = () => {
    setInputText('');
    setEvaluationResult(null);
    setError(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = () => {
    localStorage.setItem('instructional_integrity_draft', inputText);
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  const handleRemediationClick = (index: number) => {
    setHighlightedEvidence(index);
    const element = document.getElementById(`evidence-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedEvidence(null), 3000);
  };

  const toggleReadAloud = () => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
    } else {
      if (!evaluationResult) return;

      const textToRead = `
        Clarity Review.
        Overall Assessment: ${evaluationResult.overallAssessment}.
        ${evaluationResult.frictionPoints.length > 0 ? `Identified Friction Points: ${evaluationResult.frictionPoints.join('. ')}.` : ''}
        Detailed Dimensions:
        ${evaluationResult.dimensions.map(dim => `
          ${dim.name}. Score: ${dim.score} out of 10.
          Evidence: ${dim.evidence}.
          Remediation: ${dim.remediation}.
        `).join(' ')}
      `;

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.9; // Slightly slower for cognitive pacing
      
      utterance.onend = () => setIsReadingAloud(false);
      utterance.onerror = () => setIsReadingAloud(false);

      window.speechSynthesis.speak(utterance);
      setIsReadingAloud(true);
    }
  };

  // --- Parallax Effect ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      const hero = document.querySelector('.hero-parallax') as HTMLElement;
      if (hero) {
        hero.style.transform = `translate(${x * 5}px, ${y * 5}px)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Fixed Top Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-zinc-950 z-50">
        <motion.div 
          className="h-full bg-zinc-200"
          initial={{ width: '25%' }}
          animate={{ width: `${(isPacing ? 1.5 : currentStep) / 4 * 100}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>

      <div className="grid-bg"></div>
      <div className="relative z-10 max-w-[1800px] mx-auto min-h-screen p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[120px_1fr_380px] gap-8">
        
        {/* Left Nav */}
        <nav className="glass-panel hidden lg:flex rounded-[32px] py-8 flex-col items-center justify-between h-[calc(100vh-4rem)] sticky top-8">
          <div className="w-10 h-10 bg-zinc-950 border border-border rounded-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-500"></div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <span className="uppercase tracking-[0.2em] text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:opacity-100 transition-all cursor-pointer" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Archive</span>
            <span className="uppercase tracking-[0.2em] text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:opacity-100 transition-all cursor-pointer" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Atelier</span>
            <span className="uppercase tracking-[0.2em] text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:opacity-100 transition-all cursor-pointer" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>The Clinic</span>
            <span className="uppercase tracking-[0.2em] text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:opacity-100 transition-all cursor-pointer" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Lounge</span>
          </div>
          <div className="text-zinc-500">●</div>
        </nav>

        {/* Main Content */}
        <main className="flex flex-col gap-8 relative">
          {/* Progress Stepper */}
          <div className="glass-panel p-4 md:px-8 rounded-2xl flex items-center justify-between w-full sticky top-4 md:top-8 z-40 shadow-2xl">
            {[
              { id: 1, name: 'Welcome' },
              { id: 2, name: 'Input' },
              { id: 3, name: 'Processing' },
              { id: 4, name: 'Results' }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-all duration-500 border",
                    currentStep === step.id ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" : 
                    currentStep > step.id ? "bg-zinc-800 text-white border-zinc-500" : "bg-zinc-950 text-zinc-700 border-zinc-800"
                  )}>
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  <span className={cn(
                    "font-mono text-[10px] uppercase tracking-widest hidden sm:block transition-colors duration-500",
                    currentStep === step.id ? "text-white font-bold" : currentStep > step.id ? "text-zinc-400" : "text-zinc-600"
                  )}>
                    {step.name}
                  </span>
                </div>
                {index < 3 && (
                  <div className="flex-1 h-[1px] mx-2 sm:mx-4 bg-zinc-800 relative">
                    <div 
                      className="absolute inset-y-0 left-0 bg-zinc-400 transition-all duration-500"
                      style={{ width: currentStep > step.id ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            
            {/* PACING SCREEN */}
            {isPacing && (
              <motion.section
                key="pacing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="glass-panel p-12 rounded-[32px] flex flex-col items-center justify-center min-h-[500px] text-center"
              >
                <div className="w-32 h-32 relative mb-12 flex items-center justify-center">
                  <motion.div 
                    className="absolute inset-0 rounded-full border border-zinc-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="absolute inset-4 rounded-full bg-zinc-800"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="w-2 h-2 rounded-full bg-zinc-300 z-10" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold uppercase mb-6 tracking-widest">Cognitive Pacing</h2>
                <p className="font-mono text-sm text-zinc-400 tracking-[0.2em] uppercase max-w-md leading-relaxed">
                  Take a deep breath. Processing instructions requires a moment of stillness before proceeding.
                </p>
              </motion.section>
            )}

            {/* STEP 1: WELCOME */}
            {currentStep === 1 && !isPacing && (
              <motion.section
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-8 md:p-12 rounded-[32px] relative overflow-hidden hero-parallax"
              >
                <div className="font-mono text-xs md:text-sm text-zinc-400 tracking-[0.3em] uppercase mb-4">Step 1 of 4: Welcome</div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase leading-[0.9] mb-8">
                  The<br/>Studio
                </h1>
                <p className="text-lg md:text-xl max-w-2xl leading-relaxed mb-12 text-white">
                  This platform is designed as a professional and academic tool with a focus on intellectual rigor. We will provide step-by-step guidance to ensure your instructional content is clear and precise. Rest assured, you are in a secure environment.
                </p>
                
                <div className="viz-card p-8 mb-12 border-l-4 border-l-zinc-500">
                  <h3 className="font-bold text-xl mb-4 flex items-center gap-2 uppercase tracking-wide text-white">
                    <Info className="text-white" />
                    Guiding Principles
                  </h3>
                  <ul className="list-disc pl-5 space-y-3 text-lg text-white">
                    <li>Please follow every step in order. Do not skip any steps.</li>
                    <li>Read all instructions on the screen before clicking buttons.</li>
                    <li>If you make a mistake, you can always go back.</li>
                    <li>There is no time limit. Take as much time as you need.</li>
                  </ul>
                </div>
                
                <button 
                  onClick={handleNextStep} 
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-medium text-black transition hover:bg-zinc-200 uppercase tracking-widest"
                >
                  I understand. Proceed to Step 2
                </button>
              </motion.section>
            )}

            {/* STEP 2: INPUT CONTENT */}
            {currentStep === 2 && !isPacing && (
              <motion.section
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-8 md:p-12 rounded-[32px]"
              >
                <div className="font-mono text-xs md:text-sm text-zinc-400 tracking-[0.3em] uppercase mb-4">Step 2 of 4: Input Content</div>
                <h2 className="text-4xl md:text-5xl font-bold uppercase mb-8">Provide Text</h2>
                
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-4">
                    <label className="block font-mono text-sm uppercase opacity-60 text-zinc-400">Paste your instructional content below ({MIN_WORDS} - {MAX_WORDS} words)</label>
                    <button 
                      onClick={handleUndo}
                      disabled={undoHistory.length === 0}
                      className={cn(
                        "font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-1",
                        undoHistory.length > 0 ? "text-zinc-300 hover:text-white" : "text-zinc-600 cursor-not-allowed"
                      )}
                    >
                      <Undo2 className="w-3 h-3" /> Undo
                    </button>
                  </div>
                  <textarea 
                    className="w-full h-64 bg-black/30 backdrop-blur-md border border-border rounded-[20px] p-6 font-sans text-lg text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-y"
                    value={inputText}
                    onChange={handleTextChange}
                    placeholder="Begin typing or paste here..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
                    <button 
                      onClick={handlePrevStep} 
                      className="font-mono text-sm uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      ← Go Back
                    </button>
                    <button 
                      onClick={handleSaveDraft} 
                      className="font-mono text-sm uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {isDraftSaved ? "✓ Saved" : "Save Draft"}
                    </button>
                  </div>
                  <button 
                    onClick={startEvaluation}
                    disabled={!isInputValid}
                    className={cn(
                      "inline-flex items-center justify-center rounded-2xl px-8 py-4 text-sm font-medium transition uppercase tracking-widest w-full sm:w-auto", 
                      isInputValid ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-900 text-zinc-500 cursor-not-allowed border border-border"
                    )}
                  >
                    Begin Review
                  </button>
                </div>
              </motion.section>
            )}

            {/* STEP 3: PROCESSING */}
            {currentStep === 3 && (
              <motion.section
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-12 rounded-[32px] flex flex-col items-center justify-center min-h-[500px] text-center"
              >
                <div className="w-32 h-32 border-4 border-border rounded-full relative mb-8">
                  <motion.div 
                    className="absolute inset-0 border-4 border-zinc-300 rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold uppercase mb-4">Reviewing Instructional Flow</h2>
                <p className="font-mono text-sm text-zinc-400 tracking-[0.2em] uppercase">Please hold. Do not close this window.</p>
              </motion.section>
            )}

            {/* STEP 4: RESULTS */}
            {currentStep === 4 && evaluationResult && (
              <motion.section
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8"
              >
                <div className="glass-panel p-8 md:p-12 rounded-[32px]">
                  <div className="font-mono text-xs md:text-sm text-zinc-400 tracking-[0.3em] uppercase mb-4">Step 4 of 4: Final Review</div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <h2 className="text-4xl md:text-5xl font-bold uppercase">Clarity Review</h2>
                    <button
                      onClick={toggleReadAloud}
                      className={cn(
                        "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-mono text-xs uppercase tracking-widest transition-colors border",
                        isReadingAloud 
                          ? "bg-white text-black border-white" 
                          : "bg-zinc-900 text-zinc-300 border-border hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      {isReadingAloud ? (
                        <><Square className="w-4 h-4 fill-current" /> Stop Audio</>
                      ) : (
                        <><Volume2 className="w-4 h-4" /> Read Aloud</>
                      )}
                    </button>
                  </div>
                  
                  <div className="viz-card p-8 mb-8 bg-zinc-900 text-white border-border hover:bg-zinc-900 hover:transform-none">
                    <span className="font-mono text-xs uppercase opacity-80 block mb-4 text-zinc-400">Overall Assessment</span>
                    <p className="text-xl leading-relaxed">{evaluationResult.overallAssessment}</p>
                  </div>

                  {evaluationResult.frictionPoints.length > 0 && (
                    <div className="viz-card p-8 mb-8 border-l-4 border-l-zinc-500 hover:transform-none">
                      <span className="font-mono text-xs uppercase text-zinc-400 block mb-4">Identified Friction Points</span>
                      <ul className="space-y-4">
                        {evaluationResult.frictionPoints.map((fc, i) => (
                          <li key={i} className="flex items-start gap-3 text-lg text-white">
                            <Info className="text-white shrink-0 mt-1" />
                            {fc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {evaluationResult.dimensions.map((dim, i) => (
                    <div key={i} className="viz-card p-8 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <span className="font-mono text-xs uppercase text-zinc-400 block max-w-[70%]">{dim.name}</span>
                        <span className={cn("font-mono text-2xl", dim.score >= 8 ? "text-white" : dim.score >= 5 ? "text-zinc-300" : "text-zinc-400")}>
                          {dim.score}/10
                        </span>
                      </div>
                      <div 
                        id={`evidence-${i}`}
                        className={cn(
                          "mb-6 flex-grow transition-all duration-500 rounded-xl",
                          highlightedEvidence === i ? "bg-zinc-800/80 p-4 -mx-4 shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "p-0"
                        )}
                      >
                        <span className="font-mono text-[10px] uppercase text-zinc-400 block mb-2">Evidence</span>
                        <p className="italic text-base text-white leading-relaxed">"{dim.evidence}"</p>
                      </div>
                      <div 
                        className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer group hover:bg-zinc-800 transition-colors mt-auto"
                        onClick={() => handleRemediationClick(i)}
                      >
                        <span className="font-mono text-[10px] uppercase text-zinc-400 block mb-2 group-hover:text-zinc-300 transition-colors flex items-center gap-1">
                          Remediation <Info className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <p className="font-medium text-base text-white leading-relaxed">{dim.remediation}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-4 mb-12">
                  <button 
                    onClick={handleStartOver} 
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-medium text-black transition hover:bg-zinc-200 uppercase tracking-widest"
                  >
                    Review Another Artifact
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar */}
        <aside className="bg-zinc-950 border border-border text-foreground rounded-[32px] p-8 flex flex-col gap-8 shadow-glow h-fit lg:h-[calc(100vh-4rem)] lg:sticky top-8 overflow-y-auto">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-zinc-900 px-3 py-1 text-xs text-zinc-300 font-mono mb-6">
              ● SYSTEM CONCIERGE
            </span>
            <h2 className="text-3xl font-semibold mb-4">Safe Harbor.</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {currentStep === 1 && !isPacing && "You are currently on Step 1 of 4: Welcome. Please read the guiding principles carefully. We have designed this process to be unambiguous and safe."}
              {isPacing && "Cognitive pacing active. We intentionally slow down transitions to prevent rushing and ensure mindful engagement."}
              {currentStep === 2 && !isPacing && "You are on Step 2 of 4: Input Content. We need you to provide the text you want to review. Ensure you do not skip this step."}
              {currentStep === 3 && "You are on Step 3 of 4: Processing. The system is reviewing your text. This requires no action from you. Just breathe."}
              {currentStep === 4 && "You are on Step 4 of 4: Final Review. The review is complete. Read the feedback to improve your instructional material."}
            </p>
          </div>

          <ul className="list-none flex flex-col">
            <li className="py-6 border-b border-border flex justify-between items-center hover:pl-4 hover:text-zinc-300 transition-all">
              <span className="uppercase text-sm">Current Step</span>
              <span className="font-mono text-xs text-zinc-500">Step {currentStep} of 4</span>
            </li>
            <li className="py-6 border-b border-border flex justify-between items-center hover:pl-4 hover:text-zinc-300 transition-all">
              <span className="uppercase text-sm">Word Count</span>
              <span className="font-mono text-xs text-zinc-500">{wordCount}</span>
            </li>
            <li className="py-6 border-b border-border flex justify-between items-center hover:pl-4 hover:text-zinc-300 transition-all">
              <span className="uppercase text-sm">Status</span>
              <span className={cn("font-mono text-xs", currentStep === 2 && !isInputValid && !isPacing ? "text-amber-400" : "text-zinc-300")}>
                {currentStep === 1 && !isPacing && "AWAITING ACKNOWLEDGMENT"}
                {isPacing && "COGNITIVE PACING"}
                {currentStep === 2 && !isPacing && (isInputValid ? "READY" : "INPUT REQUIRED")}
                {currentStep === 3 && "PROCESSING"}
                {currentStep === 4 && "COMPLETE"}
              </span>
            </li>
          </ul>

          {currentStep === 2 && !isPacing && (
            <div className="mt-auto pt-8 border-t border-border">
              <div className="font-mono text-xs text-zinc-500 mb-4">INPUT VALIDATION</div>
              <div className="flex items-end h-[60px] gap-2">
                <div className={cn("flex-1 rounded-t-sm transition-all duration-1000 relative", wordCount > 0 ? "bg-zinc-500 h-full" : "bg-zinc-800 h-[20%]")}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
                <div className={cn("flex-1 rounded-t-sm transition-all duration-1000 relative", wordCount >= MIN_WORDS ? "bg-zinc-300 h-full" : "bg-zinc-800 h-[20%]")}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
                <div className={cn("flex-1 rounded-t-sm transition-all duration-1000 relative", wordCount <= MAX_WORDS && wordCount >= MIN_WORDS ? "bg-white h-full" : wordCount > MAX_WORDS ? "bg-zinc-600 h-full" : "bg-zinc-800 h-[20%]")}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
              </div>
              <div className="mt-4 font-mono text-[10px] flex justify-between text-zinc-500">
                <span>MIN: {MIN_WORDS}</span>
                <span>MAX: {MAX_WORDS}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-auto pt-8 border-t border-border">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Info className="text-zinc-300 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-2 font-mono text-xs uppercase tracking-widest text-white">
                      {error.title}
                    </strong>
                    <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                      {error.message}
                    </p>
                    <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                      <span className="font-mono text-[10px] uppercase text-zinc-500 block mb-1">Suggested Action</span>
                      <p className="text-sm text-white font-medium">{error.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
