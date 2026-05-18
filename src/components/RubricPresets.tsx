import { useState } from 'react';
import { ClipboardCheck, FileText, Shield, Users, ChevronDown, ChevronUp, Sparkles, BookOpen } from 'lucide-react';

export interface RubricPreset {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  aiTier: 'AI-Enhanced' | 'AI-Assisted' | 'AI-Free';
  content: string;
}

export const RUBRIC_PRESETS: RubricPreset[] = [
  {
    id: 'essay-enhanced',
    title: 'Essay Assignment — AI-Enhanced Tier',
    description: 'AI permitted for grammar, outline org, citation formatting. AI NOT permitted for generating thesis, body paragraphs, or conclusions.',
    icon: <FileText size={18} />,
    aiTier: 'AI-Enhanced',
    content: `ESSAY PROMPT:
Write a 1,000-1,500 word analytical essay on [TOPIC] for [COURSE NAME].

AI-USE TIER: AI-ENHANCED
AI PERMITTED FOR: grammar checking, outline organization, citation formatting
AI NOT PERMITTED FOR: generating thesis statements, body paragraphs, or conclusions

SUBMISSION REQUIREMENTS:
- Original thesis statement (human-generated, required)
- 3-5 credible sources with proper [CITATION STYLE] citations
- Process documentation: outline + rough draft + revision notes
- Self-assessment checklist included

RUBRIC:

1. THESIS & ARGUMENT (Human-Generated Required) — 25 points
   • Exemplary (23-25): Clear, original thesis with sophisticated argumentation that anticipates counter-claims
   • Proficient (20-22): Clear thesis with well-developed supporting points
   • Developing (17-19): Thesis is present but argument lacks development or clarity
   • Beginning (0-16): Thesis is unclear, missing, or purely descriptive

2. EVIDENCE & ANALYSIS — 25 points
   • Exemplary (23-25): Relevant evidence from credible sources; insightful analysis connects evidence to thesis
   • Proficient (20-22): Adequate evidence with clear explanatory analysis
   • Developing (17-19): Limited evidence or superficial analysis
   • Beginning (0-16): Minimal or irrelevant evidence; no analysis

3. ORGANIZATION (AI-Assisted Permitted) — 20 points
   • Exemplary (18-20): Logical flow with effective transitions; paragraphs unified and coherent
   • Proficient (15-17): Clear organization with adequate transitions
   • Developing (12-14): Some organizational issues; flow is occasionally disrupted
   • Beginning (0-11): Little discernible organization; difficult to follow

4. MECHANICS & STYLE (AI-Assisted Permitted) — 15 points
   • Exemplary (14-15): Near-flawless grammar, punctuation, and academic tone
   • Proficient (11-13): Minor mechanical errors that do not impede comprehension
   • Developing (8-10): Frequent mechanical errors that occasionally impede reading
   • Beginning (0-7): Numerous errors that significantly impede comprehension

5. CITATION INTEGRITY — 15 points
   • Exemplary (14-15): Perfect adherence to [CITATION STYLE]; all sources verifiable and relevant
   • Proficient (11-13): Minor citation formatting errors; all sources appropriate
   • Developing (8-10): Significant citation errors or questionable source quality
   • Beginning (0-7): Missing citations, plagiarism, or fabricated sources

TOTAL: 100 points`,
  },
  {
    id: 'problem-assisted',
    title: 'Problem-Solving — AI-Assisted Tier',
    description: 'AI permitted for research, formula verification, calculations. REQUIRED: Process documentation showing student reasoning at each step.',
    icon: <ClipboardCheck size={18} />,
    aiTier: 'AI-Assisted',
    content: `PROBLEM-SOLVING ASSIGNMENT:
Solve [NUMBER] problems from [CHAPTER/UNIT] in [COURSE NAME].

AI-USE TIER: AI-ASSISTED
AI PERMITTED FOR: research, formula verification, checking calculations
REQUIRED: Process documentation showing student reasoning at each step

SUBMISSION REQUIREMENTS:
- Complete solutions with all work shown (human-generated reasoning required)
- Step-by-step process documentation for each problem
- Final answers verified (AI verification permitted for answer checking)
- Reflection statement on problem-solving approach

RUBRIC:

1. PROBLEM UNDERSTANDING — 20 points
   • Exemplary (18-20): Accurately identifies all variables, constraints, and objectives
   • Proficient (15-17): Correctly identifies key components of the problem
   • Developing (12-14): Partial understanding; misses some key elements
   • Beginning (0-11): Misunderstands the problem or omits critical components

2. PROCESS DOCUMENTATION (Human-Generated Required) — 25 points
   • Exemplary (23-25): Clear, detailed reasoning at every step; "show your work" is exemplary
   • Proficient (20-22): Adequate documentation; reasoning is generally clear
   • Developing (17-19): Minimal documentation; gaps in reasoning
   • Beginning (0-16): Little or no process shown; answer-only submission

3. METHOD SELECTION — 20 points
   • Exemplary (18-20): Chooses optimal method with clear justification; considers alternatives
   • Proficient (15-17): Appropriate method selected and applied correctly
   • Developing (12-14): Method has minor flaws or is partially inappropriate
   • Beginning (0-11): Inappropriate method or major errors in application

4. SOLUTION ACCURACY (AI-Verification Enabled) — 20 points
   • Exemplary (18-20): Correct solution with no computational errors; units and precision appropriate
   • Proficient (15-17): Correct approach with minor computational errors
   • Developing (12-14): Significant errors but partial credit warranted
   • Beginning (0-11): Incorrect solution with fundamental misunderstandings

5. REFLECTION & VERIFICATION — 15 points
   • Exemplary (14-15): Solution verified by alternative method; reflection on reasonableness included
   • Proficient (11-13): Basic verification step included
   • Developing (8-10): Weak or absent verification
   • Beginning (0-7): No verification; unable to assess reasonableness

TOTAL: 100 points`,
  },
  {
    id: 'presentation-free',
    title: 'Oral Presentation — AI-Free Tier',
    description: 'AI use is NOT permitted. Student must demonstrate independent knowledge, spontaneous thinking, and authentic communication skills.',
    icon: <Users size={18} />,
    aiTier: 'AI-Free',
    content: `ORAL PRESENTATION:
Present a [DURATION]-minute presentation on [TOPIC] for [COURSE NAME].

AI-USE TIER: AI-FREE
AI USE IS NOT PERMITTED.
Student must demonstrate independent knowledge, spontaneous thinking, and authentic communication skills.

SUBMISSION REQUIREMENTS:
- Live presentation with Q&A (no pre-recorded content)
- Visual aids (if used) must be original and properly cited
- Speaking notes allowed (but reading extensively will be penalized)
- Audience engagement expected

RUBRIC:

1. CONTENT KNOWLEDGE — 30 points
   • Exemplary (27-30): Deep command of subject; responds to questions with nuance and evidence
   • Proficient (23-26): Solid understanding; answers questions accurately
   • Developing (18-22): Basic knowledge; struggles with follow-up questions
   • Beginning (0-17): Superficial or incorrect understanding

2. ORGANIZATION & CLARITY — 25 points
   • Exemplary (23-25): Clear structure; main points previewed, developed, and summarized masterfully
   • Proficient (19-22): Logical organization; main points are clear
   • Developing (15-18): Organization is present but confusing at times
   • Beginning (0-14): Disorganized; difficult to follow

3. DELIVERY & ENGAGEMENT — 25 points
   • Exemplary (23-25): Confident, dynamic delivery; strong eye contact; audience engaged throughout
   • Proficient (19-22): Competent delivery; generally maintains audience attention
   • Developing (15-18): Delivery inhibits communication; limited engagement
   • Beginning (0-14): Poor delivery; reads extensively; no audience rapport

4. VISUAL AIDS (if used) — 20 points
   • Exemplary (18-20): Visuals enhance understanding; professional design; cited sources
   • Proficient (15-17): Visuals support content; adequate design
   • Developing (12-14): Visuals are distracting or minimally helpful
   • Beginning (0-11): Visuals are absent, inappropriate, or plagiarized

TOTAL: 100 points`,
  },
  {
    id: 'discussion-weekly',
    title: 'Weekly Discussion — AI-Assisted Tier',
    description: 'AI may be used for brainstorming and research. All written responses must be original. Peer responses required.',
    icon: <BookOpen size={18} />,
    aiTier: 'AI-Assisted',
    content: `WEEKLY DISCUSSION:
Participate in the Week [NUMBER] online discussion for [COURSE NAME].

AI-USE TIER: AI-ASSISTED
AI PERMITTED FOR: brainstorming ideas, finding relevant sources, checking grammar
AI NOT PERMITTED FOR: writing discussion posts or peer responses

SUBMISSION REQUIREMENTS:
- Initial post: [WORD COUNT] words minimum, due [DAY]
- Peer responses: 2 substantive responses to classmates, [WORD COUNT] words each, due [DAY]
- At least one citation of course materials required
- Connection to real-world application encouraged

RUBRIC:

1. INITIAL POST QUALITY — 40 points
   • Exemplary (36-40): Deep engagement with prompt; original insights; strong evidence from course materials
   • Proficient (30-35): Solid engagement; clear understanding of concepts
   • Developing (24-29): Basic response; limited depth or evidence
   • Beginning (0-23): Superficial or off-topic response

2. PEER RESPONSES (2 required) — 30 points (15 each)
   • Exemplary (14-15 each): Extends conversation; asks probing questions; provides constructive feedback
   • Proficient (11-13 each): Engages meaningfully with peer's ideas
   • Developing (8-10 each): Minimal engagement; "I agree" responses
   • Beginning (0-7 each): Missing or non-substantive responses

3. CITATION & EVIDENCE — 15 points
   • Exemplary (14-15): Relevant course citations; connects to external sources when appropriate
   • Proficient (11-13): Adequate citations from course materials
   • Developing (8-10): Weak or missing citations
   • Beginning (0-7): No citations or fabricated sources

4. PROFESSIONALISM & TIMELINESS — 15 points
   • Exemplary (14-15): Professional tone; all posts submitted on time
   • Proficient (11-13): Generally professional; minor timeliness issues
   • Developing (8-10): Informal tone or late submissions
   • Beginning (0-7): Unprofessional or significantly late

TOTAL: 100 points`,
  },
];

