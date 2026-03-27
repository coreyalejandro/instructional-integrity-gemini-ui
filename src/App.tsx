import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { AlertCircle, AlertTriangle } from 'lucide-react';
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
  failureClasses: string[];
  overallAssessment: string;
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
  const [error, setError] = useState<string | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  useEffect(() => {
    const savedDraft = localStorage.getItem('instructional_integrity_draft');
    if (savedDraft) {
      setInputText(savedDraft);
    }
  }, []);

  const wordCount = inputText.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isInputValid = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;

  // --- Handlers ---
  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
Ensure the tone is objective, supportive, and extremely clear. Do not use sarcasm or ambiguity.

Text to evaluate:
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
              failureClasses: {
                type: Type.ARRAY,
                description: "List of identified failure patterns, e.g., 'Concept Overload', 'Missing Prerequisite'. Empty array if none.",
                items: { type: Type.STRING }
              },
              overallAssessment: {
                type: Type.STRING,
                description: "A clear, unambiguous summary of the text's cognitive safety. Use simple, direct language."
              }
            },
            required: ["dimensions", "failureClasses", "overallAssessment"]
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
      setError("An error occurred while evaluating the text. Please try again. " + (err.message || ""));
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
        <main className="flex flex-col gap-8">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: WELCOME */}
            {currentStep === 1 && (
              <motion.section
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-8 md:p-12 rounded-[32px] relative overflow-hidden hero-parallax"
              >
                <div className="font-mono text-xs md:text-sm text-zinc-400 tracking-[0.3em] uppercase mb-4">Instructional Integrity / Step 01</div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase leading-[0.9] mb-8">
                  The<br/>Studio
                </h1>
                <p className="text-lg md:text-xl opacity-70 max-w-2xl leading-relaxed mb-12 text-zinc-300">
                  A soft landing for the weary soul. We will guide you step-by-step to ensure your instructional content is cognitively safe and unambiguous. Rest. You're safe here.
                </p>
                
                <div className="viz-card p-8 mb-12 border-l-4 border-l-zinc-500">
                  <h3 className="font-bold text-xl mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <AlertTriangle className="text-zinc-300" />
                    Rules of Engagement
                  </h3>
                  <ul className="list-disc pl-5 space-y-3 text-lg opacity-90 text-zinc-300">
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
            {currentStep === 2 && (
              <motion.section
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-8 md:p-12 rounded-[32px]"
              >
                <div className="font-mono text-xs md:text-sm text-zinc-400 tracking-[0.3em] uppercase mb-4">Artifact Submission / Step 02</div>
                <h2 className="text-4xl md:text-5xl font-bold uppercase mb-8">Provide Text</h2>
                
                <div className="mb-8">
                  <label className="block font-mono text-sm uppercase opacity-60 mb-4 text-zinc-400">Paste your instructional content below ({MIN_WORDS} - {MAX_WORDS} words)</label>
                  <textarea 
                    className="w-full h-64 bg-black/30 backdrop-blur-md border border-border rounded-[20px] p-6 font-sans text-lg text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-y"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
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
                    Commence Evaluation
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
                <h2 className="text-3xl md:text-4xl font-bold uppercase mb-4">Analyzing Cognitive Safety</h2>
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
                  <div className="font-mono text-xs md:text-sm text-zinc-400 tracking-[0.3em] uppercase mb-4">Evaluation Complete / Step 04</div>
                  <h2 className="text-4xl md:text-5xl font-bold uppercase mb-8">Integrity Report</h2>
                  
                  <div className="viz-card p-8 mb-8 bg-zinc-900 text-zinc-100 border-border hover:bg-zinc-900 hover:transform-none">
                    <span className="font-mono text-xs uppercase opacity-80 block mb-4 text-zinc-400">Overall Assessment</span>
                    <p className="text-xl leading-relaxed">{evaluationResult.overallAssessment}</p>
                  </div>

                  {evaluationResult.failureClasses.length > 0 && (
                    <div className="viz-card p-8 mb-8 border-l-4 border-l-red-500/80 hover:transform-none">
                      <span className="font-mono text-xs uppercase text-red-500/80 block mb-4">Identified Risk Patterns</span>
                      <ul className="space-y-4">
                        {evaluationResult.failureClasses.map((fc, i) => (
                          <li key={i} className="flex items-start gap-3 text-lg text-zinc-300">
                            <AlertCircle className="text-red-500/80 shrink-0 mt-1" />
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
                        <span className={cn("font-mono text-2xl", dim.score >= 8 ? "text-zinc-200" : dim.score >= 5 ? "text-zinc-400" : "text-red-400")}>
                          {dim.score}/10
                        </span>
                      </div>
                      <div className="mb-6 flex-grow">
                        <span className="font-mono text-[10px] uppercase text-zinc-500 block mb-2">Evidence</span>
                        <p className="italic text-zinc-300 text-sm">"{dim.evidence}"</p>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <span className="font-mono text-[10px] uppercase text-zinc-500 block mb-2">Remediation</span>
                        <p className="font-medium text-sm text-zinc-200">{dim.remediation}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-4 mb-12">
                  <button 
                    onClick={handleStartOver} 
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-medium text-black transition hover:bg-zinc-200 uppercase tracking-widest"
                  >
                    Evaluate Another Artifact
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
              {currentStep === 1 && "You are currently on Step 1. Please read the rules of engagement carefully. We have designed this process to be unambiguous and safe."}
              {currentStep === 2 && "You are on Step 2. We need you to provide the text you want to evaluate. Ensure you do not skip this step."}
              {currentStep === 3 && "You are on Step 3. The system is analyzing your text. This requires no action from you. Just breathe."}
              {currentStep === 4 && "You are on Step 4. The evaluation is complete. Review the feedback to improve your instructional material."}
            </p>
          </div>

          <ul className="list-none flex flex-col">
            <li className="py-6 border-b border-border flex justify-between items-center hover:pl-4 hover:text-zinc-300 transition-all">
              <span className="uppercase text-sm">Current Step</span>
              <span className="font-mono text-xs text-zinc-500">0{currentStep} / 04</span>
            </li>
            <li className="py-6 border-b border-border flex justify-between items-center hover:pl-4 hover:text-zinc-300 transition-all">
              <span className="uppercase text-sm">Word Count</span>
              <span className="font-mono text-xs text-zinc-500">{wordCount}</span>
            </li>
            <li className="py-6 border-b border-border flex justify-between items-center hover:pl-4 hover:text-zinc-300 transition-all">
              <span className="uppercase text-sm">Status</span>
              <span className={cn("font-mono text-xs", currentStep === 2 && !isInputValid ? "text-red-400" : "text-zinc-300")}>
                {currentStep === 1 && "AWAITING ACKNOWLEDGMENT"}
                {currentStep === 2 && (isInputValid ? "READY" : "INPUT REQUIRED")}
                {currentStep === 3 && "PROCESSING"}
                {currentStep === 4 && "COMPLETE"}
              </span>
            </li>
          </ul>

          {currentStep === 2 && (
            <div className="mt-auto pt-8 border-t border-border">
              <div className="font-mono text-xs text-zinc-500 mb-4">INPUT VALIDATION</div>
              <div className="flex items-end h-[60px] gap-2">
                <div className={cn("flex-1 rounded-t-sm transition-all duration-1000 relative", wordCount > 0 ? "bg-zinc-500 h-full" : "bg-zinc-800 h-[20%]")}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
                <div className={cn("flex-1 rounded-t-sm transition-all duration-1000 relative", wordCount >= MIN_WORDS ? "bg-zinc-300 h-full" : "bg-zinc-800 h-[20%]")}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                </div>
                <div className={cn("flex-1 rounded-t-sm transition-all duration-1000 relative", wordCount <= MAX_WORDS && wordCount >= MIN_WORDS ? "bg-white h-full" : wordCount > MAX_WORDS ? "bg-red-500/80 h-full" : "bg-zinc-800 h-[20%]")}>
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
              <div className="bg-red-950/50 border border-red-900 text-red-200 p-4 rounded-xl text-sm">
                <strong className="block mb-1 font-mono text-xs">ERROR DETECTED</strong>
                {error}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
