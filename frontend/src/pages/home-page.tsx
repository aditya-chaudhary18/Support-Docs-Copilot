import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { TraceLogo } from '@/components/ui/trace-logo'

export function HomePage() {
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-brand-surface text-slate-200 selection:bg-emerald-500/20 selection:text-emerald-300 antialiased relative overflow-x-hidden">
      {/* Ambient Glow Orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[130px] pointer-events-none -z-10 rounded-full"></div>
      <div className="fixed top-[600px] right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[150px] pointer-events-none -z-10 rounded-full"></div>

      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-brand-border/80 bg-brand-surface/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo & Wordmark */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <TraceLogo className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-bold tracking-wider text-white text-lg">TRACE</span>
          </Link>

          {/* Center Links: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 text-xs tracking-wide text-slate-400 font-medium">
            <a className="hover:text-emerald-400 transition-colors" href="#about">About</a>
            <a className="hover:text-emerald-400 transition-colors" href="#how-it-works">How it Works</a>
            <a className="hover:text-emerald-400 transition-colors" href="#architecture">Architecture</a>
            <a className="hover:text-emerald-400 transition-colors" href="#citations">Citations</a>
            <a className="hover:text-emerald-400 transition-colors" href="#security">Security</a>
            <a className="hover:text-emerald-400 transition-colors" href="#faq">FAQ</a>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-brand-surface px-4 py-2 rounded-md font-mono-code flex items-center gap-1.5 shadow-emerald-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Console</span>
                <span>→</span>
              </Link>
            ) : (
              <>
                <Link
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
                  to="/login"
                >
                  Log in
                </Link>
                <Link
                  className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-brand-surface px-4 py-2 rounded-md font-mono-code flex items-center gap-1.5 shadow-emerald-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
                  to="/register"
                >
                  <span>Get Started</span>
                  <span>→</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-grid-pattern border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/20 text-emerald-400 text-xs font-mono-code mb-8 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>AI-POWERED DOCUMENTATION INTELLIGENCE • ZERO HALLUCINATION ARCHITECTURE</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
            Your documentation.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Finally queryable.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Trace turns technical documentation into a searchable knowledge base and provides grounded answers with verifiable citations.
          </p>

          {/* Dual Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to={user ? "/dashboard" : "/register"}
              className="w-full sm:w-auto px-7 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-brand-surface font-semibold text-sm font-mono-code tracking-wide shadow-emerald-glow transition-all flex items-center justify-center gap-2"
            >
              <span>{user ? "Open Console" : "Start using Trace"}</span>
              <span className="font-bold">→</span>
            </Link>
            <a
              href="#architecture"
              className="w-full sm:w-auto px-7 py-3 rounded-lg border border-brand-borderLight hover:border-slate-400 bg-brand-panel text-slate-300 hover:text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Architecture</span>
              <span className="text-slate-400">↓</span>
            </a>
          </div>

          {/* Footnote */}
          <p className="text-xs font-mono-code text-slate-400 tracking-wide">
            Upload your documentation. Ask questions. Trace the answer.
          </p>
        </div>

        {/* Interactive Hero Product Demo Window Frame */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="glass-card rounded-xl border border-brand-borderLight/80 shadow-terminal-glow overflow-hidden">
            {/* Window Header */}
            <div className="bg-[#090F16] px-4 py-3 border-b border-brand-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-2 font-mono-code text-slate-400">
                  <span className="text-slate-300 font-semibold">TRACE</span>
                  <span>/</span>
                  <span>Sessions</span>
                  <span>/</span>
                  <span className="text-slate-200">Architecture & R2 Spec</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono-code text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Grounded Mode: Strict</span>
                </div>
                <span className="text-[11px] font-mono-code text-slate-400">Scope: All 14 Indexed Docs</span>
              </div>
            </div>

            {/* Window Body Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 bg-brand-surface">
              {/* Left Chat Flow Column (8 Cols) */}
              <div className="lg:col-span-8 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-brand-border space-y-6">
                {/* User Prompt */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-brand-panel border border-brand-border text-emerald-400 text-xs font-mono-code flex items-center justify-center font-bold">
                    ER
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-300">Dr. Elena Rostova</span>
                      <span className="text-[10px] font-mono-code text-slate-400">10:42 AM</span>
                      <span className="text-[10px] font-mono-code text-slate-400 ml-auto bg-brand-panel px-2 py-0.5 rounded border border-brand-border">Client Req #9182</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">
                      How does the document upload and chunking pipeline handle PDF page boundaries and vector storage in Neon pgvector?
                    </p>
                  </div>
                </div>

                {/* Real-time Telemetry Strip */}
                <div className="rounded-lg bg-brand-card border border-brand-border p-3 text-xs font-mono-code">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-brand-border pb-1.5">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      RETRIEVER & GROUNDING TELEMETRY
                    </span>
                    <span className="text-slate-400">Latency: 110ms total</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-brand-panel p-2 rounded border border-brand-border/60">
                      <div className="text-slate-400">1. Gemini Embed</div>
                      <div className="text-emerald-400 font-semibold">768-dim vector (42ms)</div>
                    </div>
                    <div className="bg-brand-panel p-2 rounded border border-brand-border/60">
                      <div className="text-slate-400">2. HNSW Search</div>
                      <div className="text-emerald-400 font-semibold">5 chunks in 68ms</div>
                    </div>
                    <div className="bg-brand-panel p-2 rounded border border-brand-border/60">
                      <div className="text-slate-400">3. Grounding Audit</div>
                      <div className="text-emerald-400 font-semibold">Sufficiency: 98.4%</div>
                    </div>
                  </div>
                </div>

                {/* TRACE Synthesis Response */}
                <div className="rounded-lg bg-brand-panel border border-brand-border p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-xs font-semibold text-emerald-400">TRACE Synthesis</span>
                      <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-brand-card text-slate-400 border border-brand-border">Strict Grounded</span>
                    </div>
                    <span className="text-[11px] font-mono-code text-slate-400">Model: gemini-flash-latest</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 font-normal">
                    <h4 className="text-white font-semibold text-sm">Pipeline Architecture & Chunking Strategy</h4>
                    <p>
                      The ingestion worker isolates each uploaded document inside private tenant storage prior to parsing. To maintain semantic boundaries across page breaks, the tokenization routine applies a sliding window with overlap while preserving hard structural boundaries <span className="inline-block px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-mono-code text-xs border border-cyan-500/40 font-semibold cursor-pointer hover:border-cyan-400">[S1]</span>. Page metadata is enriched directly into every fragment payload rather than discarded post-extraction.
                    </p>
                    <p>
                      When processing PDF page markers, the parser embeds zero-width attribution tokens that link each chunk to its source bounding box <span className="inline-block px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-mono-code text-xs border border-cyan-500/40 font-semibold cursor-pointer hover:border-cyan-400">[S1]</span>. These fragments are indexed in Neon PostgreSQL using native <code className="text-emerald-400 font-mono-code bg-brand-card px-1 py-0.5 rounded text-xs">pgvector</code> with an approximate nearest neighbor HNSW cosine distance graph <span className="inline-block px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-mono-code text-xs border border-cyan-500/40 font-semibold cursor-pointer hover:border-cyan-400">[S2]</span>:
                    </p>

                    <div className="bg-[#090F16] rounded-md border border-brand-border p-3 text-xs font-mono-code text-slate-300 overflow-x-auto">
                      <div className="text-slate-400 text-[10px] pb-1 border-b border-brand-border/60 mb-2 flex justify-between">
                        <span>neon_pgvector_migration.sql</span>
                        <span className="text-slate-400">SQL DDL</span>
                      </div>
                      <pre className="leading-5">
                        <span className="text-emerald-400">CREATE EXTENSION IF NOT EXISTS</span> vector;{'\n\n'}
                        <span className="text-emerald-400">CREATE TABLE</span> document_chunks ({'\n'}
                        {'  '}id UUID <span className="text-cyan-400">PRIMARY KEY</span> DEFAULT gen_random_uuid(),{'\n'}
                        {'  '}document_id UUID <span className="text-cyan-400">REFERENCES</span> documents(id) <span className="text-rose-400">ON DELETE CASCADE</span>,{'\n'}
                        {'  '}embedding <span className="text-teal-300">vector(768) NOT NULL</span>{'\n'}
                        );{'\n\n'}
                        <span className="text-emerald-400">CREATE INDEX</span> ON document_chunks {'\n'}
                        <span className="text-emerald-400">USING</span> hnsw (embedding vector_cosine_ops);
                      </pre>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300">
                      <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                      <span><strong>Verified Grounded Response:</strong> Structured schema validation completed. Zero ungrounded or hallucinated claims detected.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Grounded Sources Column (4 Cols) */}
              <div className="lg:col-span-4 p-5 bg-brand-card flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-cyan-400 text-[18px]">inventory_2</span>
                      <span className="text-xs font-semibold text-white">Retrieved Grounded Sources</span>
                      <span className="text-[10px] font-mono-code px-1.5 py-0.2 bg-cyan-950 text-cyan-400 rounded-full border border-cyan-500/30">5</span>
                    </div>
                    <span className="text-[11px] font-mono-code text-emerald-400 font-semibold">96% Grounded</span>
                  </div>

                  {/* Source Card S1 */}
                  <div className="mt-4 p-3 rounded-lg bg-brand-panel border border-brand-borderLight hover:border-cyan-500/60 transition-all space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono-code">
                        <span className="text-xs font-bold text-cyan-400">[S1]</span>
                        <span className="text-slate-200 font-medium truncate max-w-[140px]">architecture_spec_v2.pdf</span>
                      </div>
                      <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">91% match</span>
                    </div>
                    <div className="text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                      <span>Page 14 • Section 3.2: Chunking</span>
                      <span>Cosine: 0.182</span>
                    </div>
                    <p className="text-xs text-slate-400 bg-brand-surface p-2 rounded border border-brand-border/40 font-mono-code leading-relaxed">
                      "Documents are processed with <span className="text-emerald-400">CHUNK_SIZE=1200</span> and <span className="text-emerald-400">CHUNK_OVERLAP=200</span> tokens. PDF page markers are injected as metadata..."
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono-code pt-1 text-slate-400">
                      <span className="hover:text-cyan-400 cursor-pointer flex items-center gap-1">View Full Chunk ↗</span>
                      <span className="text-slate-400">R2 Object #a92f</span>
                    </div>
                  </div>

                  {/* Source Card S2 */}
                  <div className="mt-3 p-3 rounded-lg bg-brand-panel border border-brand-borderLight hover:border-cyan-500/60 transition-all space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono-code">
                        <span className="text-xs font-bold text-cyan-400">[S2]</span>
                        <span className="text-slate-200 font-medium truncate max-w-[140px]">neon_pgvector_migration.sql</span>
                      </div>
                      <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">87% match</span>
                    </div>
                    <div className="text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                      <span>Lines 45-72 • HNSW Schema</span>
                      <span>Cosine: 0.224</span>
                    </div>
                    <p className="text-xs text-slate-400 bg-brand-surface p-2 rounded border border-brand-border/40 font-mono-code leading-relaxed">
                      "<span className="text-cyan-300">document_chunks table definition</span> with pgvector vector(768) and HNSW cosine index (m=16, ef_construction=64)..."
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono-code pt-1 text-slate-400">
                      <span className="hover:text-cyan-400 cursor-pointer flex items-center gap-1">Inspect Chunk ↗</span>
                      <span className="text-slate-400">R2 Object #e309</span>
                    </div>
                  </div>
                </div>

                {/* Grounding Guarantee Footer */}
                <div className="p-2.5 rounded bg-brand-surface border border-brand-border text-center">
                  <span className="text-[11px] font-mono-code text-slate-400">
                    All 5 citations verified against Neon RAG cluster
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capability Strip */}
      <section className="py-7 border-b border-brand-border bg-brand-surface/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono-code text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">•</span>
              <span className="text-slate-300 font-medium">RAG-Powered Architecture</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-base">•</span>
              <span className="text-slate-300 font-medium">Semantic Retrieval (Cosine &lt;=&gt; 0.40)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-teal-400 text-base">•</span>
              <span className="text-slate-300 font-medium">100% Grounded Answers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">•</span>
              <span className="text-slate-300 font-medium">Verifiable Line & Page Citations</span>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-brand-border">
              <span className="text-slate-400">Formats:</span>
              <span className="px-2 py-0.5 rounded bg-brand-card border border-brand-border text-slate-300">PDF</span>
              <span className="px-2 py-0.5 rounded bg-brand-card border border-brand-border text-slate-300">DOCX</span>
              <span className="px-2 py-0.5 rounded bg-brand-card border border-brand-border text-slate-300">TXT</span>
              <span className="px-2 py-0.5 rounded bg-brand-card border border-brand-border text-slate-300">Markdown</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section className="py-24 border-b border-brand-border bg-grid-pattern relative" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono-code font-semibold uppercase tracking-widest text-emerald-400">
              The Documentation Dilemma
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">
              Your documentation already has the answers.<br />
              <span className="text-slate-400">Finding them is the hard part.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Modern engineering stacks generate gigabytes of architectural designs, compliance audits, and schemas. Conventional tools leave your team guessing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card glass-card-hover rounded-xl p-6 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-brand-panel border border-brand-border flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[20px]">folder_off</span>
              </div>
              <h3 className="text-base font-semibold text-white">Scattered Information</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                API schemas, cloud runbooks, and audit specs live across isolated silos. Engineers waste hours manually skimming multi-page PDFs to find a single parameter.
              </p>
              <div className="pt-2 text-[11px] font-mono-code text-emerald-400 flex items-center gap-1.5 border-t border-brand-border">
                <span>✓ Unified RAG indexing</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover rounded-xl p-6 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-brand-panel border border-brand-border flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[20px]">search_off</span>
              </div>
              <h3 className="text-base font-semibold text-white">Keyword Search is Blind</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Standard text search requires matching exact phrasing. It misses synonyms, conceptual relationships, and cross-document architectural contexts entirely.
              </p>
              <div className="pt-2 text-[11px] font-mono-code text-cyan-400 flex items-center gap-1.5 border-t border-brand-border">
                <span>✓ 768-dim semantic vectors</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover rounded-xl p-6 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-brand-panel border border-brand-border flex items-center justify-center text-teal-400">
                <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
              </div>
              <h3 className="text-base font-semibold text-white">Generic AI Hallucinates</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Public LLMs confidently fabricate configurations and methods that don't exist in your production environment, inducing severe deployment hazards.
              </p>
              <div className="pt-2 text-[11px] font-mono-code text-teal-400 flex items-center gap-1.5 border-t border-brand-border">
                <span>✓ Zero-guess fallback guarantee</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover rounded-xl p-6 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-brand-panel border border-brand-border flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[20px]">fact_check</span>
              </div>
              <h3 className="text-base font-semibold text-white">Verification is Mandatory</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Engineers cannot trust black-box answers. Production systems require direct provenance: knowing the exact page, chunk token boundary, and source hash.
              </p>
              <div className="pt-2 text-[11px] font-mono-code text-emerald-400 flex items-center gap-1.5 border-t border-brand-border">
                <span>✓ Interactive [S1] line citations</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6-Stage Pipeline Section */}
      <section className="py-24 border-b border-brand-border bg-brand-surface relative overflow-hidden" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="text-xs font-mono-code font-semibold uppercase tracking-widest text-emerald-400">
                Processing Lifecycle
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
                The 6-Stage Precision RAG Pipeline
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-mono-code max-w-md">
              Deterministic ingestion parameters ensure high fidelity chunk preservation and sub-100ms vector lookups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative">
            <div className="glass-card rounded-xl p-4 border border-brand-border flex flex-col justify-between space-y-3 relative group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-code font-bold text-emerald-400">01</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">STORAGE</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Upload & Vault</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Direct streaming to Cloudflare R2 isolated private buckets with SHA256 checksum tags.
                </p>
              </div>
              <div className="text-[10px] font-mono-code text-emerald-400/90 pt-2 border-t border-brand-border">
                r2://trace-vault/
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 border border-brand-border flex flex-col justify-between space-y-3 relative group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-code font-bold text-emerald-400">02</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">PARSING</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Extract & Structure</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  PyMuPDF page-boundary extraction preserves header hierarchies, markdown tables, and code snippets.
                </p>
              </div>
              <div className="text-[10px] font-mono-code text-emerald-400/90 pt-2 border-t border-brand-border">
                Zero-width markers
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 border border-brand-border flex flex-col justify-between space-y-3 relative group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-code font-bold text-cyan-400">03</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">CHUNKING</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Sliding Window</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  1,200 token windows with a 200 token overlap guarantee continuous context across segment splits.
                </p>
              </div>
              <div className="text-[10px] font-mono-code text-cyan-400/90 pt-2 border-t border-brand-border">
                1200 / 200 overlap
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 border border-brand-border flex flex-col justify-between space-y-3 relative group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-code font-bold text-cyan-400">04</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">EMBEDDING</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Dense Vectors</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Google Gemini embedding models convert normalized tokens into dense 768-dimensional float32 arrays.
                </p>
              </div>
              <div className="text-[10px] font-mono-code text-cyan-400/90 pt-2 border-t border-brand-border">
                gemini-768d float32
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 border border-brand-border flex flex-col justify-between space-y-3 relative group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-code font-bold text-teal-400">05</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">INDEX</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Neon HNSW Index</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  pgvector Hierarchical Navigable Small World graphs query cosine similarity (&lt;=&gt;) in &lt; 70ms.
                </p>
              </div>
              <div className="text-[10px] font-mono-code text-teal-400/90 pt-2 border-t border-brand-border">
                HNSW ef=64, m=16
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 border border-brand-border flex flex-col justify-between space-y-3 relative group bg-gradient-to-b from-brand-panel to-emerald-950/20">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-code font-bold text-emerald-300">06</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/40 text-emerald-300">SYNTHESIS</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Answer & Cite</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                  Gemini Flash generates grounded synthesis with strict inline [S1][S2] attribution tags.
                </p>
              </div>
              <div className="text-[10px] font-mono-code text-emerald-400 pt-2 border-t border-brand-border font-semibold">
                Strict Source Provenance
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Deep Dive Section */}
      <section className="py-24 border-b border-brand-border bg-grid-pattern relative" id="architecture">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono-code font-semibold uppercase tracking-widest text-emerald-400">
              Engine Internals
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">
              Engineered for Deterministic Retrieval
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              How user natural-language questions traverse query vectorization, approximate nearest neighbor search, and schema validation.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-10 border border-brand-borderLight shadow-2xl relative">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
              <div className="p-5 rounded-xl bg-brand-surface border border-brand-border text-center space-y-2 hover:border-emerald-500 transition-colors">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">ENTRYPOINT</span>
                <div className="text-white font-semibold text-sm">Natural Query</div>
                <p className="text-xs text-slate-400 font-mono-code">"What are the R2 replication parameters?"</p>
                <div className="text-[10px] font-mono-code text-emerald-400">FastAPI Middleware</div>
              </div>

              <div className="hidden lg:flex flex-col items-center justify-center text-slate-400">
                <span className="text-[10px] font-mono-code text-emerald-400">gRPC</span>
                <div className="w-full h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 my-1"></div>
                <span className="text-xs">→</span>
              </div>

              <div className="p-5 rounded-xl bg-brand-surface border border-brand-border text-center space-y-2 hover:border-cyan-500 transition-colors">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-brand-panel border border-brand-border text-slate-400">EMBEDDING</span>
                <div className="text-white font-semibold text-sm">Query Vectorizer</div>
                <p className="text-xs text-slate-400 font-mono-code">gemini-embedding-001</p>
                <div className="text-[10px] font-mono-code text-cyan-400">Dim: 768 Float32</div>
              </div>

              <div className="hidden lg:flex flex-col items-center justify-center text-slate-400">
                <span className="text-[10px] font-mono-code text-cyan-400">ANN Query</span>
                <div className="w-full h-0.5 bg-gradient-to-r from-cyan-500 to-teal-400 my-1"></div>
                <span className="text-xs">→</span>
              </div>

              <div className="p-5 rounded-xl bg-brand-surface border border-emerald-500/50 shadow-emerald-glow text-center space-y-2">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">CORE DATABASE</span>
                <div className="text-white font-semibold text-sm">Neon pgvector</div>
                <p className="text-xs text-slate-400 font-mono-code">HNSW Cosine (&lt;=&gt;)</p>
                <div className="text-[10px] font-mono-code text-emerald-400">Threshold: 0.40 Cosine</div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-brand-border grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-xs font-semibold text-white">1. Context Injection Payload</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-mono-code">
                  Filtered chunks assembled with doc_id, bounding boxes, and R2 presigned cold pointers.
                </p>
              </div>
              <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-semibold text-white">2. Grounding Verification Layer</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-mono-code">
                  Hallucination auditor cross-verifies tokens against raw documents before client dispatch.
                </p>
              </div>
              <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span className="text-xs font-semibold text-white">3. Zero-Egress Storage Guarantee</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-mono-code">
                  Documents never leave Cloudflare R2 and memory-safe isolated Python workers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Multi-tenant Isolation */}
      <section className="py-24 border-b border-brand-border bg-brand-surface relative" id="security">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono-code font-semibold uppercase tracking-widest text-emerald-400">
              Enterprise Trust
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">
              Isolated Multi-Tenant Security by Default
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Your architectural intellectual property and proprietary source specifications remain strictly encrypted, segregated, and unshared.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-xl p-6 border border-brand-border space-y-3">
              <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                01
              </div>
              <h4 className="text-base font-semibold text-white">Authenticated Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Role-based API tokens and session controls prevent unauthenticated callers from triggering vector query procedures.
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-brand-border space-y-3">
              <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <h4 className="text-base font-semibold text-white">User-Scoped Isolation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every vector chunk is hard-keyed with <code className="text-cyan-300 font-mono-code">user_id</code> and <code className="text-cyan-300 font-mono-code">tenant_id</code> constraints in PostgreSQL. Cross-tenant leakage is mathematically impossible.
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-brand-border space-y-3">
              <div className="w-8 h-8 rounded bg-teal-950/60 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <h4 className="text-base font-semibold text-white">Zero Public Buckets</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Raw documentation stays locked in private Cloudflare R2 storage vaults accessed solely via short-lived presigned cryptotokens.
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-brand-border space-y-3">
              <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                04
              </div>
              <h4 className="text-base font-semibold text-white">No Model Training</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Neither our foundational vectorizers nor synthesis models ever retain, cache, or use your uploaded documents for secondary model retraining.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 border-b border-brand-border bg-grid-pattern relative" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-mono-code font-semibold uppercase tracking-widest text-emerald-400">
              Knowledge Base
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-sm">
              Technical specifications regarding TRACE's retrieval architecture, chunking, and guarantees.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is TRACE and how does Retrieval-Augmented Generation (RAG) work?",
                a: "TRACE is an AI documentation assistant that converts raw technical specs, markdown files, and schemas into vector embeddings. When you ask a question, TRACE converts your inquiry into the same vector space, pulls the top semantically relevant chunks from Neon pgvector, and passes them to a frontier LLM to synthesize a grounded answer."
              },
              {
                q: "Which document formats can I upload?",
                a: "TRACE supports PDF, DOCX, TXT, and Markdown (.md) files. The parser extracts page-boundary metadata and preserves AST markdown structures including tables and code blocks."
              },
              {
                q: "How does TRACE eliminate hallucinations?",
                a: "Unlike conversational chatbots, TRACE enforces a strict grounding mode. The system requires every synthesized claim to match an exact chunk reference. If the cosine similarity of retrieved fragments falls below the safe sufficiency threshold, the engine explicitly reports lack of evidence rather than fabricating answers."
              },
              {
                q: "Can I customize the chunk window and overlap parameters?",
                a: "Yes. The Ingestion Parameter Matrix allows full tuning of chunk size and overlap ratios, letting you adapt retrieval performance to dense code repositories or high-level audit reports."
              },
              {
                q: "Are documents shared or used for foundational model training?",
                a: "Never. TRACE utilizes tenant-isolated PostgreSQL schemas and private Cloudflare R2 storage. Your proprietary engineering documents are never exposed, cached, or utilized for foundational model retraining."
              }
            ].map((item, idx) => (
              <div key={idx} className="glass-card rounded-xl border border-brand-border p-5 space-y-2">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left text-sm sm:text-base font-semibold text-white flex items-center justify-between cursor-pointer focus:outline-none"
                >
                  <span>{item.q}</span>
                  <span className="text-emerald-400 text-sm font-mono-code ml-2">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-2 border-t border-brand-border/60">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden bg-brand-surface border-b border-brand-border">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] pointer-events-none -z-10"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-brand-card border border-brand-borderLight p-2 mx-auto shadow-emerald-glow flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[28px]">terminal</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Turn your documentation into something <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              you can talk to.
            </span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Grounded answers. Traceable sources. Zero speculation. Index your first technical architecture specification in less than two minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to={user ? "/dashboard" : "/register"}
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-brand-surface font-semibold text-sm font-mono-code tracking-wide shadow-emerald-glow transition-all flex items-center justify-center gap-2"
            >
              <span>{user ? "Open Console" : "Get Started Free"}</span>
              <span>→</span>
            </Link>
            {!user && (
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-brand-panel hover:bg-brand-card border border-brand-border text-slate-300 hover:text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In to Console</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-brand-surface text-xs font-mono-code text-slate-400 border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200">TRACE</span>
            <span className="text-slate-600">|</span>
            <span>Grounded Technical Documentation Assistant</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <span>Neon pgvector</span>
            <span>•</span>
            <span>Cloudflare R2</span>
            <span>•</span>
            <span>Google Gemini</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