interface RubricPresetsProps {
  onSelectPreset: (preset: RubricPreset) => void;
  isVisible: boolean;
  onClose: () => void;
}

export default function RubricPresets({ onSelectPreset, isVisible, onClose }: RubricPresetsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isVisible) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'AI-Free': return 'bg-[#c0392b]/15 text-[#c0392b] border-[#c0392b]/30';
      case 'AI-Enhanced': return 'bg-[#c6a679]/15 text-[#8b7347] border-[#c6a679]/30';
      case 'AI-Assisted': return 'bg-[#2d3e50]/10 text-[#2d3e50] border-[#2d3e50]/20';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#2d3e50]/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#faf8f5] rounded-xl border border-[#e8e2d8] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#e8e2d8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2d3e50] rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-[#c6a679]" />
            </div>
            <div>
              <h2 
                className="text-lg font-bold text-[#2d3e50]"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                OC Rubric Templates
              </h2>
              <p className="text-xs text-[#8b7347]">From the AI-Augmented Instructional Integrity Framework</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#999] hover:text-[#2d3e50] transition-colors text-sm"
          >
            Close
          </button>
        </div>

        {/* Legend */}
        <div className="px-6 pt-4 flex gap-3 flex-wrap">
          <span className="text-[10px] text-[#999] uppercase tracking-wider">AI-Use Tiers:</span>
          {[
            { label: 'AI-Free', color: 'bg-[#c0392b]/15 text-[#c0392b]' },
            { label: 'AI-Enhanced', color: 'bg-[#c6a679]/15 text-[#8b7347]' },
            { label: 'AI-Assisted', color: 'bg-[#2d3e50]/10 text-[#2d3e50]' },
          ].map(tier => (
            <span key={tier.label} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${tier.color}`}>
              {tier.label}
            </span>
          ))}
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {RUBRIC_PRESETS.map(preset => (
            <div 
              key={preset.id}
              className="border border-[#e8e2d8] rounded-lg bg-white overflow-hidden transition-all hover:border-[#c6a679]"
            >
              <button
                onClick={() => setExpandedId(expandedId === preset.id ? null : preset.id)}
                className="w-full p-4 flex items-center gap-4 text-left"
              >
                <div className="w-9 h-9 bg-[#c6a679]/15 rounded-lg flex items-center justify-center text-[#c6a679] flex-shrink-0">
                  {preset.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-[#2d3e50] text-sm">{preset.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getTierColor(preset.aiTier)}`}>
                      {preset.aiTier}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] truncate">{preset.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {expandedId === preset.id ? <ChevronUp size={16} className="text-[#999]" /> : <ChevronDown size={16} className="text-[#999]" />}
                </div>
              </button>
              
              {expandedId === preset.id && (
                <div className="px-4 pb-4">
                  <div className="bg-[#faf8f5] border border-[#e8e2d8] rounded-lg p-4 mb-3">
                    <p className="text-xs text-[#8b7347] uppercase tracking-wider mb-2 font-semibold">Rubric Preview</p>
                    <pre className="text-xs text-[#444] whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                      {preset.content}
                    </pre>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => onSelectPreset(preset)}
                      className="bg-[#2d3e50] hover:bg-[#3d5060] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      Use This Rubric
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e8e2d8] bg-[#faf8f5] rounded-b-xl">
          <p className="text-xs text-[#999] text-center">
            Select a rubric to evaluate it for cognitive safety, or use it directly in your course.
          </p>
        </div>
      </div>
    </div>
  );
}
