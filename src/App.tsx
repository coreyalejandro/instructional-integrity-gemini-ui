import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { Info, Volume2, Square, Undo2, MessageSquare, X, History, Download, Bot, Send, Minimize2, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { cn } from './lib/utils';

// --- Types ---
type Step = 1 | 2 | 3 | 4;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ArtifactVersion {
  id: string;
  timestamp: number;
  text: string;
  wordCount: number;
}

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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [thinkAloudText, setThinkAloudText] = useState('');
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'Hi! I am your Live Concierge. How can I help you with the app today?' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem('instructional_integrity_draft');
    if (savedDraft) {
      setInputText(savedDraft);
    }
    const savedVersions = localStorage.getItem('instructional_integrity_versions');
    if (savedVersions) {
      try {
        setVersions(JSON.parse(savedVersions));
      } catch (e) {
        console.error("Failed to parse saved versions", e);
      }
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

  const getChat = () => {
    if (!chatRef.current) {
      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });
      chatRef.current = ai.chats.create({
        model: 'gemini-3.1-flash-lite-preview',
        config: {
          systemInstruction: "You are the Live Concierge for the Instructional Integrity Studio. Provide fast, on-demand tech support. Help users navigate the app, explain the UI, and troubleshoot. DO NOT evaluate instructional content. Keep responses short, friendly, and low-latency."
        }
      });
    }
    return chatRef.current;
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSuccess(true);
      setTimeout(() => {
        setIsFeedbackModalOpen(false);
        setFeedbackSuccess(false);
        setFeedbackText('');
      }, 2000);
    }, 1000);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    try {
      const chat = getChat();
      const response = await chat.sendMessageStream({ message: userMsg });
      let modelText = '';
      setChatMessages(prev => [...prev, { role: 'model', text: '' }]);
      for await (const chunk of response) {
        modelText += chunk.text;
        setChatMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelText;
          return newMessages;
        });
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered a network error. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const startEvaluation = async () => {
    handleNextStep(); // Move to step 3 (Processing)
    setIsEvaluating(true);
    setThinkAloudText('');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });
      
      const prompt = `You are the Instructional Integrity Studio backend.
You evaluate instructional text for 'Cognitive Safety'—whether the explanation produces correct understanding in the learner, not just if it is factually true.

CRITICAL TONE INSTRUCTIONS:
- Ensure the tone is objective, supportive, gentle, and extremely clear.
- NEVER use high-stakes terminology, alarmist language, or mention "legal consequences", "reputational damage", "danger", or "catastrophe".
- Frame remediations as gentle adjustments and supportive guidance rather than urgent warnings.
- Do not use sarcasm or ambiguity.

Task 1: Think Aloud
First, provide a "Think Aloud" narrative. Explain your thought process as you read the text, what you are looking for regarding clarity, cognitive load, and instructional integrity, and your initial impressions. Write 2-3 paragraphs.

Task 2: JSON Evaluation
Then, provide the final evaluation strictly as a JSON object enclosed in \`\`\`json ... \`\`\`.

JSON Structure:
{
  "dimensions": [
    { "name": "string", "score": number (1-10), "evidence": "string", "remediation": "string" }
  ],
  "frictionPoints": ["string"],
  "overallAssessment": "string"
}

Text to review:
"""
${inputText}
"""`;

      const response = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      let fullText = '';
      for await (const chunk of response) {
        fullText += chunk.text;
        const thinkAloudPart = fullText.split('```json')[0];
        setThinkAloudText(thinkAloudPart);
      }

      const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
      let jsonString = '';
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
      } else {
        const startIdx = fullText.indexOf('{');
        const endIdx = fullText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          jsonString = fullText.substring(startIdx, endIdx + 1);
        } else {
          throw new Error("Could not parse JSON from response.");
        }
      }

      const parsedResult = JSON.parse(jsonString) as EvaluationResult;
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
    
    // Save as a version
    const newVersion: ArtifactVersion = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      timestamp: Date.now(),
      text: inputText,
      wordCount: wordCount
    };
    
    const updatedVersions = [newVersion, ...versions].slice(0, 20); // Keep last 20 versions
    setVersions(updatedVersions);
    localStorage.setItem('instructional_integrity_versions', JSON.stringify(updatedVersions));

    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  const handleRestoreVersion = (version: ArtifactVersion) => {
    setUndoHistory(prev => [...prev, inputText]); // Allow undoing the restore
    setInputText(version.text);
    setIsVersionHistoryModalOpen(false);
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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (format: 'json' | 'txt' | 'md' | 'docx' | 'pdf') => {
    if (!evaluationResult) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `instructional-review-${timestamp}`;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(evaluationResult, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${filename}.json`);
    } else if (format === 'txt') {
      let content = `Instructional Integrity Review\n\n`;
      content += `Overall Assessment:\n${evaluationResult.overallAssessment}\n\n`;
      if (evaluationResult.frictionPoints.length > 0) {
        content += `Friction Points:\n- ${evaluationResult.frictionPoints.join('\n- ')}\n\n`;
      }
      content += `Dimensions:\n`;
      evaluationResult.dimensions.forEach(dim => {
        content += `\n[${dim.score}/10] ${dim.name}\n`;
        content += `Evidence: ${dim.evidence}\n`;
        content += `Remediation: ${dim.remediation}\n`;
      });
      const blob = new Blob([content], { type: 'text/plain' });
      downloadBlob(blob, `${filename}.txt`);
    } else if (format === 'md') {
      let content = `# Instructional Integrity Review\n\n`;
      content += `## Overall Assessment\n${evaluationResult.overallAssessment}\n\n`;
      if (evaluationResult.frictionPoints.length > 0) {
        content += `## Friction Points\n- ${evaluationResult.frictionPoints.join('\n- ')}\n\n`;
      }
      content += `## Dimensions\n`;
      evaluationResult.dimensions.forEach(dim => {
        content += `\n### ${dim.name} (${dim.score}/10)\n`;
        content += `**Evidence:** ${dim.evidence}\n\n`;
        content += `**Remediation:** ${dim.remediation}\n`;
      });
      const blob = new Blob([content], { type: 'text/markdown' });
      downloadBlob(blob, `${filename}.md`);
    } else if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "Instructional Integrity Review", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "Overall Assessment", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: evaluationResult.overallAssessment }),
            ...(evaluationResult.frictionPoints.length > 0 ? [
              new Paragraph({ text: "Friction Points", heading: HeadingLevel.HEADING_2 }),
              ...evaluationResult.frictionPoints.map(fp => new Paragraph({ text: fp, bullet: { level: 0 } }))
            ] : []),
            new Paragraph({ text: "Dimensions", heading: HeadingLevel.HEADING_2 }),
            ...evaluationResult.dimensions.flatMap(dim => [
              new Paragraph({ text: `${dim.name} (${dim.score}/10)`, heading: HeadingLevel.HEADING_3 }),
              new Paragraph({ children: [new TextRun({ text: "Evidence: ", bold: true }), new TextRun({ text: dim.evidence })] }),
              new Paragraph({ children: [new TextRun({ text: "Remediation: ", bold: true }), new TextRun({ text: dim.remediation })] }),
            ])
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${filename}.docx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      let y = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const maxWidth = 180;

      const addText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        for (let i = 0; i < lines.length; i++) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(lines[i], margin, y);
          y += fontSize * 0.4; // line height approx
        }
        y += 5; // paragraph spacing
      };

      addText("Instructional Integrity Review", 18, true);
      y += 5;
      addText("Overall Assessment", 14, true);
      addText(evaluationResult.overallAssessment, 11);
      
      if (evaluationResult.frictionPoints.length > 0) {
        addText("Friction Points", 14, true);
        evaluationResult.frictionPoints.forEach(fp => addText(`• ${fp}`, 11));
      }

      addText("Dimensions", 14, true);
      evaluationResult.dimensions.forEach(dim => {
        addText(`${dim.name} (${dim.score}/10)`, 12, true);
        addText(`Evidence: ${dim.evidence}`, 11);
        addText(`Remediation: ${dim.remediation}`, 11);
        y += 5;
      });

      doc.save(`${filename}.pdf`);
    }
    setIsDownloadModalOpen(false);
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
                      disabled={!inputText.trim()}
                      className="font-mono text-sm uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDraftSaved ? "✓ Version Saved" : "Save Version"}
                    </button>
                    <button 
                      onClick={() => setIsVersionHistoryModalOpen(true)} 
                      disabled={versions.length === 0}
                      className="font-mono text-sm uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <History className="w-4 h-4" /> History
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
                <div className="w-16 h-16 border-4 border-zinc-800 border-t-white rounded-full mb-8 relative">
                  <motion.div 
                    className="absolute inset-0 border-4 border-zinc-300 rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold uppercase mb-4">Reviewing Instructional Flow</h2>
                <p className="font-mono text-sm text-zinc-400 tracking-[0.2em] uppercase mb-8">Applying cognitive safety heuristics...</p>
                
                {/* Think Aloud Box */}
                <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-left overflow-hidden relative mt-4">
                   <div className="font-mono text-[10px] uppercase text-zinc-500 mb-3 flex items-center gap-2">
                     <Sparkles className="w-3 h-3" /> Live Think Aloud
                   </div>
                   <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap h-[200px] overflow-y-auto custom-scrollbar pr-2">
                     {thinkAloudText || "Initiating cognitive assessment..."}
                     <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse" />
                   </div>
                </div>
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

                <div className="flex justify-center gap-4 mt-4 mb-12 flex-wrap">
                  <button 
                    onClick={() => setIsDownloadModalOpen(true)} 
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 px-8 py-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" /> Download Results
                  </button>
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

          <div className="mt-auto pt-8 border-t border-border">
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-mono text-xs uppercase tracking-widest transition-colors border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <MessageSquare className="w-4 h-4" />
              Send Feedback
            </button>
          </div>
        </aside>
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 md:p-12 w-full max-w-lg shadow-2xl relative"
            >
              <button
                onClick={() => !isSubmittingFeedback && setIsFeedbackModalOpen(false)}
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
                disabled={isSubmittingFeedback}
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-3xl font-bold uppercase mb-2">Feedback</h3>
              <p className="text-zinc-400 mb-8">Help us improve the Instructional Integrity Studio. Report issues or suggest new features.</p>

              {feedbackSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center"
                >
                  <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold uppercase mb-2">Thank You</h4>
                  <p className="text-zinc-400">Your feedback has been successfully submitted and will be reviewed by our team.</p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-6">
                  <textarea
                    className="w-full h-40 bg-black/30 backdrop-blur-md border border-zinc-800 rounded-[20px] p-6 font-sans text-base text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
                    placeholder="Describe your issue or suggestion..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    disabled={isSubmittingFeedback}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsFeedbackModalOpen(false)}
                      disabled={isSubmittingFeedback}
                      className="px-6 py-3 rounded-2xl font-mono text-xs uppercase tracking-widest transition-colors text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={!feedbackText.trim() || isSubmittingFeedback}
                      className={cn(
                        "px-8 py-3 rounded-2xl font-mono text-xs uppercase tracking-widest transition-colors flex items-center justify-center min-w-[140px]",
                        feedbackText.trim() && !isSubmittingFeedback
                          ? "bg-white text-black hover:bg-zinc-200"
                          : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                      )}
                    >
                      {isSubmittingFeedback ? (
                        <motion.div
                          className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      ) : (
                        "Submit"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Version History Modal */}
      <AnimatePresence>
        {isVersionHistoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 md:p-12 w-full max-w-2xl shadow-2xl relative max-h-[80vh] flex flex-col"
            >
              <button
                onClick={() => setIsVersionHistoryModalOpen(false)}
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-3xl font-bold uppercase mb-2">Version History</h3>
              <p className="text-zinc-400 mb-8">Review and restore previous versions of your instructional artifact.</p>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {versions.length === 0 ? (
                  <p className="text-zinc-500 font-mono text-sm">No versions saved yet.</p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-zinc-400 mb-2">
                          {new Date(v.timestamp).toLocaleString()}
                        </div>
                        <div className="text-sm text-zinc-300 line-clamp-2 break-words">
                          {v.text || <span className="italic opacity-50">Empty document</span>}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-500 mt-3 uppercase tracking-widest">
                          {v.wordCount} words
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(v)}
                        className="shrink-0 px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-colors bg-white text-black hover:bg-zinc-200"
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Download Modal */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 md:p-12 w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-3xl font-bold uppercase mb-2">Download</h3>
              <p className="text-zinc-400 mb-8">Select a format to save your evaluation results.</p>

              <div className="flex flex-col gap-3">
                {[
                  { id: 'pdf', label: 'PDF Document (.pdf)' },
                  { id: 'docx', label: 'Word Document (.docx)' },
                  { id: 'md', label: 'Markdown (.md)' },
                  { id: 'txt', label: 'Plain Text (.txt)' },
                  { id: 'json', label: 'JSON Data (.json)' }
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => handleDownload(format.id as any)}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-mono text-sm transition-colors bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white group"
                  >
                    <span>{format.label}</span>
                    <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Concierge Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isConciergeOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-[350px] h-[450px] mb-4 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="font-mono text-sm uppercase tracking-widest font-bold">Live Concierge</span>
                </div>
                <button onClick={() => setIsConciergeOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("max-w-[85%] rounded-xl p-3 text-sm", msg.role === 'user' ? "bg-white text-black self-end" : "bg-zinc-800 text-white self-start")}>
                    {msg.text}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="bg-zinc-800 text-white self-start max-w-[85%] rounded-xl p-3 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
              
              {/* Input */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Ask for tech support..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-white text-black p-2 rounded-lg disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setIsConciergeOpen(!isConciergeOpen)}
          className="bg-zinc-900 border border-zinc-800 text-white p-4 rounded-full shadow-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
        >
          {isConciergeOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}
