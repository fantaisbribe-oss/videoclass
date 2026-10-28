import React, { useState } from 'react';
import {
  X,
  Github,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Terminal,
  Share2,
  Sparkles,
} from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedAppUrl: string;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({
  isOpen,
  onClose,
  sharedAppUrl,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState(false);

  if (!isOpen) return null;

  const gitCommands = `# 1. Add your GitHub repository as origin:
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main

# Once pushed, enable GitHub Pages in your repo:
# Go to Settings -> Pages -> Build and deployment -> Source: "GitHub Actions"
# The automated workflow will publish your site to:
# https://<your-username>.github.io/<your-repo-name>/`;

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedGitCmd(true);
    setTimeout(() => setCopiedGitCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">GitHub Pages & Live Test Link</h3>
              <p className="text-xs text-slate-400">Share across devices and deploy via GitHub Pages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 1. Instant Live Test URL */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Instant Test Link (Active Right Now)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50">
                Live & Multi-Device
              </span>
            </div>
            <p className="text-[11px] text-blue-200">
              Open this URL directly on your phone, tablet, or another computer to test real-time video, chat, whiteboard, and doc collaboration:
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={sharedAppUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono select-all outline-none"
              />
              <button
                onClick={() => copyLink(sharedAppUrl)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shrink-0 shadow-md"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* 2. GitHub Pages Workflow */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>GitHub Pages Automated Deployment (.github/workflows/deploy-pages.yml)</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We have configured your repo with a GitHub Actions workflow that automatically compiles and publishes CipherClass to GitHub Pages on every push.
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5 font-sans">
              <p className="font-semibold text-white">Your GitHub Pages Link will be:</p>
              <div className="p-2 rounded bg-slate-950 text-cyan-400 font-mono text-[11px]">
                https://&lt;your-github-username&gt;.github.io/&lt;your-repo-name&gt;/
              </div>
            </div>
            <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1.5 pl-1 pt-1">
              <li>Create a new repository on GitHub (e.g. <code>cipherclass</code>).</li>
              <li>Push your committed code using the commands below.</li>
              <li>In your GitHub repo, go to <strong>Settings</strong> &rarr; <strong>Pages</strong>.</li>
              <li>Under <strong>Source</strong>, select <strong>GitHub Actions</strong>.</li>
              <li>The site will deploy automatically within 60 seconds!</li>
            </ol>
          </div>

          {/* 3. Git CLI Commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Git Push Commands</span>
              </label>
              <button
                onClick={copyCommands}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedGitCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedGitCmd ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto select-all leading-relaxed">
              {gitCommands}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
          <a
            href="https://github.com/new"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
          >
            <span>Open GitHub New Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
